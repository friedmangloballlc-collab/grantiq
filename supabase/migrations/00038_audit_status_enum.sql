-- Replace boolean has_audit with text audit_status enum
-- Values: 'has', 'could_obtain', 'cannot', NULL (unknown)

ALTER TABLE org_capabilities ADD COLUMN IF NOT EXISTS audit_status TEXT;

-- Backfill from existing has_audit boolean
UPDATE org_capabilities SET audit_status = 'has' WHERE has_audit = true AND audit_status IS NULL;
-- has_audit = false is ambiguous (could be "don't have" or "never answered"), leave as NULL
