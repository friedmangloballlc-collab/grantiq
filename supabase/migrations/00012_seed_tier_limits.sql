INSERT INTO tier_limits (tier, feature, monthly_limit, per_request_limit) VALUES
  -- Free tier
  ('free', 'matching_runs', 1, NULL),
  ('free', 'readiness_scores', 1, NULL),
  ('free', 'ai_drafts', 0, NULL),
  ('free', 'ai_logic_models', 0, NULL),
  ('free', 'pipeline_items', 3, NULL),
  ('free', 'team_members', 1, NULL),
  ('free', 'grantie_messages', 10, NULL),
  -- Starter tier
  ('starter', 'matching_runs', 5, NULL),
  ('starter', 'readiness_scores', 5, NULL),
  ('starter', 'ai_drafts', 0, NULL),
  ('starter', 'ai_logic_models', 0, NULL),
  ('starter', 'pipeline_items', 10, NULL),
  ('starter', 'team_members', 2, NULL),
  ('starter', 'grantie_messages', 100, NULL),
  -- Pro tier
  ('pro', 'matching_runs', NULL, NULL),
  ('pro', 'readiness_scores', NULL, NULL),
  ('pro', 'ai_drafts', 2, NULL),
  ('pro', 'ai_logic_models', 1, NULL),
  ('pro', 'pipeline_items', NULL, NULL),
  ('pro', 'team_members', 5, NULL),
  ('pro', 'grantie_messages', NULL, NULL),
  -- Enterprise tier
  ('enterprise', 'matching_runs', NULL, NULL),
  ('enterprise', 'readiness_scores', NULL, NULL),
  ('enterprise', 'ai_drafts', 5, NULL),
  ('enterprise', 'ai_logic_models', 3, NULL),
  ('enterprise', 'pipeline_items', NULL, NULL),
  ('enterprise', 'team_members', NULL, NULL),
  ('enterprise', 'grantie_messages', NULL, NULL);
