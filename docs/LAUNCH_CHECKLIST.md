# GrantIQ Launch Test Checklist

Run the whole thing before opening the funnel to real users. Each item
should take <2 min. Check boxes as you go. Anything that fails goes
into `docs/superpowers/specs/launch-bugs.md` with screenshot + repro
before you continue.

**How to use:** one tab per section. Test in a real incognito browser
against `grantaq.com`, NOT localhost. Use a throwaway Gmail + a real
$249 test purchase (refund yourself after).

---

## 0. Pre-flight (10 min)

- [ ] `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` set in Vercel (live, not test)
- [ ] `STRIPE_WEBHOOK_SECRET` set + webhook pointed at `/api/webhooks/stripe`
- [ ] `ANTHROPIC_API_KEY` set in Vercel + Railway (same key both envs)
- [ ] `OPENAI_API_KEY` set in Vercel + Railway
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (NEVER in NEXT_PUBLIC_*)
- [ ] `SENTRY_DSN` set — check Sentry dashboard receives a test event
- [ ] `RESEND_API_KEY` (or whatever email provider) set + domain verified
- [ ] Vercel deploy: latest commit matches `git log -1 origin/master`
- [ ] Railway worker: deploy shows latest commit, logs show "listening"
- [ ] Smoke-test GH Action green on last run

---

## 1. Marketing + Signup (Golden Path)

- [ ] Visit `grantaq.com` incognito — hero loads, no console errors
- [ ] `/pricing` shows correct prices ($249 / $499 / $749 tiers visible)
- [ ] `/tools/readiness-quiz` — complete as guest, score renders
- [ ] `/tools/eligibility-checker` — complete as guest, result renders
- [ ] `/tools/funding-gap` — loads, no crash
- [ ] `/tools/grant-timeline` — loads
- [ ] `/tools/budget-estimator` — loads
- [ ] `/grant-directory` — lists real grants, search works
- [ ] `/blog` — at least one post renders (or redirect is intentional)
- [ ] `/signup` → fill form → email received → click verify link
- [ ] After verify: redirected to `/dashboard` (NOT `/login`)
- [ ] `/dashboard` shows org name, no RLS errors in console

---

## 2. Onboarding → Profile → Readiness

- [ ] Complete org-profile wizard (mission, programs, population, state, budget)
- [ ] Data persists to `organizations` + `org_capabilities`
- [ ] `/dashboard` shows a readiness score number (not "pending")
- [ ] Readiness score breakdown lists specific gaps (not generic)
- [ ] `ai_generations` row written for this call (check Supabase)
- [ ] `ai_usage` row written (check Supabase)

---

## 3. Matches (Agent #3 — Match Critic live)

- [ ] `/matches` shows grants with scores
- [ ] Funder URLs NOT visible on user-facing tile
- [ ] Click a high-score grant → detail view loads
- [ ] `/grants/[id]/evaluate` — no 404, renders scorecard
- [ ] `match_kills` rows exist in Supabase (Stage 2 critic fired for at least one match)
- [ ] Save a match to pipeline — appears in `/pipeline`
- [ ] "Override kill" button works if any match was killed

---

## 4. Pipeline + Stage Transitions

