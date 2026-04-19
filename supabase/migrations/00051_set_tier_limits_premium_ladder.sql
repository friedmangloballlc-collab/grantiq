-- Migration 00051: Set premium tier ladder for AI features
--
-- Establishes a coherent pricing ladder for the 4 enforced AI features
-- (ai_drafts, grantie_messages, matching_runs, readiness_scores) across
-- all 5 tiers. Each tier is meaningfully greater than the previous one
-- so upgrades have real value; enterprise is uncapped (NULL = unlimited).
--
-- Background: pre-this-migration state had several issues:
--   - Pro tier ai_drafts was 2 (lower than starter and free's intended floor)
--   - Enterprise was capped at 5 ai_drafts and 3 ai_logic_models (should be unlimited)
--   - Growth tier (post-00050) had 5/999/999/9999 — generous on most, low on drafts
-- This migration normalizes all four features to a consistent 3-5x-per-tier pattern.
--
-- All UPDATEs are idempotent — if a (tier, feature) row doesn't exist, the
-- UPDATE is a no-op rather than an error. Rows that DO exist are confirmed
-- live via Supabase Studio queries on 2026-04-19.

-- starter: 3 / 100 / 10 / 5
UPDATE tier_limits SET monthly_limit = 3   WHERE tier = 'starter' AND feature = 'ai_drafts';
UPDATE tier_limits SET monthly_limit = 100 WHERE tier = 'starter' AND feature = 'grantie_messages';
UPDATE tier_limits SET monthly_limit = 10  WHERE tier = 'starter' AND feature = 'matching_runs';
UPDATE tier_limits SET monthly_limit = 5   WHERE tier = 'starter' AND feature = 'readiness_scores';

-- pro: 10 / 500 / 50 / 20
UPDATE tier_limits SET monthly_limit = 10  WHERE tier = 'pro' AND feature = 'ai_drafts';
UPDATE tier_limits SET monthly_limit = 500 WHERE tier = 'pro' AND feature = 'grantie_messages';
UPDATE tier_limits SET monthly_limit = 50  WHERE tier = 'pro' AND feature = 'matching_runs';
UPDATE tier_limits SET monthly_limit = 20  WHERE tier = 'pro' AND feature = 'readiness_scores';

-- growth: 25 / 2500 / 200 / 100 (canonical names already set by migration 00050)
UPDATE tier_limits SET monthly_limit = 25   WHERE tier = 'growth' AND feature = 'ai_drafts';
UPDATE tier_limits SET monthly_limit = 2500 WHERE tier = 'growth' AND feature = 'grantie_messages';
UPDATE tier_limits SET monthly_limit = 200  WHERE tier = 'growth' AND feature = 'matching_runs';
UPDATE tier_limits SET monthly_limit = 100  WHERE tier = 'growth' AND feature = 'readiness_scores';

-- enterprise: unlimited (NULL) on all 4 AI features
UPDATE tier_limits SET monthly_limit = NULL
  WHERE tier = 'enterprise'
  AND feature IN ('ai_drafts', 'grantie_messages', 'matching_runs', 'readiness_scores');

-- Free tier left unchanged (already correct: 0 / 10 / 1 / 1).
