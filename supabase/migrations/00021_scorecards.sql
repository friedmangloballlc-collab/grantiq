CREATE TABLE grant_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id),
  criteria JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low', 'do_not_pursue')),
  auto_disqualified BOOLEAN DEFAULT false,
  disqualify_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, grant_source_id)
);

ALTER TABLE grant_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scorecards_select" ON grant_scorecards FOR SELECT
  USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "scorecards_insert" ON grant_scorecards FOR INSERT
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "scorecards_update" ON grant_scorecards FOR UPDATE
  USING (org_id IN (SELECT public.user_org_ids()));

CREATE INDEX idx_grant_scorecards_org ON grant_scorecards(org_id);
CREATE INDEX idx_grant_scorecards_priority ON grant_scorecards(org_id, priority);
