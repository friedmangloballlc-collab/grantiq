-- Add 'growth' tier to database CHECK constraints
-- The app uses 5 tiers: free, starter, pro, growth, enterprise

-- subscriptions table
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('free', 'starter', 'pro', 'growth', 'enterprise'));

-- tier_limits table
ALTER TABLE tier_limits DROP CONSTRAINT IF EXISTS tier_limits_tier_check;
ALTER TABLE tier_limits ADD CONSTRAINT tier_limits_tier_check
  CHECK (tier IN ('free', 'starter', 'pro', 'growth', 'enterprise'));

-- Seed growth tier limits
INSERT INTO tier_limits (tier, action_type, monthly_limit)
VALUES
  ('growth', 'match', 999),
  ('growth', 'readiness', 999),
  ('growth', 'strategy', 20),
  ('growth', 'writing', 5),
  ('growth', 'chat', 9999)
ON CONFLICT DO NOTHING;
