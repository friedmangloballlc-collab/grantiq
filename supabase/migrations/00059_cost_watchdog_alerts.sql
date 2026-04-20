-- 00059_cost_watchdog_alerts.sql
--
-- Cost Watchdog (docs/plans/2026-04-20-001). Hourly worker reads
-- ai_generations + ai_usage, detects per-org spend anomalies, posts
-- to Slack. This table stores every alert so the same anomaly in
-- the same hour doesn't fire 24 times, and so the admin dashboard
-- has a review queue.
--
-- dedup_key pattern: "{alert_type}:{org_id}:{window_start_hour_epoch}"
-- Same event in same hour = same dedup_key = no re-alert.

CREATE TABLE IF NOT EXISTS cost_watchdog_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'org_spend_spike',
    'token_runaway',
    'zero_activity',
    'absolute_threshold',
    'cache_hit_regression'
  )),
  org_id UUID,  -- nullable for whole-app alerts like zero_activity
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  dedup_key TEXT NOT NULL,
  slack_sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_watchdog_alerts_dedup_active
  ON cost_watchdog_alerts(dedup_key)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cost_watchdog_alerts_org_recent
  ON cost_watchdog_alerts(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_watchdog_alerts_unresolved
  ON cost_watchdog_alerts(severity, created_at DESC)
  WHERE resolved_at IS NULL;

GRANT ALL ON cost_watchdog_alerts TO service_role;
