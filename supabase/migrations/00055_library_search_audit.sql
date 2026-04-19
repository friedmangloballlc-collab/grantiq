-- Migration 00055: Library search audit log for per-day rate limiting
--
-- Defends against scraping of the grant inventory by authenticated users
-- (especially free trial accounts created by competitors). The
-- /api/library/search route already had per-tier RESULT-COUNT limits;
-- this migration adds per-day SEARCH-COUNT limits on top.
--
-- Per-tier daily search caps enforced in the route handler:
--   starter:    50 searches/day
--   pro:        200 searches/day
--   growth:     1000 searches/day
--   enterprise: unlimited
-- Free tier is already blocked from the route entirely (separate gate).
--
-- The table is intentionally minimal — we don't store the search query
-- (privacy + storage), just the timestamp + org_id. A daily aggregate
-- cron can prune rows older than 7 days to keep the table small.

CREATE TABLE IF NOT EXISTS library_search_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  searched_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for the count-per-day query the route handler runs on every search
CREATE INDEX IF NOT EXISTS library_search_audit_org_searched_at_idx
  ON library_search_audit (org_id, searched_at DESC);
