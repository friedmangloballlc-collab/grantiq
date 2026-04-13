-- Add purpose-focused embedding to grant_sources
-- Existing description_embedding captures "what the grant is about" (general)
-- purpose_embedding captures "what activities/outcomes this funds" (specific)
-- Used together for multi-facet matching

ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS purpose_embedding vector(1536);

-- Also add a profile embedding to organizations for the eligibility facet
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS profile_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_grant_purpose_embedding ON grant_sources
  USING ivfflat (purpose_embedding vector_cosine_ops) WITH (lists = 100);
