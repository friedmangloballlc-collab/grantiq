-- Directory of all known grant sources — tracks WHERE grants come from,
-- whether they're automated or manual, and deduplication status.
-- This is NOT the grants themselves — it's the registry of sources to monitor.

CREATE TABLE IF NOT EXISTS grant_source_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'federal_agency', 'state_agency', 'community_foundation', 'national_foundation',
    'corporate_foundation', 'faith_based', 'disease_specific', 'competition',
    'accelerator', 'fiscal_sponsor', 'international', 'research', 'fellowship',
    'sbir_sttr', 'disaster', 'in_kind', 'other'
  )),
  subcategory TEXT,
  website TEXT,
  annual_budget TEXT,
  focus_areas TEXT[],
  key_programs TEXT[],
  geographic_focus TEXT,
  grant_range TEXT,
  eligibility_notes TEXT,
  accepts_unsolicited BOOLEAN,
  has_api BOOLEAN DEFAULT false,
  api_url TEXT,
  ingestion_status TEXT CHECK (ingestion_status IN (
    'automated', 'manual_seed', 'planned', 'not_started', 'not_applicable'
  )) DEFAULT 'not_started',
  last_checked TIMESTAMPTZ,
  priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, organization)
);

CREATE INDEX IF NOT EXISTS idx_gsd_category ON grant_source_directory(category);
CREATE INDEX IF NOT EXISTS idx_gsd_ingestion ON grant_source_directory(ingestion_status);
CREATE INDEX IF NOT EXISTS idx_gsd_priority ON grant_source_directory(priority);
