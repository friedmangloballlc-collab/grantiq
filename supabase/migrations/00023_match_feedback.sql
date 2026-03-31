CREATE TABLE match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id),
  match_score INTEGER,
  user_action TEXT NOT NULL CHECK (user_action IN ('saved', 'dismissed', 'evaluated', 'applied', 'won', 'lost')),
  user_relevance_rating INTEGER CHECK (user_relevance_rating BETWEEN 1 AND 5),
  scorecard_overrides JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_match_feedback_org ON match_feedback(org_id);
CREATE INDEX idx_match_feedback_grant ON match_feedback(grant_source_id);

ALTER TABLE match_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select" ON match_feedback FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "feedback_insert" ON match_feedback FOR INSERT WITH CHECK (org_id IN (SELECT public.user_org_ids()));
