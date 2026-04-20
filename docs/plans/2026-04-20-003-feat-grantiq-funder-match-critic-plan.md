---
title: "feat: Funder Match Critic — kill false-positive grant matches before they reach users"
type: feat
status: active
date: 2026-04-20
origin: docs/GrantIQ_Custom_Agents_Roadmap (Google Doc 1n7BOX83rt9_dDHZqqfUsoqDWhZA4EnvccAQEMzjZX-c) — agent #2
related: docs/plans/2026-04-20-001-feat-grantiq-cost-watchdog-plan.md (observability), docs/plans/2026-04-20-002-feat-grantiq-rfp-hallucination-auditor-plan.md (paired trust layer)
---

# feat: Funder Match Critic

## Overview

Ship agent #2 from the roadmap. Second-opinion agent that re-evaluates each grant match before it appears in `/matches`, using a cheap Haiku call to kill obvious false positives (wrong geography, wrong org size, wrong entity type, mission mismatch) that the primary match scorer let through.

User-perceived match quality drives the entire activation funnel. One bad match in the top 3 erodes trust faster than 10 good matches build it. The primary matcher optimizes for recall (find every plausible match); the Critic optimizes for precision (kill everything that shouldn't be there). Together they give users a cleaner list with fewer false positives to wade through.

## Problem Frame

Current match flow:
1. User opens `/matches`
2. `/api/matches` returns results from `grant_matches` table (produced by the primary match scorer)
3. User sees list; if top matches are irrelevant, the user bounces

The primary matcher errs toward recall — it would rather show a weak match than miss one. This produces a known failure pattern: a Texas org sees California-only grants, a $200K-budget nonprofit sees grants capped at $10K, a social services org sees STEM research grants. Each one of these is a dealbreaker for operator trust.

The Critic is a lightweight post-filter. It sees each candidate match + the org profile, applies hard-criterion checks, and returns KEEP or KILL. KILLs are removed from the list and persisted with a reason for future training weight adjustment.

## Requirements Trace

From roadmap agent #2:
- **R1** (re-evaluate matches before UI render): Unit 3
- **R2** (hard-criterion checks: geography / size / entity type / mission): Unit 2
- **R3** (KEEP/KILL verdict with reason): Unit 2
- **R4** (failed matches become training data): Unit 4
- **R5** (<200ms added latency for /matches): Unit 3 (parallelize via Promise.all)
- **R6** (fail open on Critic errors — show all matches rather than empty list): Unit 3

## Scope Boundaries

**In scope:**
- Critic module in `src/lib/ai/agents/match-critic.ts`
- Inline integration with `/api/matches` GET handler
- Kill-reason persistence for future training
- Admin visibility into kill rate + kill reasons

**Out of scope:**
- Retraining the primary matcher from Critic data (that's a separate ML plan)
- Per-user Critic tuning ("this user prefers stretch matches")
- Scoring/ranking (Critic is pass/fail only — scoring stays with primary)
- Match explanation generation (separate agent, different tier)

**Not changing:**
- Primary match scorer (`src/lib/matching/`)
- `grant_matches` table schema
- `/matches` UI

## Implementation Units

### Unit 1: Schema — match_kills table

Migration `00061_match_kills.sql`:

```sql
CREATE TABLE IF NOT EXISTS match_kills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  primary_score NUMERIC,  -- what the primary matcher said
  kill_reason TEXT NOT NULL CHECK (kill_reason IN (
    'geography', 'org_size_too_big', 'org_size_too_small',
    'entity_type', 'mission_mismatch', 'eligibility_hard_requirement',
    'other'
  )),
  kill_confidence NUMERIC CHECK (kill_confidence BETWEEN 0 AND 1),
  critic_notes TEXT,
  critic_model TEXT NOT NULL,
  overridden_by_user BOOLEAN DEFAULT false,  -- if user manually saves the killed match
  overridden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_match_kills_org_recent ON match_kills(org_id, created_at DESC);
CREATE INDEX idx_match_kills_grant ON match_kills(grant_source_id);
CREATE UNIQUE INDEX idx_match_kills_org_grant_unique ON match_kills(org_id, grant_source_id);

ALTER TABLE match_kills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_kills_select" ON match_kills
  FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));
```

The UNIQUE index on `(org_id, grant_source_id)` means we only kill a given match once per org — avoids the same match being re-killed every time `/matches` loads.

The `overridden_by_user` column: if a user explicitly saves a killed match to their pipeline (via a "show killed matches" admin surface), that's strong training signal the Critic was wrong. Weight heavily in future tuning.

Files:
- `supabase/migrations/00061_match_kills.sql` (new)

### Unit 2: Critic module

New file `src/lib/ai/agents/match-critic.ts`.

```typescript
export interface CriticInput {
  orgProfile: {
    name: string;
    entity_type: string;
    state: string | null;
    city: string | null;
    annual_budget: number | null;
    employee_count: number | null;
    population_served: string[];
    program_areas: string[];
    mission_statement: string;
  };
  grantMatch: {
    id: string;
    name: string;
    funder_name: string;
    source_type: string;
    category: string | null;
    amount_min: number | null;
    amount_max: number | null;
    eligibility_types: string[];
    states: string[];
    description: string | null;
  };
  primaryScore: number;
  context: { org_id: string; user_id: string; subscription_tier: string };
}

export interface CriticVerdict {
  verdict: 'KEEP' | 'KILL';
  killReason: KillReason | null;
  confidence: number;
  notes: string;
}

export async function critiqueMatch(input: CriticInput): Promise<CriticVerdict>;
```

**Two-stage design for efficiency:**

**Stage 1 — Deterministic hard checks** (no LLM):
- If `grantMatch.states` non-empty and doesn't include `orgProfile.state` → `KILL: geography`, confidence 1.0
- If `orgProfile.annual_budget && grantMatch.amount_max && orgProfile.annual_budget > grantMatch.amount_max * 10` → `KILL: org_size_too_big`, confidence 0.9
- If `grantMatch.amount_max && orgProfile.annual_budget && orgProfile.annual_budget * 10 < grantMatch.amount_max` → `KILL: org_size_too_small`, confidence 0.85
- If `grantMatch.eligibility_types` non-empty and doesn't include `orgProfile.entity_type` → `KILL: entity_type`, confidence 1.0

These are CHEAP and return KILL in <5ms with no API call. ~60% of kills will come from this stage.

**Stage 2 — LLM semantic check** (only if Stage 1 didn't kill):

Model: Haiku 4.5 (fast, cheap — this runs inline in `/matches`)

Prompt:
> You are a grant-matching precision filter. Given this org and grant, decide KEEP or KILL.
> KILL only for a clear mission mismatch — the grant explicitly funds areas the org does not work in, AND there's no plausible interpretation that connects them.
> When in doubt, KEEP. False positives are recoverable (user ignores); false negatives (killing a real match) lose trust permanently.
> Return JSON: `{verdict, kill_reason: "mission_mismatch"|"other"|null, confidence: 0-1, notes: "one sentence"}`.

Routes through `aiCall`. `actionType: "match"`. `promptId: "match.critic.v1"`. `maxTokens: 256` (response is tiny).

**Fail-open**: if aiCall throws (Anthropic down, timeout, usage limit), return `verdict: 'KEEP', confidence: 0, notes: 'critic unavailable — defaulting to keep'`. Do not kill matches when the Critic can't function.

Files:
- `src/lib/ai/agents/match-critic.ts` (new)
- `src/lib/ai/agents/prompts/match-critic.ts` (new — system prompt)

Tests:
- `tests/lib/ai/agents/match-critic.test.ts`:
  - Texas org + California-only grant → KILL geography (Stage 1, no API call)
  - $200K budget + $10K max grant → KILL org_size_too_big (Stage 1)
  - LLC org + 501c3-only grant → KILL entity_type (Stage 1)
  - Obvious mission mismatch (social services org + pure research grant) → KILL mission_mismatch (Stage 2)
  - Strong match (aligned mission, right geo, right size) → KEEP
  - Ambiguous → KEEP (fail-safe bias)
  - API throws → KEEP with confidence 0

### Unit 3: Inline integration with /api/matches

Modify `/api/matches` GET handler:

Current flow (pseudo):
```
const matches = await loadMatchesFromDB(orgId);
return json(matches);
```

New flow:
```
const matches = await loadMatchesFromDB(orgId);
const orgProfile = await loadOrgProfile(orgId);

// Check for existing kills — don't re-critique already-killed matches
const existingKills = await adminClient
  .from('match_kills')
  .select('grant_source_id, kill_reason')
  .eq('org_id', orgId);
const killedIds = new Set(existingKills.map(k => k.grant_source_id));

// Filter: candidates = matches not already killed
const candidates = matches.filter(m => !killedIds.has(m.grant_source_id));

// Critique in parallel, with timeout guard
const verdicts = await Promise.all(
  candidates.map(m =>
    withTimeout(
      critiqueMatch({ orgProfile, grantMatch: m, primaryScore: m.score, context }),
      /*ms=*/ 2000
    ).catch(() => ({ verdict: 'KEEP' as const }))  // timeout → keep
  )
);

// Persist new kills + filter them out
const newKills = [];
const survivors = [];
for (let i = 0; i < candidates.length; i++) {
  if (verdicts[i].verdict === 'KILL') {
    newKills.push({
      org_id: orgId,
      grant_source_id: candidates[i].grant_source_id,
      primary_score: candidates[i].score,
      kill_reason: verdicts[i].killReason,
      kill_confidence: verdicts[i].confidence,
      critic_notes: verdicts[i].notes,
      critic_model: 'match.critic.v1',
    });
  } else {
    survivors.push(candidates[i]);
  }
}
if (newKills.length > 0) {
  await adminClient.from('match_kills').insert(newKills);
}

return json(survivors);
```

**Latency budget:** primary matcher loads ~50 matches typically. Haiku at 2K input tokens + 200 output ≈ 800ms p50. Parallel Promise.all → total wall time ≈ 1-1.5s for the batch. Acceptable for a cached page reload (matches aren't expected to update instantly).

For the first load on a new org where many matches are un-critiqued, pre-warm via a worker job: after profile setup, fire a background critique job for the top 100 matches. By the time the user opens `/matches`, most kills are already persisted.

Files:
- `src/app/api/matches/route.ts` (modify)
- `src/lib/utils/timeout.ts` (new if not present — `withTimeout(promise, ms)` wrapper)
- Optional: `worker/src/handlers/match_critic_prewarm.ts` for the background pre-warm

Tests:
- E2E: seed org + 5 matches (2 clear kills, 3 keepers) → `/matches` returns the 3 keepers, 2 rows in match_kills
- E2E with Anthropic mocked to throw → `/matches` returns all 5 matches (fail open)
- Second call to `/matches` for same org → no new kill rows inserted (dedup works), same 3 keepers

### Unit 4: Admin + user surfaces

**Admin page `/admin/match-kills`** — visibility into what the Critic is killing:
- Kill rate per day (% of candidates killed)
- Kill reasons breakdown (which reason is most common)
- Top killed funders (is the Critic consistently killing funder X? check if it's justified)
- User overrides: if a user manually saves a killed match to pipeline → log to `match_kills.overridden_by_user` → these rows are high-priority training data

**User-facing "Show killed matches" toggle** on `/matches`:
- Small link at bottom: "Show N hidden matches (low fit)"
- On click, fetch killed matches + show with a badge "⚠ Low fit — <reason>"
- If user saves a killed match → update `match_kills.overridden_by_user = true`, grant_pipeline insert proceeds normally

**Pipeline "kill override" endpoint:**
- When user saves a killed match, the existing POST `/api/pipeline` runs as normal (no change needed)
- Add a light post-processing: detect if the saved grant_source_id has a `match_kills` row for this org, and if so, update `match_kills.overridden_by_user = true, overridden_at = now()`

Files:
- `src/app/(app)/admin/match-kills/page.tsx` (new, admin-gated)
- `src/components/matches/show-killed-matches-toggle.tsx` (new)
- `src/app/api/matches/killed/route.ts` (new — GET killed matches for this org)
- `src/app/api/pipeline/route.ts` (modify — add kill-override tracking)

## Decisions (locked)

1. **Model: Haiku 4.5.** Cheap + fast; the semantic decision is usually binary-obvious after Stage 1 hard checks filter most cases. Don't pay Opus prices for "is this a mission mismatch."
2. **Stage 1 deterministic checks run BEFORE any API call.** Zero cost for ~60% of kills.
3. **Fail open everywhere.** Timeout, API error, usage limit → KEEP. Never show an empty match list because the QA layer broke.
4. **Dedup via unique (org_id, grant_source_id).** Once killed for an org, stays killed unless manually overridden.
5. **Override is bidirectional signal.** User overriding a KILL = Critic was wrong → mine this for prompt iteration.

## Risk

- **Critic kills too aggressively**: if kill rate > 25% of candidates, something's wrong. Admin page surfaces this; if it trends high, tune Stage 2 prompt toward KEEP bias.
- **Latency spike on first /matches load**: the parallel critique can push tail latency to 2s. Mitigation: pre-warm job (optional Unit) after profile setup.
- **Cost creep if user reloads /matches constantly**: mitigated by dedup — second load of same matches hits cached kill state, no new API calls.
- **Primary matcher regresses because Critic masks its noise**: possible long-term failure mode. Monitor: if primary score distribution drifts (e.g., average increases because low-scoring matches get hidden), flag it. Admin page shows primary-score histogram of kills.

## Sequencing

Unit 1 (schema) → Unit 2 (module + tests) → Unit 3 (inline integration) → Unit 4 (admin + user toggle).

Units 1-3 = MVP. Unit 4 can slip a week.

Estimated effort:
- Unit 1: 0.25 day
- Unit 2: 0.75 day
- Unit 3: 0.5 day
- Unit 4: 0.5 day
- **Total: 1.5 days for MVP (Units 1-3); 2 days including Unit 4.**

## Validation

Post-deploy:
1. Apply migration 00061, confirm table + RLS
2. For a test org, populate obvious kill candidates (wrong state, wrong size) → load `/matches` → only keepers returned, match_kills has correct rows
3. Reload `/matches` → same result, NO new rows in match_kills (dedup)
4. Manually override a killed match via user-facing toggle → pipeline insert succeeds, match_kills row updated with `overridden_by_user=true`
5. Simulate Anthropic timeout mid-critique → `/matches` returns all candidates (fail open)
6. Admin `/admin/match-kills` loads with kill rate, reason breakdown, override list

**Success criterion (week 2):**
- Kill rate: 5-20% of candidates (if higher, tuning needed; if lower, Critic isn't adding value)
- User-override rate: <5% of kills (if higher, Critic is wrong too often → prompt v2)
- /matches p95 latency unchanged vs pre-Critic baseline within ±300ms
