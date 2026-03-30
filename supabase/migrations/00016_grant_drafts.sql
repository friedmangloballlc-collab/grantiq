-- grantiq/supabase/migrations/00016_grant_drafts.sql

-- RFP/NOFO analysis results
CREATE TABLE grant_rfp_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID REFERENCES grant_sources(id),
  pipeline_id UUID REFERENCES grant_pipeline(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf_upload', 'text_paste', 'url')),
  source_file_url TEXT,              -- Supabase Storage path for PDFs
  source_text TEXT,                   -- Raw extracted/pasted text
  parsed_data JSONB NOT NULL,         -- Validated RFP parse output (sections, limits, criteria)
  funder_analysis JSONB,              -- Funder alignment notes
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Main draft tracking table
CREATE TABLE grant_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rfp_analysis_id UUID NOT NULL REFERENCES grant_rfp_analyses(id),
  grant_source_id UUID REFERENCES grant_sources(id),
  pipeline_id UUID REFERENCES grant_pipeline(id),
  tier TEXT NOT NULL CHECK (tier IN ('tier1_ai_only', 'tier2_ai_audit', 'tier3_expert', 'full_confidence')),
  grant_type TEXT NOT NULL CHECK (grant_type IN ('state_foundation', 'federal', 'sbir_sttr')),
  status TEXT NOT NULL CHECK (status IN (
    'rfp_parsed', 'funder_analyzed', 'drafting', 'draft_complete',
    'coherence_checked', 'auditing', 'audit_complete',
    'rewriting', 'rewrite_complete', 'review_simulated',
    'compliance_checked', 'completed', 'failed'
  )) DEFAULT 'rfp_parsed',
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  current_step TEXT,                  -- Human-readable status message
  sections JSONB DEFAULT '{}',        -- Generated draft sections keyed by section_type
  coherence_report JSONB,             -- Coherence check output
  audit_report JSONB,                 -- AI auditor scoring + improvements
  rewritten_sections JSONB,           -- Post-audit rewritten sections
  review_simulation JSONB,            -- 3-reviewer simulation output
  compliance_report JSONB,            -- Two-pass compliance output
  stripe_payment_intent_id TEXT,      -- Stripe payment tracking
  price_cents INTEGER NOT NULL,       -- What they paid (0 for Full Confidence)
  is_full_confidence BOOLEAN DEFAULT false,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Full Confidence Package tracking
CREATE TABLE full_confidence_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_draft_id UUID NOT NULL REFERENCES grant_drafts(id),
  grant_source_id UUID REFERENCES grant_sources(id),
  readiness_score REAL NOT NULL,
  match_score REAL NOT NULL,
  grant_amount_min NUMERIC NOT NULL,
  subscription_tier TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'submitted', 'won', 'lost', 'expired')) DEFAULT 'active',
  outcome_amount NUMERIC,
  success_fee_pct REAL DEFAULT 10.0,
  success_fee_invoice_id UUID REFERENCES success_fee_invoices(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE grant_rfp_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE full_confidence_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other org-scoped tables)
CREATE POLICY "rfp_analyses_select" ON grant_rfp_analyses FOR SELECT
  USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "rfp_analyses_insert" ON grant_rfp_analyses FOR INSERT
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));

CREATE POLICY "grant_drafts_select" ON grant_drafts FOR SELECT
  USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "grant_drafts_insert" ON grant_drafts FOR INSERT
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "grant_drafts_update" ON grant_drafts FOR UPDATE
  USING (org_id IN (SELECT public.user_org_ids()));

CREATE POLICY "full_confidence_select" ON full_confidence_applications FOR SELECT
  USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "full_confidence_insert" ON full_confidence_applications FOR INSERT
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "full_confidence_update" ON full_confidence_applications FOR UPDATE
  USING (org_id IN (SELECT public.user_org_ids()));

-- Indexes
CREATE INDEX idx_grant_drafts_org_status ON grant_drafts(org_id, status);
CREATE INDEX idx_grant_drafts_user ON grant_drafts(user_id);
CREATE INDEX idx_rfp_analyses_org ON grant_rfp_analyses(org_id);
CREATE INDEX idx_full_confidence_org_status ON full_confidence_applications(org_id, status);
