CREATE TABLE IF NOT EXISTS grant_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  field TEXT NOT NULL CHECK (field IN ('description', 'eligibility', 'amount', 'deadline', 'url', 'requirements', 'other')),
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE grant_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corrections_insert" ON grant_corrections FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "corrections_select_own" ON grant_corrections FOR SELECT USING (user_id = auth.uid());
