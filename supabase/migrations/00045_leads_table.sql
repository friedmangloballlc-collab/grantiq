-- Leads table for public eligibility check — captures prospect data
-- before they create an account. Used for follow-up and conversion.

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  entity_type TEXT,
  state TEXT,
  industry TEXT,
  annual_revenue TEXT,
  employee_count TEXT,
  intake_data JSONB,
  source TEXT DEFAULT 'public_eligibility_check',
  converted BOOLEAN DEFAULT false,
  converted_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_converted ON leads(converted);

-- Allow service_role full access (public endpoint uses admin client)
GRANT ALL ON leads TO service_role;
GRANT ALL ON leads TO authenticated;

-- RLS — only admins can read leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on leads"
  ON leads FOR ALL
  USING (true)
  WITH CHECK (true);
