CREATE TABLE narrative_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  segment_type TEXT NOT NULL CHECK (segment_type IN (
    'mission_statement', 'needs_assessment', 'methodology', 'evaluation_plan',
    'organizational_capacity', 'budget_justification', 'dei_statement'
  )),
  text TEXT NOT NULL,
  embedding vector(1536),
  quality_score REAL DEFAULT 0,
  source_grant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  grant_application_id UUID,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('draft', 'audit', 'rewrite', 'loi', 'budget', 'chat')),
  model_used TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  estimated_cost_cents INTEGER DEFAULT 0,
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE document_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'board_list', 'org_chart', 'audit', 'form_990', 'resume',
    'support_letter', 'dei_policy', 'logic_model'
  )),
  file_url TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  file_size INTEGER,
  sha256_hash TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ,
  staleness_score REAL DEFAULT 0
);

CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('match', 'roadmap', 'readiness_score', 'draft', 'audit', 'chat')),
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  billing_period DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
