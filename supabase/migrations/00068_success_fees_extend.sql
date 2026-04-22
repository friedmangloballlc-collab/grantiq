-- 00068_success_fees_extend.sql
--
-- Extend the existing success_fee_invoices table (from 00007) so it
-- aligns with our current tier names and lifecycle. The original
-- CHECK on fee_tier listed legacy service-tier names (discovery,
-- ai_assisted, full_service, full_confidence); our actual tiers
-- today are free / starter / pro / growth / enterprise. We also
-- need columns to track the Stripe invoice + when funds were
-- received (fee due 30 days after funds receipt, per /terms §5).

-- 1. Drop the old CHECK constraint (Postgres stores it with a
--    generated name; find and drop it)
DO $$
DECLARE
  c_name TEXT;
BEGIN
  SELECT con.conname INTO c_name
  FROM pg_constraint con
  JOIN pg_class cls ON cls.oid = con.conrelid
  WHERE cls.relname = 'success_fee_invoices'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%fee_tier%';
  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE success_fee_invoices DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

-- 2. Add the new CHECK aligned to real subscription tiers + 'custom'
--    for bespoke enterprise arrangements.
ALTER TABLE success_fee_invoices
  ADD CONSTRAINT success_fee_invoices_fee_tier_check
  CHECK (fee_tier IN ('free', 'starter', 'pro', 'growth', 'enterprise', 'custom'));

-- 3. Columns to track real invoice lifecycle
ALTER TABLE success_fee_invoices
  ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS funds_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS funder_name TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  -- Who reported it — null means admin-logged manually.
  ADD COLUMN IF NOT EXISTS reported_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS reported_by_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 4. Indexes for the admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_success_fee_invoices_status
  ON success_fee_invoices (status, due_at);

CREATE INDEX IF NOT EXISTS idx_success_fee_invoices_org_created
  ON success_fee_invoices (org_id, created_at DESC);

-- 5. Trigger to keep updated_at fresh on any UPDATE
CREATE OR REPLACE FUNCTION tg_success_fee_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS success_fee_invoices_updated_at ON success_fee_invoices;
CREATE TRIGGER success_fee_invoices_updated_at
  BEFORE UPDATE ON success_fee_invoices
  FOR EACH ROW
  EXECUTE FUNCTION tg_success_fee_invoices_updated_at();

-- 6. RLS: admin-only. Service role writes from API routes. Orgs
--    cannot self-service read/edit their own invoices — prevents
--    a customer from deleting a row to dodge the fee.
ALTER TABLE success_fee_invoices ENABLE ROW LEVEL SECURITY;
GRANT ALL ON success_fee_invoices TO service_role;
