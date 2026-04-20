-- 00056_grant_drafts_realtime.sql
--
-- Enables Supabase Realtime for the grant_drafts table so the draft
-- viewer page can subscribe to row updates and show live progress
-- (status, current_step, progress_pct) without polling or page refresh.
--
-- Background: the existing notifications_log table is already on the
-- supabase_realtime publication (added via the Supabase UI, not a
-- migration). This migration adds grant_drafts the same way but in
-- code so it survives a fresh-environment rebuild.
--
-- Safe to re-run: ALTER PUBLICATION ... ADD TABLE is idempotent under
-- IF NOT EXISTS-style guards, but Postgres doesn't support that for
-- publications, so we use a DO block to check pg_publication_tables.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'grant_drafts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grant_drafts;
  END IF;
END $$;

-- REPLICA IDENTITY FULL would let UPDATE payloads include all columns
-- (not just changed ones). We don't need it — the client only reads
-- status / current_step / progress_pct, which are the columns the
-- worker writes on each progress tick, so they'll always be present
-- in the change payload.
