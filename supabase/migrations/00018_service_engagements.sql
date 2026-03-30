-- 00018_service_engagements.sql
-- 12-step consulting service delivery tracker for GrantIQ

CREATE TABLE service_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('readiness_audit', 'strategy_roadmap', 'opportunity_sourcing', 'advisory_subscription', 'state_writing', 'federal_writing', 'nonprofit_formation')),
  package_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 12),
  step_statuses JSONB NOT NULL DEFAULT '{}',
  assigned_advisor TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_service_engagements_org ON service_engagements (org_id);
CREATE INDEX idx_service_engagements_status ON service_engagements (status);

ALTER TABLE service_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engagements_select" ON service_engagements FOR SELECT
  USING (org_id IN (SELECT public.user_org_ids()));

CREATE POLICY "engagements_insert" ON service_engagements FOR INSERT
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));

CREATE POLICY "engagements_update" ON service_engagements FOR UPDATE
  USING (org_id IN (SELECT public.user_org_ids()));
