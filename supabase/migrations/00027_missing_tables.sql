-- Partner applications (for partner program apply form)
CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  website TEXT,
  audience_size TEXT,
  partner_type TEXT,
  message TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partner referral tracking
CREATE TABLE IF NOT EXISTS partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_slug TEXT NOT NULL,
  referred_user_id UUID,
  referred_org_id UUID,
  event_type TEXT CHECK (event_type IN ('impression', 'signup', 'conversion')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partner_referrals_slug ON partner_referrals(partner_slug);

-- Grant LOIs (Letter of Intent storage)
CREATE TABLE IF NOT EXISTS grant_lois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID REFERENCES grant_sources(id),
  content TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'sent', 'accepted', 'declined')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE grant_lois ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lois_select" ON grant_lois FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "lois_insert" ON grant_lois FOR INSERT WITH CHECK (org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "lois_update" ON grant_lois FOR UPDATE USING (org_id IN (SELECT public.user_org_ids()));
