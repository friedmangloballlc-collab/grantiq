---
title: "feat: Application Quality Scorer — pre-submission rubric scoring for every draft"
type: feat
status: active
date: 2026-04-20
origin: docs/GrantIQ_Custom_Agents_Roadmap (Google Doc 1n7BOX83rt9_dDHZqqfUsoqDWhZA4EnvccAQEMzjZX-c) — agent #3
depends_on: docs/plans/2026-04-20-002-feat-grantiq-rfp-hallucination-auditor-plan.md (pairs at completion)
---

# feat: Application Quality Scorer

## Overview

Ship agent #3 from the roadmap. Scores every completed draft against the funder's scoring rubric (explicit from the RFP, or inferred for foundations without one). Returns "this draft would score 87/100" with per-criterion breakdown, strengths, gaps, and specific improvements ranked by point impact.

This is the deliverable that justifies Tier 2 ($749) and Tier 3 ($1,749). Today the "value" of those tiers is abstract ("better audit", "expert review"). With the Scorer, the value is a concrete number the operator sees before submitting — and a ranked list of edits that would raise it.

## Problem Frame

Current state:
- Operator finishes a draft
- Operator reads it, thinks "I think this is good?"
- Operator submits it
- Funder reviews, returns yes/no weeks later
- Operator has no signal in between

The Scorer fills the gap. It's the first objective measure of "is this submittable" that exists between drafting and actual submission. Operators know whether they should send it, edit it, or escalate for expert review.

Also: the score becomes the deliverable. Tier 1 customers get a draft. Tier 2/3 customers get a draft **plus** a reviewer-perspective score that they can show their board or boss as proof of readiness.

## Requirements Trace

