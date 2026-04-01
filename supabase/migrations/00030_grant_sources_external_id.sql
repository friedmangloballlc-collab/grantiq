-- Add external_id column to grant_sources for deduplication with external APIs (Grants.gov)
ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_grant_sources_external_id ON grant_sources (external_id) WHERE external_id IS NOT NULL;
