-- Migration 00050: Reconcile tier_limits growth-tier feature names (BD-2)
--
-- Background: Live DB inventory (2026-04-19) revealed that migration
-- 00031_add_growth_tier.sql tried to INSERT into a column named action_type,
-- but the actual column is `feature` (per migration 00007:39). Compounding this:
-- 00031 used `ON CONFLICT DO NOTHING` without a conflict target, but tier_limits
-- has NO unique constraint on (tier, feature) — only `id UUID PRIMARY KEY`.
-- So `ON CONFLICT DO NOTHING` is a no-op there; the INSERT either ran or silently failed.
--
-- The end state observed in production: 5 growth rows exist with `feature`
-- populated (presumably hand-fixed or rerun against a corrected schema), but
-- using non-canonical names ('match', 'readiness', 'writing', 'chat', 'strategy')
-- instead of what src/lib/ai/usage.ts:4-11 ACTION_TO_FEATURE looks up.
-- Effect: checkUsageLimit lookup misses → returns allowed:true, limit:null →
-- growth-tier customers have had UNLIMITED usage on every gated feature since
-- growth tier launched.
--
-- Strategy row (growth, monthly_limit=20): dead. Strategy engine emits
-- actionType='roadmap' which maps to 'matching_runs' feature. Nothing reads
-- the 'strategy' feature row. Confirmed via grep. Safe to DELETE.
--
-- Lower tiers (free, starter, pro, enterprise) confirmed to use canonical
-- feature names — no fix required for them.

-- Fix growth tier feature names to match ACTION_TO_FEATURE in src/lib/ai/usage.ts
UPDATE tier_limits SET feature = 'matching_runs'    WHERE tier = 'growth' AND feature = 'match';
UPDATE tier_limits SET feature = 'readiness_scores' WHERE tier = 'growth' AND feature = 'readiness';
UPDATE tier_limits SET feature = 'ai_drafts'        WHERE tier = 'growth' AND feature = 'writing';
UPDATE tier_limits SET feature = 'grantie_messages' WHERE tier = 'growth' AND feature = 'chat';

-- Delete the dead 'strategy' row — no code reads this feature
DELETE FROM tier_limits WHERE tier = 'growth' AND feature = 'strategy';

-- Note: pro tier already has an ai_drafts row (monthly_limit=2 per Q5b).
-- Earlier draft of this migration tried to INSERT one — removed after verification.

-- FOLLOW-UP (separate migration, not Unit 1 scope):
-- tier_limits should have a UNIQUE (tier, feature) constraint. Its absence is
-- why 00031's ON CONFLICT DO NOTHING was a no-op and why duplicate rows are
-- structurally possible. Adding the constraint requires first verifying no
-- duplicates exist, then a one-line ALTER. Track as a separate hardening task.
