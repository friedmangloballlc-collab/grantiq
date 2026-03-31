-- HNSW index for fast vector similarity search at scale
-- Only create if description_embedding column has data
DO $$
BEGIN
  IF (SELECT count(*) FROM grant_sources WHERE description_embedding IS NOT NULL) > 100 THEN
    CREATE INDEX IF NOT EXISTS idx_grant_sources_hnsw
      ON grant_sources
      USING hnsw (description_embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    RAISE NOTICE 'HNSW index created';
  ELSE
    RAISE NOTICE 'Skipping HNSW index — not enough embeddings yet';
  END IF;
END $$;
