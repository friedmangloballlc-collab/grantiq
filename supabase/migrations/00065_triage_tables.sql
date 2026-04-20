-- 00065_triage_tables.sql
--
-- Two service-ops tables that back Agent #10 (Sentry Triage) and
-- Agent #12 (Support Triage). Both agents classify inputs and write
-- rows here so the team gets a single searchable queue.

-- 1. Error events triaged by Agent #10. Rows can come from Sentry
--    webhooks, our own internal error-pipeline, or manual triage.
CREATE TABLE IF NOT EXISTS error_triage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable identifier from the upstream source (Sentry issue id,
  -- log correlation id, etc.). Unique so re-submitting the same
  -- error doesn't create duplicate triage rows.
  external_id TEXT,
  source TEXT NOT NULL CHECK (source IN ('sentry', 'internal', 'manual')),
  severity TEXT NOT NULL CHECK (severity IN (
    'critical', 'high', 'medium', 'low', 'noise'
  )),
  category TEXT NOT NULL CHECK (category IN (
    'auth_failure', 'payment_failure', 'data_corruption',
    'third_party_outage', 'rate_limit', 'rls_violation',
    'ai_failure', 'ui_crash', 'performance', 'unknown'
  )),
  title TEXT NOT NULL,
  error_message TEXT,
  stack_preview TEXT,
  -- Structured fields the triager extracted from the event
  likely_cause TEXT,
  suggested_action TEXT,
  affected_users_estimate INTEGER,
  -- Routing decision — who should see this?
  assignee_team TEXT CHECK (assignee_team IN (
    'engineering', 'billing', 'data', 'security', 'none'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'acknowledged', 'resolved', 'suppressed'
  )),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID,
  triage_confidence NUMERIC CHECK (triage_confidence BETWEEN 0 AND 1),
  triage_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_error_triage_external
  ON error_triage_events(external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_triage_severity
  ON error_triage_events(severity, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_triage_org
  ON error_triage_events(org_id);

-- 2. Support tickets triaged by Agent #12. Rows come from inbound
--    email, Intercom, or an in-app "contact us" form.
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN (
    'email', 'intercom', 'in_app', 'manual'
  )),
  sender_email TEXT,
  sender_name TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  -- Agent #12 classification
  intent TEXT NOT NULL CHECK (intent IN (
    'billing', 'bug_report', 'feature_request', 'onboarding',
    'refund', 'cancellation', 'account_access', 'grant_question',
    'compliment', 'other'
  )),
  urgency TEXT NOT NULL CHECK (urgency IN ('urgent', 'high', 'normal', 'low')),
  sentiment TEXT CHECK (sentiment IN ('angry', 'frustrated', 'neutral', 'happy')),
  suggested_response TEXT,
  assignee_team TEXT CHECK (assignee_team IN (
    'support', 'billing', 'engineering', 'success', 'none'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'assigned', 'responded', 'resolved', 'spam'
  )),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID,
  triage_confidence NUMERIC CHECK (triage_confidence BETWEEN 0 AND 1),
  triage_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_external
  ON support_tickets(external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_urgency
  ON support_tickets(urgency, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_intent
  ON support_tickets(intent);

-- RLS: both tables are admin-only. No policies for authenticated users.
ALTER TABLE error_triage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

GRANT ALL ON error_triage_events TO service_role;
GRANT ALL ON support_tickets TO service_role;
