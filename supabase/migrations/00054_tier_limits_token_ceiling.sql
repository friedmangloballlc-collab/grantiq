-- Migration 00054: Add monthly_token_ceiling to tier_limits (Unit 6 / R13a)
--
-- The existing checkUsageLimit gate counts ROWS per action_type per month.
-- That stops a user from making too many DRAFTS/MATCHES/CHATS, but it does
-- NOT stop a single user from burning unbounded TOKENS. A 100x larger org
-- profile or a runaway retry loop passes the row gate but eats real
-- Anthropic credits in proportion to tokens, not row count.
--
-- This migration adds a token-budget backstop. checkTokenCeiling sums
-- tokens_input + tokens_output for the current billing period and rejects
-- when spent + pre-flight estimate exceeds monthly_token_ceiling.
--
-- Nullable = unlimited (matches the existing monthly_limit convention).
-- Per-tier values seeded as a starting point; business can UPDATE later.

ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS monthly_token_ceiling BIGINT;

-- Seed initial ceilings per tier (placeholder values; business adjusts).
-- The numbers below assume average ~3K tokens per AI action and target
-- a per-tier blended cost ceiling that matches the row-based ladder:
--   free:       50K tokens/mo  (matches free row limits — 1-10 calls)
--   starter:    500K tokens/mo
--   pro:        2M tokens/mo
--   growth:     10M tokens/mo
--   enterprise: NULL (unlimited)
--
-- We UPDATE existing rows; if a (tier, feature) row doesn't exist for a tier,
-- the UPDATE is a no-op. The token ceiling applies per-tier across ALL
-- features collectively, so seeding it on any one row per tier is enough —
-- but for clarity we set it on the ai_drafts row of each tier (the one we
-- know exists for all paid tiers).

UPDATE tier_limits SET monthly_token_ceiling = 50000        WHERE tier = 'free'       AND feature = 'ai_drafts';
UPDATE tier_limits SET monthly_token_ceiling = 500000       WHERE tier = 'starter'    AND feature = 'ai_drafts';
UPDATE tier_limits SET monthly_token_ceiling = 2000000      WHERE tier = 'pro'        AND feature = 'ai_drafts';
UPDATE tier_limits SET monthly_token_ceiling = 10000000     WHERE tier = 'growth'     AND feature = 'ai_drafts';
-- enterprise: leave NULL = unlimited (matches the rest of enterprise's AI features)
