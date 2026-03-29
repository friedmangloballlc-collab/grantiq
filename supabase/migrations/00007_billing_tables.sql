CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')) DEFAULT 'free',
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')) DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  is_launch_pricing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE success_fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES grant_pipeline(id),
  grant_name TEXT NOT NULL,
  amount_awarded NUMERIC NOT NULL,
  fee_percentage REAL NOT NULL,
  fee_amount NUMERIC NOT NULL,
  fee_tier TEXT NOT NULL CHECK (fee_tier IN ('discovery', 'ai_assisted', 'full_service', 'full_confidence')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'invoiced', 'paid', 'waived')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  paid_at TIMESTAMPTZ
);

CREATE TABLE lead_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID REFERENCES grant_sources(id),
  intent_type TEXT NOT NULL CHECK (intent_type IN ('consultant_help', 'ai_assist', 'diy')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE tier_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),
  feature TEXT NOT NULL,
  monthly_limit INTEGER,  -- NULL = unlimited
  per_request_limit INTEGER
);

CREATE TABLE outcome_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES grant_pipeline(id),
  grant_name TEXT NOT NULL,
  expected_outcome_date TIMESTAMPTZ,
  check_in_number INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response TEXT CHECK (response IN ('won', 'lost', 'pending', 'no_response'))
);
