-- 00064_funder_learnings.sql
--
-- Outcome Learning Agent (#5). Every time a pipeline item reaches
-- a terminal stage (awarded | declined | withdrawn), learn what worked
-- and what didn't so future drafts for the same funder improve.
--
-- Two tables:
-- 1. funder_learnings — per-funder signals aggregated across all orgs
--    (what language funders reward, what patterns win)
-- 2. org_funder_history — per-org trail with this funder, so we can
--    tell new-to-funder vs repeat-applicant drafts.

CREATE TABLE IF NOT EXISTS funder_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funder_id UUID REFERENCES funder_profiles(id) ON DELETE CASCADE,
  funder_name TEXT NOT NULL,
  -- A learning is an insight extracted from a won/lost/comparison analysis.
  -- Buckets give dashboards + downstream prompts something to filter on.
  learning_type TEXT NOT NULL CHECK (learning_type IN (
    'winning_language',      -- specific phrases/framings that won
    'losing_language',       -- phrases/framings that lost
    'budget_sweet_spot',     -- request amount that funder actually funded
    'program_preference',    -- types of programs funder favored
    'common_weakness',       -- weakness that killed a losing draft
    'common_strength',       -- strength that won
    'evaluation_signal',     -- feedback text from funder on outcome
    'timing_insight'         -- when-in-cycle the funder responds
  )),
  insight TEXT NOT NULL,
  -- Evidence = which pipeline items produced this learning. One
  -- row can aggregate many drafts. Confidence grows with evidence_count.
  evidence_count INTEGER NOT NULL DEFAULT 1,
  confidence NUMERIC NOT NULL DEFAULT 0.3 CHECK (confidence BETWEEN 0 AND 1),
  -- The AI generation that extracted it — audit trail.
  source_generation_id UUID REFERENCES ai_generations(id) ON DELETE SET NULL,
  example_quote TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funder_learnings_funder
  ON funder_learnings(funder_id);
CREATE INDEX IF NOT EXISTS idx_funder_learnings_name
  ON funder_learnings(funder_name);
CREATE INDEX IF NOT EXISTS idx_funder_learnings_type
  ON funder_learnings(learning_type);

-- Per-org funder history — did this org apply before, what happened,
-- what did we learn specific to this org for this funder?
CREATE TABLE IF NOT EXISTS org_funder_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  funder_id UUID REFERENCES funder_profiles(id) ON DELETE CASCADE,
  funder_name TEXT NOT NULL,
  pipeline_id UUID REFERENCES grant_pipeline(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('awarded', 'declined', 'withdrawn')),
  award_amount NUMERIC,
  decision_date DATE,
  -- The draft that got submitted — kept so the learning agent can
  -- cross-reference language at analysis time.
  submitted_draft_id UUID REFERENCES grant_drafts(id) ON DELETE SET NULL,
  -- What the learning agent extracted specific to this application.
  analysis_summary TEXT,
  -- Raw funder feedback text if the user got one (pasted into a field)
  funder_feedback_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_funder_history_org
  ON org_funder_history(org_id);
CREATE INDEX IF NOT EXISTS idx_org_funder_history_funder
  ON org_funder_history(funder_id);
CREATE INDEX IF NOT EXISTS idx_org_funder_history_outcome
  ON org_funder_history(outcome);
-- One history row per pipeline outcome — avoid double-logging if
-- the agent runs twice for the same transition.
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_funder_history_pipeline
  ON org_funder_history(pipeline_id);

-- RLS: funder_learnings is readable by all authenticated users (it's
-- aggregate cross-org knowledge, no PII). Writes only by service_role.
ALTER TABLE funder_learnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read funder learnings"
  ON funder_learnings FOR SELECT
  TO authenticated
  USING (true);

-- org_funder_history is per-org, standard RLS.
ALTER TABLE org_funder_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own org funder history"
  ON org_funder_history FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active'
  ));

GRANT ALL ON funder_learnings TO service_role;
GRANT SELECT ON funder_learnings TO authenticated;
GRANT ALL ON org_funder_history TO service_role;
GRANT SELECT ON org_funder_history TO authenticated;
