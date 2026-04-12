-- Project fit fields for deeper grant matching
-- Org side: what the org brings (experience, readiness, beneficiaries)
-- Grant side: what the grant requires (TRL, audit, federal experience)

-- ── org_profiles columns ───────────────────────────────────────────────

ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS beneficiaries_served JSONB DEFAULT '[]'::jsonb;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS years_in_operation INT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS past_federal_funding_level TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS technology_readiness_level INT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS audited_financials_available BOOLEAN DEFAULT false;

-- ── org_profiles indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_org_profiles_past_federal ON org_profiles(past_federal_funding_level);
CREATE INDEX IF NOT EXISTS idx_org_profiles_trl ON org_profiles(technology_readiness_level);
CREATE INDEX IF NOT EXISTS idx_org_profiles_audited ON org_profiles(audited_financials_available);
CREATE INDEX IF NOT EXISTS idx_org_profiles_beneficiaries ON org_profiles USING gin(beneficiaries_served);

-- ── grant_sources columns ──────────────────────────────────────────────

ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS required_trl_min INT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS requires_audited_financials BOOLEAN DEFAULT false;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS required_federal_experience TEXT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS target_beneficiaries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS project_keywords TEXT[] DEFAULT '{}';

-- ── grant_sources indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_grants_trl ON grant_sources(required_trl_min);
CREATE INDEX IF NOT EXISTS idx_grants_audited ON grant_sources(requires_audited_financials);
CREATE INDEX IF NOT EXISTS idx_grants_fed_exp ON grant_sources(required_federal_experience);
CREATE INDEX IF NOT EXISTS idx_grants_beneficiaries ON grant_sources USING gin(target_beneficiaries);
CREATE INDEX IF NOT EXISTS idx_grants_project_keywords ON grant_sources USING gin(project_keywords);
