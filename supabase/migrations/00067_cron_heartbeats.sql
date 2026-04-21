-- 00067_cron_heartbeats.sql
--
-- Observability for Vercel scheduled crons. Each cron route writes a
-- row on every run (success or failure). Admin dashboard queries this
-- table to show last-run time + a red flag if any cron has gone
-- silent for more than 25 hours.
--
-- This exists because crawl-sources silently stopped firing on
-- 2026-04-12 and we only caught it 9 days later via a manual SQL
-- query. A permanent fix needs visible heartbeat tracking, not just
-- tribal knowledge about which crons should be running.
--
-- We intentionally don't use a generic audit_log table: heartbeats
-- are high-volume append-only writes and deserve their own narrow
-- surface with a dedicated index on (cron_name, started_at DESC).

CREATE TABLE IF NOT EXISTS cron_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Cron name matching the /api/cron/<name> route segment.
  cron_name TEXT NOT NULL,
  -- outcome: 'ok' for successful completion, 'error' for thrown
  -- exceptions or non-2xx returns. 'partial' for runs that did
  -- some work but hit one or more item-level errors (we still
  -- consider the cron alive in this case).
  outcome TEXT NOT NULL CHECK (outcome IN ('ok', 'error', 'partial')),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER NOT NULL,
  -- Arbitrary JSON summary the cron returns (grants_added,
  -- sources_crawled, etc.). Lets the admin dashboard show
  -- per-run stats without a separate metrics pipeline.
  summary JSONB,
  -- Truncated error message when outcome='error'. Intentionally
  -- not the full stack — we want the table to stay small and
  -- the real stacks live in Vercel/Sentry.
  error_message TEXT
);

-- Primary index: "latest heartbeat for cron X" is the hot query.
-- Used by the admin card + the stale-alert check.
CREATE INDEX IF NOT EXISTS idx_cron_heartbeats_name_time
  ON cron_heartbeats (cron_name, started_at DESC);

-- RLS: admin-only. service_role writes from the cron routes;
-- admin dashboard reads via service_role in server components.
ALTER TABLE cron_heartbeats ENABLE ROW LEVEL SECURITY;
GRANT ALL ON cron_heartbeats TO service_role;

-- Retention: keep 30 days. A simple cron can DELETE older rows,
-- or this can be handled manually — it's just a timeseries log.
-- With ~10 crons × 1 run/day, 30 days = ~300 rows. Tiny.
