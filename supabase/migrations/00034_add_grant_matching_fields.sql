-- Add grant matching profile fields to org_profiles
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS naics_primary TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS funding_amount_min NUMERIC;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS funding_amount_max NUMERIC;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS federal_certifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS sam_registration_status TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS match_funds_capacity TEXT;

-- Indexes for grant matching queries
CREATE INDEX IF NOT EXISTS idx_org_profiles_naics ON org_profiles(naics_primary);
CREATE INDEX IF NOT EXISTS idx_org_profiles_sam ON org_profiles(sam_registration_status);
CREATE INDEX IF NOT EXISTS idx_org_profiles_certs ON org_profiles USING gin(federal_certifications);
