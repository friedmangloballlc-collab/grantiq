-- 00057_fix_rls_user_org_ids_schema.sql
--
-- P0 FIX: every user-auth INSERT/UPDATE on org-scoped tables has been
-- silently failing since launch.
--
-- Root cause: migration 00010_rls_policies.sql tried to create
-- `auth.user_org_ids()` but Supabase restricts the `auth` schema for
-- user-defined functions in managed environments. The function
-- creation silently failed; the policies got created referencing a
-- function that doesn't exist; every policy expression errors at
-- evaluation time → every insert is rejected by RLS.
--
-- Migration 00032 already created the correct `public.user_org_ids()`
-- but never updated the policies to use it. This migration completes
-- that fix by dropping the broken policies and recreating them
-- against `public.user_org_ids()`.
--
-- After this runs, the following tables become writable from user-auth
-- clients again (createServerSupabaseClient + browser client):
--   organizations, org_members, org_profiles, org_capabilities,
--   grant_matches, grant_match_feedback, funding_roadmaps,
--   readiness_scores, grant_pipeline, grant_outcomes,
--   org_grant_history, narrative_segments, ai_generations,
--   document_vault, ai_usage, user_events, search_queries,
--   notifications_log, subscriptions, success_fee_invoices,
--   lead_intents, match_cache, outcome_check_ins
--
-- Service-role clients (createAdminClient) were never affected since
-- they bypass RLS — that's why some tables have data (admin-written)
-- and others (user-written like grant_pipeline) are empty.

-- Step 0: Verify public.user_org_ids exists. If not, fail loudly so we
-- don't end up with policies pointing to a function that also doesn't
-- exist. Migration 00032 should have created it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'user_org_ids'
  ) THEN
    RAISE EXCEPTION 'public.user_org_ids() not found — apply migration 00032 first';
  END IF;
END $$;

-- Step 1: Drop and recreate organizations + org_members policies
-- (these were defined explicitly in 00010, not via the macro loop)
DROP POLICY IF EXISTS "org_select" ON organizations;
DROP POLICY IF EXISTS "org_insert" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;
CREATE POLICY "org_select" ON organizations FOR SELECT USING (id IN (SELECT public.user_org_ids()));
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (id IN (SELECT public.user_org_ids()));

DROP POLICY IF EXISTS "members_select" ON org_members;
DROP POLICY IF EXISTS "members_insert" ON org_members;
DROP POLICY IF EXISTS "members_update" ON org_members;
DROP POLICY IF EXISTS "members_delete" ON org_members;
CREATE POLICY "members_select" ON org_members FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "members_insert" ON org_members FOR INSERT WITH CHECK (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "members_update" ON org_members FOR UPDATE USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "members_delete" ON org_members FOR DELETE USING (org_id IN (SELECT public.user_org_ids()));

-- Step 2: Recreate the macro-loop policies for all standard org-scoped
-- tables. Same loop body as the original 00010 macro, but pointing to
-- public.user_org_ids() instead of auth.user_org_ids().
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'org_profiles', 'org_capabilities', 'grant_matches', 'grant_match_feedback',
    'funding_roadmaps', 'readiness_scores', 'grant_pipeline', 'grant_outcomes',
    'org_grant_history', 'narrative_segments', 'ai_generations', 'document_vault',
    'ai_usage', 'user_events', 'search_queries', 'notifications_log',
    'subscriptions', 'success_fee_invoices', 'lead_intents', 'match_cache', 'outcome_check_ins'
  ])
  LOOP
    -- Skip tables that don't actually exist in this database (defense
    -- against env drift). pg_class lookup is cheap.
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl AND c.relkind = 'r'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I', tbl, tbl);
      EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (org_id IN (SELECT public.user_org_ids()))', tbl, tbl);
      EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (org_id IN (SELECT public.user_org_ids()))', tbl, tbl);
      EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE USING (org_id IN (SELECT public.user_org_ids()))', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- Step 3: Verify by re-running the function from a fresh search_path.
-- This is just smoke — it confirms the fix landed at migration time
-- (won't catch RLS context issues which only trigger under a real auth.uid()).
DO $$
BEGIN
  PERFORM public.user_org_ids();
END $$;
