ALTER TABLE grant_sources ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(funder_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_grant_sources_fts ON grant_sources USING GIN (search_vector);

CREATE OR REPLACE FUNCTION search_grants(
  query TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_amount_min NUMERIC DEFAULT NULL,
  p_amount_max NUMERIC DEFAULT NULL,
  p_limit INT DEFAULT 24,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(id UUID, name TEXT, funder_name TEXT, source_type TEXT, amount_min NUMERIC, amount_max NUMERIC, deadline TIMESTAMPTZ, description TEXT, category TEXT, states TEXT[], url TEXT, rank REAL)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT gs.id, gs.name, gs.funder_name, gs.source_type, gs.amount_min, gs.amount_max, gs.deadline, gs.description, gs.category, gs.states, gs.url,
    CASE WHEN query IS NOT NULL AND query != ''
      THEN ts_rank(gs.search_vector, websearch_to_tsquery('english', query))
      ELSE 1.0
    END AS rank
  FROM grant_sources gs
  WHERE gs.is_active = true
    AND (query IS NULL OR query = '' OR gs.search_vector @@ websearch_to_tsquery('english', query))
    AND (p_type IS NULL OR gs.source_type = p_type)
    AND (p_state IS NULL OR p_state = ANY(gs.states) OR gs.states = '{}')
    AND (p_amount_min IS NULL OR gs.amount_max >= p_amount_min)
    AND (p_amount_max IS NULL OR gs.amount_min <= p_amount_max)
  ORDER BY rank DESC, gs.name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
