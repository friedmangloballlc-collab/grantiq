-- 00066_newsletter_subscribers.sql
--
-- Newsletter opt-in capture. Backs the "weekly grant roundup" lead
-- magnet surface on the marketing site. Capture-only for now —
-- actual send infrastructure ships to Beehiiv/ConvertKit once the
-- list clears 50 subs and we have content cadence.
--
-- Double opt-in: row is created on /api/newsletter/subscribe with a
-- confirmation_token and confirmed_at = NULL. User clicks the link
-- in their inbox → /newsletter/confirmed?token=... → confirmed_at
-- gets set. Only confirmed subscribers are valid for sends.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  -- Free-text source tag: "home_footer", "resources_page", "blog_inline", etc.
  source TEXT NOT NULL DEFAULT 'unknown',
  -- Opaque token for double opt-in confirmation + one-click unsubscribe.
  -- UUID v4 so it's unguessable without being crypto overkill.
  confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  -- NULL until the user clicks the confirmation link.
  confirmed_at TIMESTAMPTZ,
  -- NULL unless the user unsubscribed. A row with both confirmed_at
  -- and unsubscribed_at set is former-active-now-opted-out.
  unsubscribed_at TIMESTAMPTZ,
  -- UA/IP fingerprint for spam attribution if we get abused.
  signup_ip TEXT,
  signup_user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email uniqueness is enforced partially: multiple rows for the same
-- email only make sense if the prior rows were unsubscribed. We
-- handle resubscribe at the application layer by updating the
-- existing row rather than inserting a new one, so a plain unique
-- index on email is fine and prevents dup-lead noise.
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_email
  ON newsletter_subscribers (LOWER(email));

-- Token lookup needs to be fast — both confirmation and unsubscribe
-- routes hit this index on every request.
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_token
  ON newsletter_subscribers (confirmation_token);

-- For "how many confirmed subs do we have?" dashboards.
CREATE INDEX IF NOT EXISTS idx_newsletter_confirmed
  ON newsletter_subscribers (confirmed_at)
  WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL;

-- RLS: admin-only. Public subscribe/confirm/unsubscribe all go through
-- service_role via our API routes, never through the anon client.
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

GRANT ALL ON newsletter_subscribers TO service_role;
