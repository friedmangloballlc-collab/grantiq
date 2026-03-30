-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'nonprofit_501c3', 'nonprofit_501c4', 'nonprofit_501c6', 'nonprofit_other',
    'llc', 'corporation', 'sole_prop', 'partnership', 'other'
  )),
  ein_encrypted JSONB,
  state TEXT,
  city TEXT,
  founded_year INTEGER,
  annual_budget NUMERIC,
  employee_count INTEGER,
  mission_statement TEXT,
  mission_embedding vector(1536),
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Organization members
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) DEFAULT 'viewer',
  status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'deactivated')) DEFAULT 'invited',
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

-- Org profiles (qualitative/AI-extracted data)
CREATE TABLE org_profiles (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  population_served TEXT[] DEFAULT '{}',
  program_areas TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  grant_history_level TEXT CHECK (grant_history_level IN ('none', 'beginner', 'intermediate', 'experienced')),
  outcomes_tracking BOOLEAN DEFAULT false,
  voice_profile JSONB,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Org capabilities (structured readiness — single source of truth)
CREATE TABLE org_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  has_501c3 BOOLEAN DEFAULT false,
  has_ein BOOLEAN DEFAULT false,
  has_sam_registration BOOLEAN DEFAULT false,
  has_grants_gov BOOLEAN DEFAULT false,
  has_audit BOOLEAN DEFAULT false,
  has_fiscal_sponsor BOOLEAN DEFAULT false,
  years_operating INTEGER DEFAULT 0,
  annual_budget NUMERIC,
  staff_count INTEGER DEFAULT 0,
  has_grant_writer BOOLEAN DEFAULT false,
  prior_federal_grants INTEGER DEFAULT 0,
  prior_foundation_grants INTEGER DEFAULT 0,
  sam_gov_status TEXT CHECK (sam_gov_status IN ('pending', 'active', 'expired', 'none')) DEFAULT 'none',
  grants_gov_status TEXT CHECK (grants_gov_status IN ('registered', 'not_registered')) DEFAULT 'not_registered',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
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
CREATE TABLE grant_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  match_score REAL NOT NULL DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  match_reasons JSONB DEFAULT '{}',
  missing_requirements TEXT[] DEFAULT '{}',
  win_probability TEXT CHECK (win_probability IN ('low', 'moderate', 'high', 'very_high')),
  difficulty_rating TEXT CHECK (difficulty_rating IN ('easy', 'moderate', 'hard', 'very_hard')),
  recommended_quarter TEXT,
  model_version TEXT,
  embedding_similarity REAL,
  last_computed TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE grant_match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES grant_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('saved', 'dismissed', 'applied', 'irrelevant', 'too_competitive', 'wrong_category')),
  reason_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE funding_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  recommended_grants JSONB DEFAULT '[]',
  strategy_notes TEXT,
  total_potential_amount NUMERIC DEFAULT 0,
  capacity_notes TEXT,
  risk_assessment TEXT,
  generated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  criteria JSONB NOT NULL DEFAULT '{}',
  overall_score REAL NOT NULL DEFAULT 0,
  gaps TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  scored_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE TABLE grant_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id),
  stage TEXT NOT NULL CHECK (stage IN ('researching', 'preparing', 'writing', 'submitted', 'awarded', 'declined')) DEFAULT 'researching',
  deadline TIMESTAMPTZ,
  assigned_to UUID,
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
  user_id UUID NOT NULL,
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
CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'view_grant', 'click_apply', 'download_rfp', 'bookmark',
    'share', 'search_query', 'filter_change'
  )),
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  embedding vector(1536),
  filters_applied JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  results_clicked UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  digest_frequency TEXT CHECK (digest_frequency IN ('daily', 'weekly', 'biweekly', 'off')) DEFAULT 'weekly',
  alert_new_matches_above_score REAL DEFAULT 80,
  alert_deadline_days_before INTEGER DEFAULT 14,
  alert_pipeline_stale_days INTEGER DEFAULT 7,
  preferred_channels TEXT[] DEFAULT '{email}',
  quiet_hours JSONB DEFAULT '{}'
);

