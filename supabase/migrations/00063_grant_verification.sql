-- 00063_grant_verification.sql
--
-- Grant Data Verifier (docs/plans/2026-04-20-005). Nightly worker
-- sweeps every grant_sources row to validate:
--   - Deadline hasn't silently passed
--   - Funder URL still resolves (200 OK)
--   - Funder hasn't dissolved per IRS exempt-org status
--
-- Every check produces an audit row in grant_verification_log so
-- operators can see what the verifier did and, if it misfired,
-- reverse the action with full context.

CREATE TABLE IF NOT EXISTS grant_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  run_id UUID NOT NULL,
  url_status TEXT CHECK (url_status IN (
    'ok', '404', 'paywall', 'timeout', 'skipped', 'no_url'
  )),
  url_final_url TEXT,
  deadline_status TEXT CHECK (deadline_status IN (
    'future', 'passed_one_time', 'passed_rolling', 'no_deadline'
  )),
  funder_status TEXT CHECK (funder_status IN (
    'active', 'revoked', 'not_found', 'lookup_failed', 'skipped'
  )),
  action_taken TEXT NOT NULL CHECK (action_taken IN (
    'no_change', 'archived', 'url_flagged', 'funder_flagged', 'multi_flagged'
  )),
  notes TEXT,
  checked_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_grant_verification_log_grant
  ON grant_verification_log(grant_source_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_grant_verification_log_run
  ON grant_verification_log(run_id);
CREATE INDEX IF NOT EXISTS idx_grant_verification_log_action
  ON grant_verification_log(action_taken, checked_at DESC)
  WHERE action_taken != 'no_change';

-- Extend grant_sources with verifier-related columns.
-- url_status caches the latest HTTP reachability result so /matches
-- can surface broken URLs without re-fetching.
ALTER TABLE grant_sources
  ADD COLUMN IF NOT EXISTS url_status TEXT,
  ADD COLUMN IF NOT EXISTS funder_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_review_flag BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS manual_review_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_grant_sources_manual_review
  ON grant_sources(manual_review_flag) WHERE manual_review_flag = true;

-- No RLS on grant_verification_log — it's admin-only; the worker writes
-- via service-role and admin dashboard reads via the admin client.
-- Matches the existing pattern for other worker-owned audit tables.

GRANT ALL ON grant_verification_log TO service_role;
