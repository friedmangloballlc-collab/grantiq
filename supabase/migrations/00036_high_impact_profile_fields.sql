-- High-impact profile fields for grant matching accuracy
-- Project description, beneficiaries, and outcomes/impact metrics

ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS project_description TEXT;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS target_beneficiaries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS impact_metrics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS geographic_areas_served TEXT[] DEFAULT '{}';
ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS project_duration TEXT;
