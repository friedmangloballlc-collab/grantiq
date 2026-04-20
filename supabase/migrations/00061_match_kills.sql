-- 00061_match_kills.sql
--
-- Funder Match Critic (docs/plans/2026-04-20-003). Inline second-opinion
-- filter kills obvious false-positive matches before they render in
-- /matches. Each kill is persisted with reason + confidence so we
-- (a) don't re-critique the same match repeatedly, and (b) collect
-- training signal — especially when users override and save a killed
-- match to their pipeline.

CREATE TABLE IF NOT EXISTS match_kills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  primary_score NUMERIC,
  kill_reason TEXT NOT NULL CHECK (kill_reason IN (
    'geography',
    'org_size_too_big',
    'org_size_too_small',
    'entity_type',
    'mission_mismatch',
    'eligibility_hard_requirement',
    'other'
  )),
  kill_confidence NUMERIC CHECK (kill_confidence BETWEEN 0 AND 1),
  critic_notes TEXT,
  critic_model TEXT NOT NULL,
  overridden_by_user BOOLEAN DEFAULT false NOT NULL,
  overridden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_match_kills_org_recent
  ON match_kills(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_kills_grant
  ON match_kills(grant_source_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_kills_org_grant_unique
  ON match_kills(org_id, grant_source_id);
-- Override signal is valuable training data — index it
CREATE INDEX IF NOT EXISTS idx_match_kills_overrides
  ON match_kills(overridden_at DESC)
  WHERE overridden_by_user = true;

ALTER TABLE match_kills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_kills_select" ON match_kills
  FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));

GRANT ALL ON match_kills TO service_role;
