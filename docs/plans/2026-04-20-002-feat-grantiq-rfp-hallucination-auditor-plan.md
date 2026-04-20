---
title: "feat: RFP Hallucination Auditor — block fabricated claims in every draft section"
type: feat
status: active
date: 2026-04-20
origin: docs/GrantIQ_Custom_Agents_Roadmap (Google Doc 1n7BOX83rt9_dDHZqqfUsoqDWhZA4EnvccAQEMzjZX-c) — agent #1
depends_on: docs/plans/2026-04-19-002-feat-grantiq-rfp-crawler-plan.md (Unit 9a funder context block, already shipped in commit f4e0c40)
related: docs/plans/2026-04-20-001-feat-grantiq-cost-watchdog-plan.md (observability for this agent's cost)
---

# feat: RFP Hallucination Auditor

## Overview

Ship agent #1 from the custom agents roadmap as production code. After every AI-generated draft section, the Auditor extracts factual claims, checks each against the source RFP + funder context block + org profile, and flags any statement not grounded in source material. Tier-aware behavior: Tier 1 logs and warns, Tier 2/3 block section completion until the operator reviews flagged claims.

This is the product feature that converts the user's "nothing fabricated" principle from a wish into a system-enforced invariant. It's also GrantIQ's headline trust signal — operators can show funders "this AI was constrained by these specific source documents, and here's the audit proving it."

## Problem Frame

Tonight's session surfaced the core vulnerability: a user pastes a thin description as the RFP, the writing pipeline generates a confident multi-section draft, and the AI invents specifics that aren't in the source — funder priorities, eligibility nuances, population numbers, prior work claims. The draft is fluent, well-structured, and completely fabricated in those spots. Today the only defense is the operator reading carefully. That doesn't scale.

The Auditor is the system-level defense. It:
1. Sees the generated draft section and the same source material the AI had
2. Extracts every factual claim in the draft
3. Checks each claim against the sources
4. Flags any claim that introduces details not present in any source
5. Either blocks the draft (Tier 2/3) or warns the operator (Tier 1)

The result: a draft that reaches the user is either (a) verifiably grounded or (b) explicitly marked with ungrounded claims that the operator must resolve.

Pairs with Unit 9a's funder context block (shipped): the Auditor now has three verified sources to check against — RFP text, funder 990 data, and org profile. A claim that's in none of them is fabricated.

## Requirements Trace

From the roadmap doc (agent #1):
- **R1** (run after each draft section generates, before section shown): Unit 3
- **R2** (extract factual claims — statistics, dates, program details, populations, outcomes): Unit 2
- **R3** (verify each claim against RFP + funder context + org profile): Unit 2
- **R4** (flag ungrounded claims with specific source gap explanation): Unit 2
- **R5** (persist audit results as first-class records, queryable): Unit 1
- **R6** (tier-aware behavior: warn Tier 1, block Tier 2/3): Unit 3
- **R7** (UI surface — per-section audit summary + drill into flagged claim): Unit 4
- **R8** (admin aggregate view: hallucination rate per prompt version, per funder): Unit 5

## Scope Boundaries

**In scope:**
- Production backend service in `src/lib/ai/agents/hallucination-auditor.ts`
- Pipeline hook in `draft-generator.ts` after each `generateSection` call
- UI: per-section audit badge + claim-detail modal
- Persistence in new `section_audits` table
- Tier-aware gating (Tier 2/3 block advancement; Tier 1 warns only)
- Admin analytics page showing hallucination rate trends

**Out of scope (follow-up):**
- Auto-remediation (offering rewritten claims) — detection first, remediation later
- Real-time streaming of audit results as they complete — fire-and-forget with status polling is fine for v1
- Per-funder calibration of what counts as "grounded" — one rubric for all
- Client-side preview of audit results before pipeline completes
- Audit of budget table line items — scope creep, separate plan

**Not changing:**
- `aiCall` wrapper itself
- Existing draft pipeline sequencing
- Funder context block generator (Unit 9a — already shipped)

## Implementation Units

### Unit 1: Schema — section_audits table

Migration `00060_section_audits.sql`:

```sql
CREATE TABLE IF NOT EXISTS section_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES grant_drafts(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_type TEXT,
  claims_total INTEGER NOT NULL CHECK (claims_total >= 0),
  claims_grounded INTEGER NOT NULL CHECK (claims_grounded >= 0),
  claims_ungrounded INTEGER NOT NULL CHECK (claims_ungrounded >= 0),
  verdict TEXT NOT NULL CHECK (verdict IN ('clean', 'flagged', 'blocked')),
  claims_detail JSONB NOT NULL DEFAULT '[]',
    -- Array of { claim_text, status: 'grounded'|'ungrounded',
    --           source_quote: string|null, missing_source: string|null }
  audited_by TEXT NOT NULL,  -- e.g. "writing.hallucination_auditor.v1"
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached_input_tokens INTEGER,
  cost_cents INTEGER,
  resolved_by_user BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_section_audits_draft ON section_audits(draft_id);
CREATE INDEX idx_section_audits_verdict_created ON section_audits(verdict, created_at DESC)
  WHERE verdict IN ('flagged', 'blocked');

ALTER TABLE section_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "section_audits_select" ON section_audits
  FOR SELECT USING (
    draft_id IN (
      SELECT id FROM grant_drafts
      WHERE org_id IN (SELECT public.user_org_ids())
    )
  );
```

The `claims_detail` JSONB keeps every claim + its verdict + either its supporting quote or its "missing source" explanation. This is the audit trail operators can show funders if questioned.

Files:
- `supabase/migrations/00060_section_audits.sql` (new)

Tests:
- Migration applies cleanly
- RLS blocks non-members from reading audits for orgs they don't belong to

### Unit 2: Auditor module

New file `src/lib/ai/agents/hallucination-auditor.ts`. Exports:

```typescript
export interface AuditInput {
  sectionText: string;
  sectionName: string;
  rfpText: string;
  funderContextBlock: string | null;  // from src/lib/grants/funder_context.ts
  orgProfile: {
    name: string;
    mission_statement: string;
    population_served: string[];
    program_areas: string[];
  };
  context: {
    org_id: string;
    user_id: string;
    subscription_tier: string;
    draft_id: string;
  };
}

export interface AuditResult {
  claimsTotal: number;
  claimsGrounded: number;
  claimsUngrounded: number;
  verdict: 'clean' | 'flagged' | 'blocked';
  claimsDetail: Array<{
    claimText: string;
    status: 'grounded' | 'ungrounded';
    sourceQuote: string | null;
    missingSource: string | null;
  }>;
  tokensUsed: { input: number; output: number; cached: number };
}

export async function auditSection(input: AuditInput): Promise<AuditResult>;
```

**Single-call design** (not extraction-then-verdict in two calls):
- Cuts cost in half vs two-call design
- Cacheable context (RFP + funder context + org profile) stays identical across all sections of one draft — excellent prompt-cache hit rate

Prompt structure:
- **System prompt** (cached 1h TTL): the audit rubric and JSON output schema
- **Cacheable context** (cached 5m TTL): RFP text + funder context block + org profile
- **User input** (per section, not cached): "Audit this section: <sectionText>"

Model: `ANTHROPIC_MODELS.STRATEGY` (Opus) — hallucination detection needs careful reasoning. Haiku is too lossy here.

Verdict rule:
- `clean`: 0 ungrounded claims
- `flagged`: 1-2 ungrounded claims
- `blocked`: 3+ ungrounded claims OR any single ungrounded claim is a "hard fact" (specific number, date, population count, funder priority, org capability)

The "hard fact" classification is itself in the JSON response — the model tags each ungrounded claim with `is_hard_fact: boolean` and we apply the blocking rule locally.

Routes through `aiCall` (gets the usage gate, token ceiling, ai_generations recording, Sentry tripwire, session dedup — same as every other writing-pipeline call).

`promptId: "writing.hallucination_audit.v1"` — versioned so we can A/B later.

`actionType: "audit"` — already in the AI_ACTION_TYPES enum, maps to `ai_drafts` feature.

Files:
- `src/lib/ai/agents/hallucination-auditor.ts` (new)
- `src/lib/ai/agents/prompts/hallucination-audit.ts` (new — the system prompt)

Tests:
- `tests/lib/ai/agents/hallucination-auditor.test.ts`:
  - Fixture with a section that invents "Our org has served 50,000 students" when source says 500 → must flag
  - Fixture with a fully grounded section → must return `clean`
  - Fixture with 5 ungrounded claims → must return `blocked`
  - Fixture with 1 ungrounded "soft" claim (opinion) → `flagged` not `blocked`
  - Empty section → short-circuit, don't call API, return claims_total=0 verdict=clean

### Unit 3: Pipeline integration

Modify `src/lib/ai/writing/pipeline.ts` and `draft-generator.ts` to fire the audit after each section generates.

In `draft-generator.ts`, after `generateSection` returns a section, before the next section begins:

```typescript
const audit = await auditSection({
  sectionText: section.content,
  sectionName: section.section_name,
  rfpText: context.rfp_analysis.source_rfp_text ?? '',  // new field — add if missing
  funderContextBlock: context.funder_context_block ?? null,
  orgProfile: {
    name: context.org_profile.name,
    mission_statement: context.org_profile.mission_statement,
    population_served: context.org_profile.population_served,
    program_areas: context.org_profile.program_areas,
  },
  context: {
    org_id: context.org_id,
    user_id: context.user_id,
    subscription_tier: context.subscription_tier,
    draft_id: draftId,
  },
});

// Persist audit row (admin client, bypass RLS for write)
await adminClient.from('section_audits').insert({
  draft_id: draftId,
  section_name: section.section_name,
  section_type: classifySectionType(section.section_name),
  claims_total: audit.claimsTotal,
  claims_grounded: audit.claimsGrounded,
  claims_ungrounded: audit.claimsUngrounded,
  verdict: audit.verdict,
  claims_detail: audit.claimsDetail,
  audited_by: 'writing.hallucination_audit.v1',
  input_tokens: audit.tokensUsed.input,
  output_tokens: audit.tokensUsed.output,
  cached_input_tokens: audit.tokensUsed.cached,
});
```

**Tier-aware blocking:**
- Tier 1 (`tier1_ai_only`): always proceed. Audit is advisory only.
- Tier 2 (`tier2_ai_audit`) and Full Confidence (`full_confidence`): if `verdict === 'blocked'`, set `draft.status = 'audit_blocked'` and halt the pipeline. Operator must resolve in UI (Unit 4) before pipeline resumes.
- Tier 3 (`tier3_expert`): same as Tier 2 — expert review also waits on audit.

Failure handling: if the audit call itself throws (Anthropic down, timeout, etc.), log + Sentry + proceed with `verdict = 'unaudited'` rather than fail the whole draft. Better to ship unaudited with a clear "audit unavailable" badge than to block the user entirely.

Files:
- `src/lib/ai/writing/pipeline.ts` (modify)
- `src/lib/ai/writing/draft-generator.ts` (modify — add audit call after each section)
- `src/lib/ai/writing/schemas.ts` (modify if `rfp_analysis` type needs a `source_rfp_text` field)

Tests:
- End-to-end pipeline test with a draft that should produce a `flagged` section → verify row appears in `section_audits` with correct shape
- Same pipeline test with Tier 2 context + injected hallucination → verify draft pauses at `audit_blocked` status
- Anthropic-down simulation → pipeline completes with `unaudited` status, no crash

### Unit 4: UI — per-section audit surface

In the draft viewer (wherever completed sections are shown to operators), add:

**Section header badge:**
- `✓ Grounded` (green) — verdict clean
- `⚠ N flagged claims` (amber) — verdict flagged
- `🚫 Blocked — requires review` (red) — verdict blocked
- `— Audit unavailable` (gray) — unaudited

**Click badge → claim detail modal:**
- Lists all claims from `claims_detail`
- For each grounded claim: green check + expandable "Source: <quote>"
- For each ungrounded claim: red warning + "Missing source: <explanation>" + three actions:
  - "Edit this claim in section" — scrolls the section editor to the claim text
  - "Add supporting source" — opens RFP/funder-context edit modal
  - "Accept as is (mark resolved)" — writes `resolved_by_user=true` to section_audits, unblocks pipeline if Tier 2/3

**Tier 2/3 blocking modal:**
When `draft.status = 'audit_blocked'`, show a blocking modal over the draft view: "This draft has N flagged claims that must be reviewed before the AI audit tier can complete. Review them now." One button → opens the first blocked section.

Files:
- `src/components/writing/section-audit-badge.tsx` (new)
- `src/components/writing/claim-detail-modal.tsx` (new)
- `src/components/writing/audit-blocked-banner.tsx` (new)
- `src/app/(app)/writing/[draftId]/page.tsx` (modify — wire in the badges + modal)
- `src/app/api/writing/resolve-audit/route.ts` (new — POST { section_audit_id, note } → updates resolved_by_user, unblocks pipeline)

Tests:
- Unit tests for each component (React Testing Library)
- Integration: clicking "Accept as is" unblocks a Tier 2 draft → pipeline resumes from where it paused

### Unit 5: Admin analytics

Admin page at `/admin/audit-quality` showing:

- Hallucination rate per day (% of sections flagged or blocked)
- Top 10 sections by flag frequency (is "Organizational Capacity" the chronic offender?)
- Per-funder flag rate (are drafts for foundation X consistently worse?)
- Per-prompt-version comparison (`writing.hallucination_audit.v1` vs v2 when we iterate)

Three server queries on page load (admin client):
```sql
-- Daily hallucination rate
SELECT date_trunc('day', created_at) AS day,
       COUNT(*) FILTER (WHERE verdict IN ('flagged','blocked'))::float / COUNT(*) AS rate
FROM section_audits
WHERE created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1;

-- Top offending section types
SELECT section_type, COUNT(*) FILTER (WHERE verdict IN ('flagged','blocked')) AS flags, COUNT(*) AS total
FROM section_audits
WHERE created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY flags DESC LIMIT 10;

-- Per-funder
SELECT gs.funder_name,
       COUNT(*) FILTER (WHERE sa.verdict IN ('flagged','blocked')) AS flags,
       COUNT(*) AS total
FROM section_audits sa
JOIN grant_drafts gd ON gd.id = sa.draft_id
JOIN grant_sources gs ON gs.id = gd.grant_source_id
WHERE sa.created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY flags DESC LIMIT 20;
```

Files:
- `src/app/(app)/admin/audit-quality/page.tsx` (new, admin-gated)

Tests:
- Non-admin → 403
- Admin → 200 with expected data shape
- Query performance: <500ms on prod-scale data (add indexes if needed)

## Decisions (locked, 2026-04-20)

1. **Model: Claude Opus** (`ANTHROPIC_MODELS.STRATEGY`). Sonnet was the default but hallucination detection is the exact task where the extra reasoning of Opus earns its keep. Revisit after 500 audits — if Opus and Sonnet produce identical verdicts 98%+ of the time, switch to Sonnet for the cost.

2. **Single-call extraction + verdict** (not two calls). Halves cost; the JSON output format enforces discipline.

3. **`blocked` threshold**: 3+ ungrounded claims OR any "hard fact" ungrounded claim. Soft (opinion/rhetoric) ungrounded is `flagged` but not blocking.

4. **Tier behavior:**
   - Tier 1: advisory warning, no gate
   - Tier 2: block on verdict=blocked, operator must resolve
   - Tier 3 / Full Confidence: same as Tier 2 (expert review comes after audit passes)

5. **On audit failure**: `verdict='unaudited'`, pipeline proceeds, UI shows gray badge. Fail open, not closed — don't starve the user of the draft because our QA layer had a bad minute.

## Risk

- **False positives**: model flags grounded claims that ARE in the RFP but use different wording. Mitigation: the audit prompt explicitly instructs the model to match semantically, not lexically. Include 3 in-prompt examples of valid paraphrase.
- **False negatives**: model misses hallucinated claims because they sound plausible. Mitigation: for the first 1,000 audits, spot-check a 5% random sample manually. Build a "disputed audits" flow in Unit 4 where operators can flag an audit as wrong — feeds into prompt iteration.
- **Cost creep**: at 1,000 drafts/month × 6 sections, this is 6,000 Opus calls/month ≈ $84/month without caching, ~$40/month with caching. If drafts volume 10x, cost 10x. The Cost Watchdog (shipping before this — Batch 1 agent #1) will catch it.
- **Prompt cache invalidation**: if `funder_context_block` output changes byte-for-byte between calls (Unit 9a uses canonical stringify — should be stable), cache hit rate will collapse. Add a sanity check in Unit 3: log the cached-input-tokens column; if it trends to zero, the cache is broken.

## Sequencing

Strictly sequential:
- Unit 1 (schema) → Unit 2 (auditor module) → Unit 3 (pipeline integration) → Unit 4 (UI) → Unit 5 (admin analytics)

Unit 5 is deferrable — the auditor does its job without the analytics page. Ship Units 1-4, add Unit 5 in the following week.

Estimated effort:
- Unit 1: 0.25 day (schema + RLS)
- Unit 2: 1 day (module + prompt design + tests)
- Unit 3: 0.5 day (pipeline integration + tier logic + fail-open handling)
- Unit 4: 1 day (3 components + API route + integration tests)
- Unit 5: 0.5 day (admin page + 3 queries)

**Total: 2.5-3 days to ship Units 1-4 (MVP). 3.5 days including Unit 5.**

## Validation

Post-deploy checklist:

1. Apply migration 00060; confirm `section_audits` table + RLS policy exist
2. Generate one Tier 1 draft (admin bypass OK) → verify one row per section appears in `section_audits` with verdict
3. Hand-inject hallucinations: edit a section's content in the DB to add "Our org has served 50,000 students" (org profile says 500) → re-run audit on that section → must flag
4. Generate one Tier 2 draft where a section should be flagged → verify `draft.status = 'audit_blocked'` → open the draft in UI → verify blocking modal shows
5. Resolve all flagged claims via "Accept as is" → verify pipeline resumes, draft completes
6. Simulate Anthropic timeout during audit → verify pipeline completes, audit row has `verdict='unaudited'`, UI shows gray badge
7. Check `ai_generations` has the audit calls recorded with `promptId='writing.hallucination_audit.v1'` and expected `input_tokens` / `cached_input_tokens`
8. Admin page `/admin/audit-quality` loads in <2s with realistic data

**Success criterion (week 2 post-deploy):**
- Audit coverage: ≥95% of generated sections have a non-`unaudited` verdict
- False-positive rate from operator-disputed audits: <15% (measured in Unit 4 disputed-audits flow once it has data)
- Tier 2 drafts: average of <1.5 blocked-section resolutions per draft (if higher, either the model is too strict or the operator-sourced RFPs are too thin)

If false-positive rate > 30% in week 1: stop. Don't ship more agents. Fix the prompt first. Hallucination auditors that cry wolf destroy trust faster than missing hallucinations do.
