-- Expand service_orders to support new service types

ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_service_type_check;
ALTER TABLE service_orders ADD CONSTRAINT service_orders_service_type_check
  CHECK (service_type IN (
    'eligibility_status',
    'readiness_diagnostic',
    'starter_grant_package',
    'nonprofit_formation',
    'sam_registration',
    'policy_drafting',
    'application_review',
    'logic_model',
    'audit_prep',
    'certification'
  ));

-- Grant-Ready Certification tracking
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL DEFAULT 'grant_ready',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 year'),
  service_order_id UUID REFERENCES service_orders(id),
  badge_url TEXT,
  verification_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certifications_org ON certifications(org_id);
CREATE INDEX IF NOT EXISTS idx_certifications_code ON certifications(verification_code);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org certifications" ON certifications FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active'));

GRANT ALL ON certifications TO service_role;
GRANT ALL ON certifications TO authenticated;
