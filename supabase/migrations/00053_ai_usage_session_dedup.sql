-- Migration 00053: Session-based ai_usage dedup (Unit 5 / R13)
--
-- Today's recordUsage inserts one ai_usage row per call. For multi-call
-- sessions like draft-generator (6-8 section calls per drafting run),
-- this means a single drafting session counts as 6-8 against the user's
-- monthly draft cap. Pro tier (10 ai_drafts/mo) would exhaust at the
-- second draft, not the tenth.
--
-- Fix: when callers supply a session_id, recordUsage upserts on
-- (org_id, action_type, session_id) so the entire session counts as one
-- row regardless of how many sub-calls it makes. For draft-generator,
-- session_id = grant_application_id.
--
-- Implementation notes:
--   - tier_limits has no UNIQUE constraint; we use a partial unique
--     index here on ai_usage so the constraint only applies when
--     session_id is non-null. Calls without session_id keep the legacy
--     one-row-per-call shape.
--   - Supabase JS client's upsert API doesn't support partial-index
--     conflict targets, so the actual upsert lives in a Postgres RPC
--     function defined here. recordUsage in usage.ts calls .rpc() when
--     session_id is supplied; falls back to plain INSERT otherwise.
--   - The DO UPDATE sums tokens/cost — recordUsage MUST be called with
--     per-call deltas, never running totals.

-- 1. Add the column. Idempotent.
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS session_id TEXT;

-- 2. Partial unique index. Existing rows with NULL session_id are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_session_unique
  ON ai_usage (org_id, action_type, session_id)
  WHERE session_id IS NOT NULL;

-- 3. RPC function for the increment-on-conflict upsert.
--    Supabase JS upsert can't target a partial unique index, so we
--    expose the operation as an RPC the JS client calls via .rpc().
CREATE OR REPLACE FUNCTION record_ai_usage_session(
  p_org_id           UUID,
  p_action_type      TEXT,
  p_session_id       TEXT,
  p_tokens_input     INT,
  p_tokens_output    INT,
  p_cost_cents       INT,
  p_billing_period   DATE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage (
    org_id, action_type, session_id,
    tokens_input, tokens_output, estimated_cost_cents, billing_period
  )
  VALUES (
    p_org_id, p_action_type, p_session_id,
    p_tokens_input, p_tokens_output, p_cost_cents, p_billing_period
  )
  ON CONFLICT (org_id, action_type, session_id) WHERE session_id IS NOT NULL
  DO UPDATE SET
    tokens_input         = ai_usage.tokens_input + EXCLUDED.tokens_input,
    tokens_output        = ai_usage.tokens_output + EXCLUDED.tokens_output,
    estimated_cost_cents = ai_usage.estimated_cost_cents + EXCLUDED.estimated_cost_cents;
END;
$$ LANGUAGE plpgsql;
