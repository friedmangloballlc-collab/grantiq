-- 00017_referrals.sql
-- Referral tracking table for GrantIQ growth engine

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referrer_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_user_id UUID,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'signed_up', 'converted', 'credit_applied')) DEFAULT 'pending',
  credit_amount_cents INTEGER DEFAULT 5000,
  credit_applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  converted_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_code ON referrals (code);
CREATE INDEX idx_referrals_referrer ON referrals (referrer_user_id);
CREATE INDEX idx_referrals_referred ON referrals (referred_user_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select" ON referrals FOR SELECT
  USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "referrals_insert" ON referrals FOR INSERT
  WITH CHECK (referrer_user_id = auth.uid());

CREATE POLICY "referrals_update" ON referrals FOR UPDATE
  USING (referrer_user_id = auth.uid());
