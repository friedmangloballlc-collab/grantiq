CREATE OR REPLACE FUNCTION get_dashboard_stats(p_org_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_matches', (SELECT count(*) FROM grant_matches WHERE org_id = p_org_id),
    'active_pipeline', (SELECT count(*) FROM grant_pipeline WHERE org_id = p_org_id AND stage NOT IN ('awarded','declined')),
    'pipeline_value', (SELECT coalesce(sum(gs.amount_max),0) FROM grant_pipeline gp JOIN grant_sources gs ON gs.id = gp.grant_source_id WHERE gp.org_id = p_org_id AND gp.stage NOT IN ('awarded','declined')),
    'win_count', (SELECT count(*) FROM grant_outcomes go JOIN grant_pipeline gp ON go.pipeline_id = gp.id WHERE gp.org_id = p_org_id AND go.outcome = 'awarded'),
    'total_outcomes', (SELECT count(*) FROM grant_outcomes go JOIN grant_pipeline gp ON go.pipeline_id = gp.id WHERE gp.org_id = p_org_id)
  ) INTO result;
  RETURN result;
END;
$$;
