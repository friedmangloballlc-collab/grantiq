CREATE TABLE funder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funder_name TEXT NOT NULL,
  ein TEXT,
  funder_type TEXT NOT NULL CHECK (funder_type IN ('federal', 'state', 'foundation', 'corporate', 'community')),
  focus_areas TEXT[] DEFAULT '{}',
  avg_award_size NUMERIC,
  typical_award_range_min NUMERIC,
  typical_award_range_max NUMERIC,
  total_annual_giving NUMERIC,
  geographic_preference JSONB,
  org_size_preference TEXT,
  new_applicant_friendly BOOLEAN,
  acceptance_rate REAL,
  embedding vector(1536),
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE grant_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  funder_name TEXT NOT NULL,
  funder_id UUID REFERENCES funder_profiles(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('federal', 'state', 'foundation', 'corporate')),
  category TEXT,
  amount_min NUMERIC,
  amount_max NUMERIC,
  deadline TIMESTAMPTZ,
  deadline_type TEXT CHECK (deadline_type IN ('loi', 'full_application', 'rolling', 'quarterly')),
  recurrence TEXT CHECK (recurrence IN ('one_time', 'annual', 'rolling')) DEFAULT 'one_time',
  recurrence_rule TEXT,
  eligibility_types TEXT[] DEFAULT '{}',
  states TEXT[] DEFAULT '{}',
  description TEXT,
  description_embedding vector(1536),
  raw_text TEXT,
  url TEXT,
  cfda_number TEXT,
  award_ceiling NUMERIC,
  award_floor NUMERIC,
  estimated_awards_count INTEGER,
  cost_sharing_required BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('forecasted', 'open', 'closed', 'archived')) DEFAULT 'open',
  data_source TEXT CHECK (data_source IN ('seed', 'api_crawl', 'manual')) DEFAULT 'seed',
  last_verified TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE grant_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN (
    '501c3', 'budget_threshold', 'geographic', 'years_operating',
    'audit_required', 'matching_funds', 'sam_registration'
  )),
  requirement_value JSONB NOT NULL,
  is_hard_requirement BOOLEAN DEFAULT true
);

CREATE TABLE grant_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  deadline_type TEXT NOT NULL CHECK (deadline_type IN ('loi', 'full_application', 'rolling', 'quarterly')),
  deadline_date TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  reminder_sent BOOLEAN DEFAULT false
);