CREATE TABLE notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'digest', 'deadline_alert', 'new_match', 'pipeline_reminder', 'outcome_request'
  )),
  channel TEXT NOT NULL,
  content_snapshot JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  grants_included UUID[] DEFAULT '{}'
);
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')) DEFAULT 'free',
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')) DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  is_launch_pricing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE success_fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES grant_pipeline(id),
  grant_name TEXT NOT NULL,
  amount_awarded NUMERIC NOT NULL,
  fee_percentage REAL NOT NULL,
  fee_amount NUMERIC NOT NULL,
  fee_tier TEXT NOT NULL CHECK (fee_tier IN ('discovery', 'ai_assisted', 'full_service', 'full_confidence')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'invoiced', 'paid', 'waived')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  paid_at TIMESTAMPTZ
);

CREATE TABLE lead_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID REFERENCES grant_sources(id),
  intent_type TEXT NOT NULL CHECK (intent_type IN ('consultant_help', 'ai_assist', 'diy')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE tier_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),
  feature TEXT NOT NULL,
  monthly_limit INTEGER,  -- NULL = unlimited
  per_request_limit INTEGER
);

CREATE TABLE outcome_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES grant_pipeline(id),
  grant_name TEXT NOT NULL,
  expected_outcome_date TIMESTAMPTZ,
  check_in_number INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response TEXT CHECK (response IN ('won', 'lost', 'pending', 'no_response'))
);
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE match_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  org_profile_hash TEXT NOT NULL,
  grant_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  match_score REAL NOT NULL,
  match_reasoning TEXT,
  vector_similarity REAL,
  ai_score REAL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(org_id, grant_id, org_profile_hash)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID,
  org_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'MEDIUM', 'HIGH', 'CRITICAL')),
  metadata JSONB DEFAULT '{}',
  ip_address INET
);

CREATE TABLE processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Postgres function for safe job polling with SKIP LOCKED
CREATE OR REPLACE FUNCTION poll_next_job(p_worker_id TEXT)
RETURNS SETOF job_queue
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE job_queue
  SET status = 'processing',
      locked_by = p_worker_id,
      locked_at = NOW(),
      attempts = attempts + 1
  WHERE id = (
    SELECT id FROM job_queue
    WHERE status = 'pending' AND scheduled_for <= NOW()
    ORDER BY priority DESC, scheduled_for ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$;
CREATE TABLE crawl_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'rss', 'scrape', 'spreadsheet', 'manual')),
  base_url TEXT,
  config JSONB DEFAULT '{}',
  crawl_frequency_hours INTEGER DEFAULT 24,
  last_crawled_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  grants_discovered_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE raw_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_source_id UUID NOT NULL REFERENCES crawl_sources(id),
  external_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  ingested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  grant_source_id UUID REFERENCES grant_sources(id)
);

CREATE TABLE crawl_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES crawl_sources(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  grants_found INTEGER DEFAULT 0,
  grants_new INTEGER DEFAULT 0,
  grants_updated INTEGER DEFAULT 0,
  grants_expired INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('grant', 'org_profile', 'funder', 'search_query')),
  entity_id UUID NOT NULL,
  model_version TEXT NOT NULL,
  embedding vector(1536),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ
);
-- Helper: get current user's org IDs
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid() AND status = 'active';
$$;

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON organizations FOR SELECT USING (id IN (SELECT public.user_org_ids()));
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (id IN (SELECT public.user_org_ids()));

-- Org Members
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select" ON org_members FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "members_insert" ON org_members FOR INSERT WITH CHECK (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "members_update" ON org_members FOR UPDATE USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "members_delete" ON org_members FOR DELETE USING (org_id IN (SELECT public.user_org_ids()));

-- Macro: apply standard org RLS to all org-scoped tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'org_profiles', 'org_capabilities', 'grant_matches',
    'funding_roadmaps', 'readiness_scores', 'grant_pipeline',
    'org_grant_history', 'narrative_segments', 'ai_generations', 'document_vault',
    'ai_usage', 'user_events', 'search_queries', 'notifications_log',
    'subscriptions', 'success_fee_invoices', 'lead_intents', 'match_cache', 'outcome_check_ins'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (org_id IN (SELECT public.user_org_ids()))', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (org_id IN (SELECT public.user_org_ids()))', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE USING (org_id IN (SELECT public.user_org_ids()))', tbl, tbl);
  END LOOP;
END $$;

-- grant_match_feedback: user-scoped (no org_id column)
ALTER TABLE grant_match_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gmf_select" ON grant_match_feedback FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "gmf_insert" ON grant_match_feedback FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "gmf_update" ON grant_match_feedback FOR UPDATE USING (user_id = auth.uid());

