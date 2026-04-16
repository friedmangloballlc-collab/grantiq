-- Compliance calendar: tracks recurring deadlines that orgs must meet
-- to stay grant-eligible. Auto-generated from org profile data.

CREATE TABLE IF NOT EXISTS compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'sam_renewal', '990_filing', 'state_annual_report', 'insurance_renewal',
    'charitable_registration', 'good_standing', 'ein_verification',
    'audit_due', 'board_meeting', 'coi_renewal', 'uei_renewal', 'custom'
  )),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  reminder_days INTEGER[] DEFAULT '{30, 14, 7}',
  recurrence TEXT CHECK (recurrence IN ('annual', 'quarterly', 'monthly', 'one_time')) DEFAULT 'annual',
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due_soon', 'overdue', 'completed', 'dismissed')),
  completed_at TIMESTAMPTZ,
  auto_generated BOOLEAN DEFAULT true,
  risk_if_missed TEXT,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_events_org ON compliance_events(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_events_due ON compliance_events(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_events_status ON compliance_events(status);

-- Grant portfolio: tracks post-award grant management
CREATE TABLE IF NOT EXISTS grant_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_name TEXT NOT NULL,
  funder_name TEXT NOT NULL,
  award_amount NUMERIC,
  award_date DATE,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated', 'pending')),
  grant_type TEXT,
  cfda_number TEXT,
  grant_number TEXT,
  total_spent NUMERIC DEFAULT 0,
  remaining_budget NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES grant_portfolio(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('quarterly', 'annual', 'final', 'interim', 'financial', 'narrative', 'custom')),
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due_soon', 'overdue', 'submitted', 'approved')),
  submitted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grant_portfolio_org ON grant_portfolio(org_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_reports_due ON portfolio_reports(due_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_reports_portfolio ON portfolio_reports(portfolio_id);

-- RLS
ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org compliance events"
  ON compliance_events FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can manage own org portfolio"
  ON grant_portfolio FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can manage own org reports"
  ON portfolio_reports FOR ALL
  USING (portfolio_id IN (
    SELECT id FROM grant_portfolio WHERE org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid() AND status = 'active'
    )
  ));

-- Permissions
GRANT ALL ON compliance_events TO service_role;
GRANT ALL ON compliance_events TO authenticated;
GRANT ALL ON grant_portfolio TO service_role;
GRANT ALL ON grant_portfolio TO authenticated;
GRANT ALL ON portfolio_reports TO service_role;
GRANT ALL ON portfolio_reports TO authenticated;