From roadmap agent #3:
- **R1** (score against funder's rubric from RFP): Unit 2
- **R2** (infer rubric when RFP doesn't publish one): Unit 2
- **R3** (numeric total 0-100 + per-criterion breakdown): Unit 3
- **R4** (specific improvements ranked by point impact): Unit 3
- **R5** (re-score after edits to measure improvement): Unit 4
- **R6** (unlock "Score & Polish" pricing tier — re-scores included): Unit 5 (product, not code)
- **R7** (score persists so operators see trend over edits): Unit 1

## Scope Boundaries

**In scope:**
- Scorer module scoring a completed draft against a rubric
- Rubric inference for RFPs without explicit scoring criteria
- Per-criterion isolation (one call per criterion — prevents halo effect)
- Persistence of scores + ability to re-score
- UI: prominent score display on completed drafts + per-criterion drill-down
- Edit tracking (operator edits a section → score stale → re-score button)

**Out of scope:**
- Auto-applying the Scorer's improvement suggestions (separate remediation plan)
- A/B testing which improvements actually change the score (cool, not now)
- Per-org rubric learning from past outcomes (requires Outcome Learning Agent #5 first)
- Competitive score ("your draft scores higher than 80% of GrantIQ drafts for this funder") — privacy + data issues

**Not changing:**
- Existing draft pipeline (Scorer is additive, runs after pipeline completes)
- Pricing today (Unit 5 is informational — product decides when to launch tiered pricing)

## Implementation Units

### Unit 1: Schema — draft_quality_scores table

Migration `00062_draft_quality_scores.sql`:

```sql
CREATE TABLE IF NOT EXISTS draft_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES grant_drafts(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  max_possible INTEGER NOT NULL CHECK (max_possible > 0),
  criteria_detail JSONB NOT NULL DEFAULT '[]',
    -- Array of { criterion, max, score, evidence_quoted, strengths[], gaps[], improvements[] }
  rubric_source TEXT NOT NULL CHECK (rubric_source IN ('explicit_from_rfp', 'inferred')),
  draft_content_hash TEXT NOT NULL,  -- SHA of concatenated section content at time of scoring
  improvements_ranked JSONB NOT NULL DEFAULT '[]',
    -- Top N improvements sorted by point_impact DESC
  verdict TEXT NOT NULL CHECK (verdict IN ('submittable', 'needs_work', 'not_ready')),
  scored_by TEXT NOT NULL,  -- e.g. "writing.quality_scorer.v1"
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_draft_quality_scores_draft ON draft_quality_scores(draft_id, created_at DESC);

ALTER TABLE draft_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "draft_quality_scores_select" ON draft_quality_scores
  FOR SELECT USING (
    draft_id IN (
      SELECT id FROM grant_drafts WHERE org_id IN (SELECT public.user_org_ids())
    )
  );
```

`draft_content_hash`: lets the UI know when a score is stale (content changed but no re-score yet). Compute as `sha256(sections.map(s => s.content).join('\n'))`.

Multiple rows per draft is OK — each edit + re-score produces a new row. The UI shows the latest. Admin analytics compares scores-over-time to measure improvement.

Files:
- `supabase/migrations/00062_draft_quality_scores.sql` (new)

### Unit 2: Rubric extraction + inference

New file `src/lib/ai/agents/quality-scorer/rubric.ts`.

```typescript
export interface Rubric {
  criteria: Array<{
    criterion: string;
    max_points: number;
    description: string;
  }>;
  total_points: number;
  source: 'explicit_from_rfp' | 'inferred';
}

export function extractRubric(rfpAnalysis: RfpParseOutput): Rubric;
export async function inferRubric(
  rfpAnalysis: RfpParseOutput,
  funderContextBlock: string | null,
  context: AiCallContext
): Promise<Rubric>;
```

**Extract first (no LLM):** `rfpAnalysis.scoring_criteria` is already parsed by `rfp-parser.ts`. If non-empty, use it directly. `source: 'explicit_from_rfp'`.

**Infer if empty:** run one Sonnet call:
> Given this RFP + funder context, infer the likely scoring rubric this funder uses, even though it's not explicitly published. Output 4-6 criteria with reasonable point weights summing to 100. Base inferences on: funder type, mission focus, stated priorities, typical grant-review practices for this category.
> JSON: `{criteria: [{criterion, max_points, description}]}`.

`promptId: "writing.rubric_infer.v1"`. Cached for 1 hour per funder — rubric doesn't change between drafts for the same funder.

### Unit 3: Scorer module

New file `src/lib/ai/agents/quality-scorer/score.ts`.

```typescript
export interface ScorerInput {
  draftId: string;
  sections: DraftSectionOutput[];
  budget: BudgetTableOutput;
  rfpAnalysis: RfpParseOutput;
  funderContextBlock: string | null;
  context: AiCallContext;
}

export interface ScoreResult {
  totalScore: number;
  maxPossible: number;
  criteriaDetail: Array<CriterionScore>;
  improvementsRanked: Array<Improvement>;
  verdict: 'submittable' | 'needs_work' | 'not_ready';
  rubricSource: 'explicit_from_rfp' | 'inferred';
  tokensUsed: { input: number; output: number };
}

export async function scoreDraft(input: ScorerInput): Promise<ScoreResult>;
```

Procedure:
1. `const rubric = extractRubric(rfpAnalysis) ?? await inferRubric(...)` — get the rubric
2. **For each criterion, run ONE Sonnet call** (not one big call for all criteria — isolation prevents halo effect where a strong section bleeds credit into criteria it shouldn't address):
   ```
   "Score this application against this single criterion: <criterion> (max <max> points).
    Reference specific section text by quoting.
    Return JSON: {score, evidence_quoted, strengths[], gaps[], specific_improvements: [{text, point_impact}]}"
   ```
3. Sum scores → `totalScore`
4. Rank all `improvements[]` from all criteria by `point_impact DESC`, take top 5 → `improvementsRanked`
5. Verdict: `totalScore / maxPossible * 100 > 70 ? 'submittable' : > 50 ? 'needs_work' : 'not_ready'`
6. Return.

**Parallelization:** the per-criterion calls are independent. Run them via `Promise.all` — a 5-criterion rubric scores in ~the time of one call, not five.

Model: `ANTHROPIC_MODELS.STRATEGY` (Opus). Scoring is judgment-heavy; Haiku is too lossy.

Cacheable context (shared across all criterion calls within one draft score):
- Draft sections concatenated
- Funder context block
- Rubric itself

The per-criterion user input is just "Score against criterion X". With 5 criteria + 10K cacheable tokens, cache hit rate is ~95% on calls 2-5. Keeps cost manageable.

Files:
- `src/lib/ai/agents/quality-scorer/score.ts` (new)
- `src/lib/ai/agents/quality-scorer/rubric.ts` (new)
- `src/lib/ai/agents/quality-scorer/prompts.ts` (new — system prompts for both rubric infer + per-criterion score)

Tests:
- Feed a deliberately bad 3-sentence draft → totalScore < 30
- Feed a strong, fully-sourced draft → 75-90
- Re-score same draft twice with temperature=0 → identical score (stability check)
- Feed an RFP with no scoring_criteria → inferRubric runs; verdict uses source='inferred'

### Unit 4: Pipeline integration + re-score endpoint

Modify `src/lib/ai/writing/pipeline.ts` to call `scoreDraft` at the end of the pipeline (after compliance check), before marking draft as `completed`.

```typescript
// At the very end of pipeline, after compliance:
const scoreResult = await scoreDraft({
  draftId: input.draft_id,
  sections: finalSections,
  budget,
  rfpAnalysis,
  funderContextBlock: context.funder_context_block,
  context: { org_id, user_id, subscription_tier, draft_id },
});

await adminClient.from('draft_quality_scores').insert({
  draft_id: input.draft_id,
  total_score: scoreResult.totalScore,
  max_possible: scoreResult.maxPossible,
  criteria_detail: scoreResult.criteriaDetail,
  rubric_source: scoreResult.rubricSource,
  draft_content_hash: hashSections(finalSections),
  improvements_ranked: scoreResult.improvementsRanked,
  verdict: scoreResult.verdict,
  scored_by: 'writing.quality_scorer.v1',
  input_tokens: scoreResult.tokensUsed.input,
  output_tokens: scoreResult.tokensUsed.output,
  cost_cents: estimateCost(scoreResult.tokensUsed),
});
```

**Re-score endpoint** at `POST /api/writing/draft/[id]/rescore`:
- Load current sections from DB
- Compute current hash
- If hash matches latest `draft_quality_scores.draft_content_hash` → return existing score (no re-run)
- Else run scoreDraft + insert new row
- Admin-bypass RLS as usual; scope by user's org membership

Files:
- `src/lib/ai/writing/pipeline.ts` (modify)
- `src/app/api/writing/draft/[id]/rescore/route.ts` (new)
- `src/lib/ai/writing/utils/hash-sections.ts` (new)

### Unit 5: UI — score surface

**Score card on completed draft page:**

Prominently displayed at top of draft view:

```
┌─────────────────────────────────────────────┐
│          Application Quality Score          │
│                                              │
│                   87 / 100                   │
│              ✅ Submittable                   │
│                                              │
│  Alignment with funder priorities  23/25 ── │
│  Need and impact                   22/25 ── │
│  Project design                    17/20 ── │
│  Organizational capacity           13/15 ── │
│  Budget reasonableness             12/15 ── │
│                                              │
│  [View per-criterion detail]  [Re-score]    │
└─────────────────────────────────────────────┘
```

Stale score banner: if `current_content_hash !== latest_score.draft_content_hash`, show:
> ⚠ Score is based on an earlier version. [Re-score now]

**Per-criterion modal:**
- Criterion name + score
- Evidence quoted from the draft
- Strengths
- Gaps
- Improvements for this criterion

**Top 5 improvements section:**
- Below the score card
- Each improvement: point impact, location (section name), specific change suggested
- "Edit in section" link that scrolls the editor to the relevant passage

Files:
- `src/components/writing/quality-score-card.tsx` (new)
- `src/components/writing/criterion-detail-modal.tsx` (new)
- `src/components/writing/improvements-list.tsx` (new)
- `src/app/(app)/writing/[draftId]/page.tsx` (modify — wire the score card in)

## Decisions (locked)

1. **Model: Opus** for scoring. Judgment-heavy; Sonnet's output is correlated with Opus 90% of the time but the remaining 10% matters for customer-facing scores.
2. **One call per criterion** (not one call for all). Halo-effect avoidance > cost savings.
3. **Re-score on demand, not automatic.** Every edit-and-save triggering a re-score would burn cost. Hash-based staleness detection + manual button is the right tradeoff.
4. **Verdict thresholds**: >70 submittable, 50-70 needs_work, <50 not_ready. Calibrate if feedback shows misalignment with actual win rates.
5. **Scorer fires for Tier 1 too** (not gated to Tier 2/3). Why: the score itself is a conversion lever. Free tier sees their score, sees "87 = submittable" or "45 = not_ready", and has a reason to either submit or upgrade to Tier 2 for the audit pass that fixes the gaps.

## Risk

- **Score drift across re-runs**: temperature=0 SHOULD guarantee determinism but Opus can still vary slightly. Validation step 3 locks this in; if it regresses in prod, that's a prompt bug to fix.
- **Score inflation**: Opus is a generous grader. Calibrate with the week-1 validation — if average score across 50 real drafts is >85, the rubric is too easy. Tighten the prompt's "reserve full points for exceptional work" language.
- **Rubric inference quality**: a bad inferred rubric poisons every downstream score for that funder. Mitigation: for the first 100 inferences, spot-check a 10% sample. Add a "dispute rubric" admin action.
- **Cost at scale**: 1000 drafts/mo × 5 criteria × $0.045 per call = $225/mo at full scale — that's the high end of the roadmap estimate. With per-criterion parallelism + prompt caching, it should trend lower. Cost Watchdog will surface if we're drifting.

## Sequencing

Unit 1 (schema) → Unit 2 (rubric) → Unit 3 (score) → Unit 4 (pipeline hook + rescore endpoint) → Unit 5 (UI).

Estimated effort:
- Unit 1: 0.25 day
- Unit 2: 0.75 day
- Unit 3: 1 day
- Unit 4: 0.5 day
- Unit 5: 1 day
- **Total: 3.5 days.**

## Validation

1. Apply migration 00062
2. Generate a test draft → pipeline completes → row in `draft_quality_scores` with numeric score, criteria_detail, improvements_ranked
3. UI shows score card on draft page
4. Edit a section → `content_hash` changes → stale banner appears → click Re-score → new row inserted, new score shown
5. Per-criterion modal shows evidence quotes from the draft (not hallucinated)
6. Hand-test calibration: feed 10 real drafts spanning "obviously bad" to "obviously great" → scores correlate with human judgment within ±10 points

**Success criterion week 2:** average score across production drafts falls 60-85 range (not pinned at 95+, not pinned at 50-). If scores cluster at one end, rubric is miscalibrated. Win-rate correlation test at week 4: do drafts scoring >75 actually win more often than drafts scoring <50? If no correlation after 20+ outcomes, the scorer's signal is fake.
