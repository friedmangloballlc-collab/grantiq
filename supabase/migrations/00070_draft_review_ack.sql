-- 00070_draft_review_ack.sql
--
-- Audit trail for "I have reviewed this AI-generated draft" acknowledgments.
-- Closes P1-4 from the legal audit: AI output liability allocation.
-- Current /terms §3 puts review responsibility on the user. Without a
-- logged acknowledgment at the moment the user exports a draft, the
-- disclaimer sits in the Terms unseen — which a court may find
-- unconscionable against an unsophisticated nonprofit ED customer.
--
-- With a click-through at the export point + this audit log, we have
-- admissible evidence that the customer affirmed review responsibility
-- before submitting the AI draft to any funder.

CREATE TABLE IF NOT EXISTS draft_review_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES grant_drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Which export action triggered the acknowledgment:
  -- 'copy_all' | 'copy_section' | 'download_docx' | 'download_pdf' | 'mark_submitted'
  action TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_ip TEXT,
  acknowledged_user_agent TEXT,
  -- Hash of the draft content at the moment of acknowledgment. Proves
  -- WHICH version the user reviewed — important if the draft is edited
  -- later and the user claims they only reviewed an earlier version.
  content_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_draft_review_ack_draft
  ON draft_review_acknowledgments (draft_id, acknowledged_at DESC);

CREATE INDEX IF NOT EXISTS idx_draft_review_ack_user
  ON draft_review_acknowledgments (user_id, acknowledged_at DESC);

ALTER TABLE draft_review_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Users can see their own acknowledgments (via admin client join).
-- Only service_role writes. Append-only by design — no UPDATE or
-- DELETE policy.
GRANT SELECT, INSERT ON draft_review_acknowledgments TO service_role;
