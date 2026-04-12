-- Capture full grant metadata from all sources (Grants.gov, SAM.gov, XLSX)
-- No data should be lost during ingestion.

-- ── Grants.gov fields ──────────────────────────────────────────────────
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS opportunity_number TEXT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS open_date TIMESTAMPTZ;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS estimated_funding NUMERIC;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS cfda_numbers TEXT[] DEFAULT '{}';
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS applicant_eligibility_types TEXT[] DEFAULT '{}';
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS funding_activity_category TEXT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS competition_id TEXT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS archive_date TIMESTAMPTZ;

-- ── SAM.gov fields ─────────────────────────────────────────────────────
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS naics_code TEXT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS posted_date TIMESTAMPTZ;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS classification_code TEXT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS solicitation_number TEXT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS point_of_contact JSONB;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS set_aside_code TEXT;

-- ── Shared enrichment fields ───────────────────────────────────────────
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS application_process TEXT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS contact_info JSONB;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS geographic_restrictions JSONB;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS requires_sam BOOLEAN DEFAULT false;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS required_certification TEXT;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS match_required_pct NUMERIC;
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS eligible_naics TEXT[] DEFAULT '{}';
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS new_applicant_friendly BOOLEAN;

-- ── Indexes for new matching fields ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_grant_sources_naics ON grant_sources(naics_code);
CREATE INDEX IF NOT EXISTS idx_grant_sources_opp_number ON grant_sources(opportunity_number);
CREATE INDEX IF NOT EXISTS idx_grant_sources_eligible_naics ON grant_sources USING gin(eligible_naics);
CREATE INDEX IF NOT EXISTS idx_grant_sources_set_aside ON grant_sources(set_aside_code);
CREATE INDEX IF NOT EXISTS idx_grant_sources_posted ON grant_sources(posted_date);
