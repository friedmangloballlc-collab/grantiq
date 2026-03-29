-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'nonprofit_501c3', 'nonprofit_501c4', 'nonprofit_501c6', 'nonprofit_other',
    'llc', 'corporation', 'sole_prop', 'partnership', 'other'
  )),
  ein_encrypted JSONB,
  state TEXT,
  city TEXT,
  founded_year INTEGER,
  annual_budget NUMERIC,
  employee_count INTEGER,
  mission_statement TEXT,
  mission_embedding vector(1536),
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Organization members
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) DEFAULT 'viewer',
  status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'deactivated')) DEFAULT 'invited',
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

-- Org profiles (qualitative/AI-extracted data)
CREATE TABLE org_profiles (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  population_served TEXT[] DEFAULT '{}',
  program_areas TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  grant_history_level TEXT CHECK (grant_history_level IN ('none', 'beginner', 'intermediate', 'experienced')),
  outcomes_tracking BOOLEAN DEFAULT false,
  voice_profile JSONB,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Org capabilities (structured readiness — single source of truth)
CREATE TABLE org_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  has_501c3 BOOLEAN DEFAULT false,
  has_ein BOOLEAN DEFAULT false,
  has_sam_registration BOOLEAN DEFAULT false,
  has_grants_gov BOOLEAN DEFAULT false,
  has_audit BOOLEAN DEFAULT false,
  has_fiscal_sponsor BOOLEAN DEFAULT false,
  years_operating INTEGER DEFAULT 0,
  annual_budget NUMERIC,
  staff_count INTEGER DEFAULT 0,
  has_grant_writer BOOLEAN DEFAULT false,
  prior_federal_grants INTEGER DEFAULT 0,
  prior_foundation_grants INTEGER DEFAULT 0,
  sam_gov_status TEXT CHECK (sam_gov_status IN ('pending', 'active', 'expired', 'none')) DEFAULT 'none',
  grants_gov_status TEXT CHECK (grants_gov_status IN ('registered', 'not_registered')) DEFAULT 'not_registered',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
