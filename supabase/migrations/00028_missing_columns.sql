-- Add missing columns to org_profiles
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS business_stage TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS documents_ready TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS funding_use TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS business_model TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS contact_method TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS interested_in_nonprofit BOOLEAN;

-- Add org_id to grant_outcomes for direct org scoping
ALTER TABLE grant_outcomes ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE grant_outcomes ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE grant_outcomes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE grant_outcomes ADD COLUMN IF NOT EXISTS funder_feedback TEXT;

-- Backfill org_id in grant_outcomes from pipeline
UPDATE grant_outcomes SET org_id = gp.org_id
FROM grant_pipeline gp WHERE grant_outcomes.pipeline_id = gp.id AND grant_outcomes.org_id IS NULL;

-- Add computed_at to grant_matches for cache TTL
ALTER TABLE grant_matches ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE grant_matches ADD COLUMN IF NOT EXISTS profile_hash TEXT;

-- Add profile_hash to readiness_scores for cache
ALTER TABLE readiness_scores ADD COLUMN IF NOT EXISTS profile_hash TEXT;
