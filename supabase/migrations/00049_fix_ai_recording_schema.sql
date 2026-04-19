-- Migration 00049: Fix ai_recording schema (BD-1)
--
-- Background: src/lib/ai/call.ts:127 has been inserting into ai_generations with
-- column names {action_type, model} that don't match the schema's
-- {generation_type, model_used}, AND missing the NOT NULL user_id column.
-- The error has been silently swallowed by Promise.allSettled (call.ts:141)
-- and logger.error since launch. Live DB inventory (2026-04-19) confirmed
-- ai_generations is empty as a result — every insert silently failed.
--
-- This migration widens the CHECK constraints on both ai_generations and ai_usage
-- to accept the full set of actionType values currently emitted by the codebase
-- (verified via grep against src/), keeping the DB enum in sync with the
-- TypeScript AI_ACTION_TYPES const in src/lib/ai/usage.ts.
--
-- The actual call.ts insert fix (correct column names + user_id) ships in the
-- same PR as a code change — see Phase 4 of Unit 1.
--
-- No backfill needed:
--   - ai_generations is empty (Q2 confirmed)
--   - ai_usage has 1 row with action_type='readiness_score' which is in the new list
--
-- Pattern: DROP CONSTRAINT IF EXISTS / ADD CONSTRAINT (matches 00031_add_growth_tier.sql idiom).

-- ai_generations.generation_type: widen from 6 to 10 values
ALTER TABLE ai_generations DROP CONSTRAINT IF EXISTS ai_generations_generation_type_check;
ALTER TABLE ai_generations ADD CONSTRAINT ai_generations_generation_type_check
  CHECK (generation_type IN (
    'match',
    'readiness_score',
    'roadmap',
    'eligibility_status',
    'draft',
    'audit',
    'rewrite',
    'loi',
    'budget',
    'chat'
  ));

-- ai_usage.action_type: same 10-value list
ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_action_type_check;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_action_type_check
  CHECK (action_type IN (
    'match',
    'readiness_score',
    'roadmap',
    'eligibility_status',
    'draft',
    'audit',
    'rewrite',
    'loi',
    'budget',
    'chat'
  ));