-- grant_outcomes: scoped via pipeline (no org_id column)
ALTER TABLE grant_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "go_select" ON grant_outcomes FOR SELECT USING (
  pipeline_id IN (SELECT id FROM grant_pipeline WHERE org_id IN (SELECT public.user_org_ids()))
);
CREATE POLICY "go_insert" ON grant_outcomes FOR INSERT WITH CHECK (
  pipeline_id IN (SELECT id FROM grant_pipeline WHERE org_id IN (SELECT public.user_org_ids()))
);
CREATE POLICY "go_update" ON grant_outcomes FOR UPDATE USING (
  pipeline_id IN (SELECT id FROM grant_pipeline WHERE org_id IN (SELECT public.user_org_ids()))
);

-- notification_preferences is user-scoped not org-scoped
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_prefs_select" ON notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_prefs_insert" ON notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_prefs_update" ON notification_preferences FOR UPDATE USING (user_id = auth.uid());

-- Audit logs: append-only
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select" ON audit_logs FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));
-- pgvector indexes (will be effective after data is loaded)
-- Note: IVFFlat requires training data. These will be recreated after seeding.
-- CREATE INDEX idx_grant_sources_embedding ON grant_sources
--   USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);

-- Standard indexes
CREATE INDEX idx_grant_sources_active ON grant_sources (is_active, status, deadline);
CREATE INDEX idx_grant_sources_type ON grant_sources (source_type);
CREATE INDEX idx_grant_sources_category ON grant_sources (category);

-- Job queue polling
CREATE INDEX idx_job_queue_poll ON job_queue (priority DESC, scheduled_for ASC)
  WHERE status = 'pending';
CREATE INDEX idx_job_queue_stale ON job_queue (locked_at)
  WHERE status = 'processing';

-- Match cache
CREATE INDEX idx_match_cache_org ON match_cache (org_id, org_profile_hash, match_score DESC);

-- Org members
CREATE INDEX idx_org_members_user ON org_members (user_id, status);
CREATE INDEX idx_org_members_org ON org_members (org_id, status);

-- Pipeline
CREATE INDEX idx_pipeline_org ON grant_pipeline (org_id, stage);

-- AI usage
CREATE INDEX idx_ai_usage_billing ON ai_usage (org_id, billing_period, action_type);

-- Audit logs
CREATE INDEX idx_audit_logs_org_time ON audit_logs (org_id, timestamp DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs (severity) WHERE severity IN ('HIGH', 'CRITICAL');

-- Subscriptions
CREATE INDEX idx_subscriptions_org ON subscriptions (org_id, status);

-- Crawl logs
CREATE INDEX idx_crawl_logs_source ON crawl_logs (source_id, created_at DESC);
INSERT INTO tier_limits (tier, feature, monthly_limit, per_request_limit) VALUES
  -- Free tier
  ('free', 'matching_runs', 1, NULL),
  ('free', 'readiness_scores', 1, NULL),
  ('free', 'ai_drafts', 0, NULL),
  ('free', 'ai_logic_models', 0, NULL),
  ('free', 'pipeline_items', 3, NULL),
  ('free', 'team_members', 1, NULL),
  ('free', 'grantie_messages', 10, NULL),
  -- Starter tier
  ('starter', 'matching_runs', 5, NULL),
  ('starter', 'readiness_scores', 5, NULL),
  ('starter', 'ai_drafts', 0, NULL),
  ('starter', 'ai_logic_models', 0, NULL),
  ('starter', 'pipeline_items', 10, NULL),
  ('starter', 'team_members', 2, NULL),
  ('starter', 'grantie_messages', 100, NULL),
  -- Pro tier
  ('pro', 'matching_runs', NULL, NULL),
  ('pro', 'readiness_scores', NULL, NULL),
  ('pro', 'ai_drafts', 2, NULL),
  ('pro', 'ai_logic_models', 1, NULL),
  ('pro', 'pipeline_items', NULL, NULL),
  ('pro', 'team_members', 5, NULL),
  ('pro', 'grantie_messages', NULL, NULL),
  -- Enterprise tier
  ('enterprise', 'matching_runs', NULL, NULL),
  ('enterprise', 'readiness_scores', NULL, NULL),
  ('enterprise', 'ai_drafts', 5, NULL),
  ('enterprise', 'ai_logic_models', 3, NULL),
  ('enterprise', 'pipeline_items', NULL, NULL),
  ('enterprise', 'team_members', NULL, NULL),
  ('enterprise', 'grantie_messages', NULL, NULL);
