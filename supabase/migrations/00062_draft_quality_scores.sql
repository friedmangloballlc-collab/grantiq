-- 00062_draft_quality_scores.sql
--
-- Application Quality Scorer (docs/plans/2026-04-20-004). Each
-- completed draft scores against the funder's rubric and writes
-- a row here. Operators see "87/100 submittable" and a ranked
-- improvement list. Re-scoring after edits produces new rows —
-- UI shows the latest, admin analytics compares over time to
-- measure improvement.

CREATE TABLE IF NOT EXISTS draft_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES grant_drafts(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  max_possible INTEGER NOT NULL CHECK (max_possible > 0),
  criteria_detail JSONB NOT NULL DEFAULT '[]',
    -- Array<{criterion, max, score, evidence_quoted, strengths[], gaps[], improvements[]}>
  rubric_source TEXT NOT NULL CHECK (rubric_source IN ('explicit_from_rfp', 'inferred')),
  draft_content_hash TEXT NOT NULL,
    -- SHA-256 of concatenated section content at time of scoring.
    -- Client compares current hash to flag stale scores after edits.
  improvements_ranked JSONB NOT NULL DEFAULT '[]',
    -- Top N improvements sorted by point_impact DESC
  verdict TEXT NOT NULL CHECK (verdict IN ('submittable', 'needs_work', 'not_ready')),
  scored_by TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_draft_quality_scores_draft_latest
  ON draft_quality_scores(draft_id, created_at DESC);

ALTER TABLE draft_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "draft_quality_scores_select" ON draft_quality_scores
  FOR SELECT USING (
    draft_id IN (
      SELECT id FROM grant_drafts
      WHERE org_id IN (SELECT public.user_org_ids())
    )
  );

GRANT ALL ON draft_quality_scores TO service_role;
