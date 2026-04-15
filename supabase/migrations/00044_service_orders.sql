-- Service orders for one-time fee services:
-- 1. Grant Eligibility Status
-- 2. Grant Eligibility & Readiness Diagnostic

CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  service_type TEXT NOT NULL CHECK (service_type IN ('eligibility_status', 'readiness_diagnostic')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'generating', 'completed', 'failed')),
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER,
  report_data JSONB,
  scores JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for fast lookups by org
CREATE INDEX IF NOT EXISTS idx_service_orders_org_id ON service_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_user_id ON service_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);

-- RLS
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's service orders"
  ON service_orders FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can insert service orders for their org"
  ON service_orders FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can update their own service orders"
  ON service_orders FOR UPDATE
  USING (user_id = auth.uid());
