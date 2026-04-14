-- RPC function for profile-facet vector recall
-- Searches purpose_embedding column (grant eligibility profile)
-- against org profile embedding

CREATE OR REPLACE FUNCTION vector_recall_grants_profile(
  query_embedding TEXT,
  match_count INT DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  funder_name TEXT,
  source_type TEXT,
  category TEXT,
  eligibility_types TEXT[],
  states TEXT[],
  amount_min NUMERIC,
  amount_max NUMERIC,
  deadline TIMESTAMPTZ,
  deadline_type TEXT,
  description TEXT,
  status TEXT,
  url TEXT,
  cfda_number TEXT,
  cost_sharing_required BOOLEAN,
  funder_id UUID,
  similarity REAL
)
LANGUAGE sql STABLE
AS $$
  SELECT
    gs.id, gs.name, gs.funder_name, gs.source_type, gs.category,
    gs.eligibility_types, gs.states, gs.amount_min, gs.amount_max,
    gs.deadline, gs.deadline_type, gs.description, gs.status,
    gs.url, gs.cfda_number, gs.cost_sharing_required, gs.funder_id,
    (1 - (gs.purpose_embedding <=> query_embedding::vector))::REAL AS similarity
  FROM grant_sources gs
  WHERE gs.is_active = true
    AND gs.status IN ('open', 'forecasted')
    AND gs.purpose_embedding IS NOT NULL
  ORDER BY gs.purpose_embedding <=> query_embedding::vector ASC
  LIMIT match_count;
$$;
