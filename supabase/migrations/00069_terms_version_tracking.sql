-- 00069_terms_version_tracking.sql
--
-- Track exactly which version of the Terms of Service each user
-- accepted. Critical for enforceability: if a customer later
-- disputes a charge or a clause, we can produce the exact text
-- they clicked "I agree" on, with a timestamp and version hash.
--
-- Under clickwrap case law (Specht v. Netscape, 306 F.3d 17; Meyer
-- v. Uber, 868 F.3d 66; Register.com v. Verio, 356 F.3d 393),
-- enforceability turns on (1) reasonable notice of terms, (2)
-- opportunity to review, (3) unambiguous manifestation of assent.
-- Storing terms_version + terms_accepted_at proves all three at the
-- moment of acceptance.

-- Add the columns if they do not already exist. terms_accepted_at
-- may have been created manually in the dashboard earlier.
ALTER TABLE org_members
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  -- IP + UA captured at the moment of acceptance. Useful if we
  -- ever need to demonstrate the user was the person who clicked.
  ADD COLUMN IF NOT EXISTS terms_accepted_ip TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_user_agent TEXT;

-- Index for audit queries ("show me every member who accepted
-- version X before date Y")
CREATE INDEX IF NOT EXISTS idx_org_members_terms_version
  ON org_members (terms_version, terms_accepted_at DESC);

-- Audit log for subsequent re-acceptances when Terms are updated.
-- The first acceptance lives on org_members; any subsequent
-- acceptances (e.g., after a material change notice) get a new row
-- here so the full history is queryable.
CREATE TABLE IF NOT EXISTS terms_acceptance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_ip TEXT,
  accepted_user_agent TEXT,
  -- Which surface triggered the re-acceptance: signup | forced_reaccept | enterprise_contract | etc.
  source TEXT NOT NULL DEFAULT 'signup'
);

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user
  ON terms_acceptance_log (user_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_version
  ON terms_acceptance_log (terms_version);

ALTER TABLE terms_acceptance_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON terms_acceptance_log TO service_role;
