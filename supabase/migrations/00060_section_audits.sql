-- 00060_section_audits.sql
--
-- RFP Hallucination Auditor (docs/plans/2026-04-20-002). Every AI-
-- generated draft section gets audited: claims extracted, each
-- checked against RFP + funder context + org profile, ungrounded
-- claims flagged. This table is the audit trail operators can show
-- funders if challenged.

CREATE TABLE IF NOT EXISTS section_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES grant_drafts(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_type TEXT,
  claims_total INTEGER NOT NULL CHECK (claims_total >= 0),
  claims_grounded INTEGER NOT NULL CHECK (claims_grounded >= 0),
  claims_ungrounded INTEGER NOT NULL CHECK (claims_ungrounded >= 0),
  verdict TEXT NOT NULL CHECK (verdict IN ('clean', 'flagged', 'blocked', 'unaudited')),
  claims_detail JSONB NOT NULL DEFAULT '[]',
    -- Array<{claim_text, status, source_quote|null, missing_source|null, is_hard_fact}>
  audited_by TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached_input_tokens INTEGER,
  cost_cents INTEGER,
  resolved_by_user BOOLEAN DEFAULT false NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_section_audits_draft
  ON section_audits(draft_id);
CREATE INDEX IF NOT EXISTS idx_section_audits_verdict_pending
  ON section_audits(verdict, created_at DESC)
  WHERE verdict IN ('flagged', 'blocked') AND resolved_at IS NULL;

ALTER TABLE section_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "section_audits_select" ON section_audits
  FOR SELECT USING (
    draft_id IN (
      SELECT id FROM grant_drafts
      WHERE org_id IN (SELECT public.user_org_ids())
    )
  );

GRANT ALL ON section_audits TO service_role;
