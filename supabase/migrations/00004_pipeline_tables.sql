CREATE TABLE grant_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id),
  stage TEXT NOT NULL CHECK (stage IN ('researching', 'preparing', 'writing', 'submitted', 'awarded', 'declined')) DEFAULT 'researching',
  deadline TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  checklist JSONB DEFAULT '[]',
  stage_history JSONB[] DEFAULT '{}',
  estimated_hours_remaining INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE grant_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES grant_pipeline(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('awarded', 'rejected', 'partial', 'waitlisted', 'withdrawn')),
  amount_awarded NUMERIC,
  feedback_from_funder TEXT,
  outcome_date TIMESTAMPTZ,
  rejection_reasons JSONB DEFAULT '[]'
);

CREATE TABLE org_grant_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_name TEXT NOT NULL,
  funder_name TEXT,
  amount NUMERIC,
  year INTEGER,
  outcome TEXT,
  was_first_time_applicant BOOLEAN DEFAULT false,
  imported_from TEXT CHECK (imported_from IN ('manual', 'csv', 'irs990'))
);
