-- Track ingestion progress for ProPublica 990-PF pipeline
-- Allows the cron to pick up where it left off (one state per run)

CREATE TABLE IF NOT EXISTS ingestion_progress (
  source TEXT PRIMARY KEY,
  state_index INTEGER DEFAULT 0,
  page_index INTEGER DEFAULT 0,
  total_processed INTEGER DEFAULT 0,
  last_run TIMESTAMPTZ DEFAULT now()
);

GRANT ALL ON ingestion_progress TO service_role;
GRANT ALL ON ingestion_progress TO authenticated;

-- Add EIN as unique constraint on funder_profiles for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'funder_profiles_ein_unique'
  ) THEN
    ALTER TABLE funder_profiles ADD CONSTRAINT funder_profiles_ein_unique UNIQUE (ein);
  END IF;
END
$$;

-- Add index on grant_sources for dedup checks
CREATE INDEX IF NOT EXISTS idx_grant_sources_funder_name_source ON grant_sources(funder_name, source_type, data_source);
