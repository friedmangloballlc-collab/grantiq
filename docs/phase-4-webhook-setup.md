# Phase 4 — Sentry + Support Webhook Setup

This document walks through activating the two idle agents (#10 Sentry
Triage, #12 Support Triage). The route handlers, AI triagers, and
database tables are already shipped. This is the operational glue.

**Time estimate:** 30 minutes total (15 each).

---

## Sentry Triage (#10)

### Step 1 — Add `SENTRY_WEBHOOK_SECRET` to Vercel

1. Vercel → grantiq → Settings → Environment Variables → Add New
2. Key: `SENTRY_WEBHOOK_SECRET`
3. Value: paste this fresh secret:
   ```
   29619429c177c345ebc4e3febac888f9f5941ee973e99b840cab96f2fd114e17
   ```
4. Environments: ✅ Production ✅ Preview ✅ Development
5. Save → **Deployments** tab → ⋯ → Redeploy (env var only takes effect on redeploy)

### Step 2 — Configure Sentry to send issues to GrantAQ

1. Sentry dashboard → Settings → Integrations → **Webhooks**
2. Click **Configure** (or Add) on the Webhooks integration
3. Add a new webhook:
   - Webhook URL: `https://grantaq.com/api/triage/sentry`
   - Events: check "Issue Created" and "Issue Resolved"
   - Secret: paste the same value as above (`29619429c177...`)
4. Save

### Step 3 — Verify

1. In Sentry, trigger a test event (Settings → Projects → grantiq → Test Webhook OR throw a test error in the app)
2. Check Supabase:
   ```sql
   SELECT id, source, severity, category, title, status, created_at
   FROM error_triage_events
   ORDER BY created_at DESC
   LIMIT 5;
   ```
3. You should see a fresh row with the test error categorized by Agent #10.

If you see no row, check Vercel function logs at `/api/triage/sentry` for 401 (secret mismatch) or 500 (other error) and Sentry's webhook delivery log for delivery status.

---

## Support Triage (#12)

### Option A — Forward inbound email to a webhook (simplest)

This option uses a service like Cloudflare Email Routing or Resend's inbound email (free tier) to forward `support@grantaq.com` to our triage endpoint as JSON.

#### Step 1 — Add `SUPPORT_WEBHOOK_SECRET` to Vercel

1. Vercel → grantiq → Settings → Environment Variables → Add New
2. Key: `SUPPORT_WEBHOOK_SECRET`
3. Value: paste this fresh secret:
   ```
   bae45669504afe76c7d16c4260f406938baf787f547a9fbea9f4c64c1755c822
   ```
4. Environments: Production + Preview + Development
5. Save → Redeploy

#### Step 2 — Set up email forwarding

If using Resend Inbound (recommended):

1. Resend dashboard → Inbound → Add Domain
2. Verify your DNS records as instructed
3. Set up an inbound route:
   - Match: `support@grantaq.com`
   - Forward to webhook: `https://grantaq.com/api/triage/support`
   - Include header: `Authorization: Bearer bae45669504afe...`
4. Save

If using Cloudflare Email Routing:

1. Cloudflare dashboard → Email → Email Routing
2. Add a Workers route that POSTs to the webhook URL with the Bearer header
3. Reference: https://developers.cloudflare.com/email-routing/email-workers/

### Option B — Intercom integration

If you use Intercom for support:

1. Intercom → Settings → Integrations → Webhooks
2. Add webhook with URL `https://grantaq.com/api/triage/support`
3. Include Authorization header with the secret
4. Subscribe to "conversation.user.created" and "conversation.user.replied" events

### Step 3 — Verify

1. Send a test email to `support@grantaq.com` (or trigger an Intercom event)
2. Check Supabase:
   ```sql
   SELECT id, channel, intent, urgency, sentiment, sender_email,
          subject, status, created_at
   FROM support_tickets
   ORDER BY created_at DESC
   LIMIT 5;
   ```
3. You should see a fresh row classified by Agent #12 with intent and urgency.

---

## What the agents do once wired

### Agent #10 — Sentry Triage

For every error reported by Sentry:
- Categorizes by severity (critical / high / medium / low / noise)
- Categorizes by type (auth_failure / payment_failure / data_corruption / third_party_outage / rate_limit / rls_violation / ai_failure / ui_crash / performance / unknown)
- Identifies likely cause and suggested action
- Routes to assignee team (engineering / billing / data / security / none)
- Estimates affected users
- Writes to `error_triage_events` table

### Agent #12 — Support Triage

For every inbound support message:
- Classifies intent (billing / bug_report / feature_request / onboarding / refund / cancellation / account_access / grant_question / compliment / other)
- Classifies urgency (urgent / high / normal / low)
- Detects sentiment (angry / frustrated / neutral / happy)
- Drafts a suggested response
- Routes to team (support / billing / engineering / success / none)
- Writes to `support_tickets` table

Both agents have admin queue UIs at `/admin/agents` that surface the rows they create.

---

## Security note

Both secrets above were generated specifically for this commit and are now in git history. If you don't apply them within 24 hours, generate fresh ones:

```bash
openssl rand -hex 32
```

Use the fresh value in Vercel env + the Sentry/Resend integration. This keeps the secrets that touch real production traffic out of any commit or screenshot.