- [ ] `/pipeline` lists saved grants, correct counts per stage
- [ ] Drag item: `identified` → `qualified` — stage updates in DB
- [ ] Transition `qualified` → `in_development` — checklist auto-generates
- [ ] Transition to `submitted` then `pending_decision` — decision timer fires
- [ ] **Trigger `awarded`:** enter award amount, confirm:
  - [ ] `success_fee_invoices` row inserted
  - [ ] `match_feedback` row inserted (user_action='won')
  - [ ] `compliance_events` rows inserted (Agent #4 — Compliance Calendar Builder)
  - [ ] `org_funder_history` row inserted (Agent #5 — Outcome Learner)
  - [ ] `funder_learnings` rows inserted if draft + feedback exist
- [ ] Trigger `declined` on a different item — Outcome Learner still fires
- [ ] Remove a pipeline item — row deleted, no orphans

---

## 5. Writing Pipeline (Biggest Revenue Path)

### 5a. Tier 1 AI-Only ($249 state/foundation)

- [ ] Click "Write application" on a pipeline item
- [ ] Tier selection screen shows $249 / $497 / $997 / Full Confidence
- [ ] Select Tier 1 → Stripe checkout opens → complete with real card
- [ ] Post-checkout: `grant_drafts` row created with `status='rfp_parsed'`
- [ ] Polling shows progress: `drafting` → `draft_complete` → `coherence_checked` → `completed`
- [ ] Draft viewer (`/writing/[id]`) renders all sections
- [ ] **Agent #7 (Hallucination Auditor):** `section_audits` rows exist, one per section
- [ ] **Agent #8 (Quality Scorer):** `draft_quality_scores` row exists with verdict
- [ ] Download as DOCX / PDF — file opens cleanly
- [ ] Stripe dashboard shows the $249 payment
- [ ] Refund yourself in Stripe — refund event processes cleanly

### 5b. Tier 2 AI+Audit — audit_blocked path

- [ ] Purchase Tier 2 on a deliberately weak grant
- [ ] If auditor flags ≥1 hard hallucination → pipeline halts at `audit_blocked`
- [ ] User sees clear "audit found issues" UI (not a spinner forever)
- [ ] "Approve and continue" or equivalent resume path works

### 5c. Tier 3 Expert — queuing works

- [ ] Purchase Tier 3 — draft enters `tier3_expert` queue
- [ ] Admin review UI visible in `/admin` (or wherever)

---

## 6. Settings / Account

- [ ] `/settings` — name, email, timezone save
- [ ] `/settings/billing` — current plan shown, invoice list loads
- [ ] `/settings/team` — invite a teammate, invite email sends, accept flow works
- [ ] `/settings/notifications` — toggles persist
- [ ] `/settings/referrals` — referral code visible, copy works
- [ ] Cancel subscription — confirms, downgrades at period end
- [ ] Reactivate before period end works

---

## 7. Other User-Facing Sections (fast smoke)

- [ ] `/analytics` loads, shows real numbers (not all zeros)
- [ ] `/calendar` loads
- [ ] `/compliance` loads — shows compliance_events rows from an awarded grant
- [ ] `/portfolio-tracker` loads — shows grant_portfolio rows
- [ ] `/roadmap` loads — shows strategic roadmap data
- [ ] `/funders` loads — funder_profiles render, 990 data enrichment visible
- [ ] `/library` loads — document vault browsable
- [ ] `/vault` — upload a PDF, file persists, download works
- [ ] `/clients` — loads (or hidden if not agency tier)
- [ ] `/certified` — loads
- [ ] `/services` — loads, service catalog renders
- [ ] `/grants` — main grant browser, filter + sort work
- [ ] `/upgrade` — loads, tier comparison correct

---

## 8. Admin (you as admin user)

- [ ] `/admin` — dashboard loads, metrics render
- [ ] `/admin/agents` — all 12 agents listed with status badges
- [ ] `/admin/agents` — at least one run record exists per active agent
- [ ] `/admin/users` — user list loads, can impersonate
- [ ] `/admin/leads` — leads list loads
- [ ] `/admin/corrections` — correction queue loads
- [ ] Admin writing-tier bypass works (create draft without paying)
- [ ] Admin can remove pipeline items from any org

---

## 9. Agent Verification (data actually landed)

Run each SELECT in Supabase SQL Editor **after** the golden-path run:

- [ ] `SELECT COUNT(*) FROM ai_generations WHERE created_at > NOW() - INTERVAL '1 hour';` → > 0
- [ ] `SELECT COUNT(*) FROM ai_usage WHERE created_at > NOW() - INTERVAL '1 hour';` → > 0
- [ ] `SELECT COUNT(*) FROM section_audits;` → > 0 after Tier 1 draft
- [ ] `SELECT COUNT(*) FROM draft_quality_scores;` → > 0 after Tier 1 draft
- [ ] `SELECT COUNT(*) FROM match_kills;` → > 0 after a /matches run
- [ ] `SELECT COUNT(*) FROM compliance_events WHERE auto_generated = true;` → > 0 after `awarded` transition
- [ ] `SELECT COUNT(*) FROM org_funder_history;` → > 0 after `awarded` or `declined`
- [ ] `SELECT COUNT(*) FROM funder_learnings;` → > 0 after awarded-with-feedback
- [ ] `SELECT COUNT(*) FROM grant_verification_log WHERE created_at > NOW() - INTERVAL '24 hours';` → > 0 (cron fired)
- [ ] `SELECT COUNT(*) FROM cost_watchdog_alerts;` → any row means rule at least fired once
- [ ] `SELECT COUNT(*) FROM error_triage_events;` — 0 OK if no errors, or verify with curl test

---

## 10. Background Workers (Railway)

- [ ] Railway dashboard shows worker running, no crash loop
- [ ] `worker/cost-watchdog.ts` — hourly cron fires in logs
- [ ] `worker/grant-verifier.ts` — nightly cron fires
- [ ] `worker/match-grants.ts` — job processes when a signup happens
- [ ] `worker/score-readiness.ts` — fires after org-profile completion
- [ ] `worker/writing.ts` — drains `grant_drafts` queue
- [ ] `worker/weekly-digest.ts` — scheduled job visible
- [ ] `worker/send-sequence-emails.ts` — emails actually deliver (check Resend logs)

---

## 11. External Integrations

### Stripe
- [ ] `/api/webhooks/stripe` POST receives events (check Stripe dashboard → Webhooks → Deliveries)
- [ ] `invoice.payment_succeeded` updates `subscriptions` row
- [ ] `customer.subscription.deleted` downgrades to free
- [ ] Failed payment email triggered via Stripe

### Email (Resend/SendGrid)
- [ ] Welcome email delivers (<5 min)
- [ ] Password reset delivers
- [ ] Weekly digest delivers to opted-in users
- [ ] Unsubscribe link from `/unsubscribe` works

### Sentry
- [ ] Throw a test error from `/api/health?error=1` (if wired)
- [ ] Sentry receives it within 60s
- [ ] `/api/triage/sentry` endpoint:
  ```
  curl -X POST https://grantaq.com/api/triage/sentry \
    -H "x-triage-secret: $SENTRY_WEBHOOK_SECRET" \
    -H "Content-Type: application/json" \
    -d '{"issue":{"id":"TEST-1","title":"Test triage"}}'
  ```
  returns `{"ok":true,"verdict":"triaged"}`
- [ ] Row lands in `error_triage_events`

### Support Triage
- [ ] `curl -X POST .../api/triage/support -H "x-triage-secret: $SUPPORT_WEBHOOK_SECRET" -d '{"channel":"manual","body":"I was charged twice"}'`
- [ ] Row lands in `support_tickets` with intent='billing'

### Vercel
- [ ] Production deploy green, no build warnings
- [ ] Edge middleware (if any) not blocking legitimate traffic
- [ ] Image optimization working on hero

### Supabase
- [ ] RLS sweep GH Action green on last run
- [ ] No tables missing `ENABLE ROW LEVEL SECURITY` (check Security tab)
- [ ] Service role key NOT leaked to client bundle (`curl grantaq.com | grep SERVICE_ROLE` → nothing)

---

## 12. Security / RLS Boundaries

- [ ] As user A, try to view user B's org data via URL tampering → 403 or redirect
- [ ] As user A, try POST to `/api/pipeline` with user B's `grant_source_id` → 403
- [ ] As anonymous, hit `/api/admin/*` → 401
- [ ] As non-admin user, hit `/api/admin/*` → 403
- [ ] Log out → protected routes redirect to `/login`
- [ ] Session persists across page refresh
- [ ] Session expires correctly after configured TTL

---

## 13. Performance / Load

- [ ] Home page LCP < 2.5s (Chrome DevTools → Lighthouse)
- [ ] `/matches` first render < 3s with 100+ grants
- [ ] Draft generation doesn't time out on federal-size RFPs
- [ ] No N+1 in `/pipeline` (single query per render, check Network tab)

---

## 14. Cost Guardrails

- [ ] Trigger a high-spend event on a free-tier test org — Cost Watchdog fires alert
- [ ] Check `cost_watchdog_alerts` for the alert row
- [ ] Slack webhook fires (if `COST_WATCHDOG_SLACK_WEBHOOK_URL` set)
- [ ] Hard cap prevents further calls once hit (expected: `UsageLimitError` or equivalent)

---

## 15. Post-Launch Monitoring (first 24 hours)

- [ ] Sentry no-new-issues
- [ ] `ai_generations` row count growing (not stuck)
- [ ] Stripe receiving real payments if any
- [ ] No spike in `error_triage_events.severity='critical'`
- [ ] No spike in `support_tickets.urgency='urgent'`
- [ ] Weekly-digest job fired on schedule

---

## Scratch: Bugs found during this run

Copy any failures here with steps + screenshot path:

1.
2.
3.

---

**Sign-off:** __________________________  Date: __________

All P0 items checked? GO. Any unchecked P0? NO-GO.
