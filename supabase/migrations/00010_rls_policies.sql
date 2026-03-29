-- Helper: get current user's org IDs
CREATE OR REPLACE FUNCTION auth.user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid() AND status = 'active';
$$;

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON organizations FOR SELECT USING (id IN (SELECT auth.user_org_ids()));
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (id IN (SELECT auth.user_org_ids()));

-- Org Members
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select" ON org_members FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "members_insert" ON org_members FOR INSERT WITH CHECK (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "members_update" ON org_members FOR UPDATE USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "members_delete" ON org_members FOR DELETE USING (org_id IN (SELECT auth.user_org_ids()));

-- Macro: apply standard org RLS to all org-scoped tables
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
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()))', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (org_id IN (SELECT auth.user_org_ids()))', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE USING (org_id IN (SELECT auth.user_org_ids()))', tbl, tbl);
  END LOOP;
END $$;

-- notification_preferences is user-scoped not org-scoped
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_prefs_select" ON notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_prefs_insert" ON notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_prefs_update" ON notification_preferences FOR UPDATE USING (user_id = auth.uid());

-- Audit logs: append-only
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select" ON audit_logs FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
