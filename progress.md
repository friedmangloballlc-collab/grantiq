# Progress Log — Launch Prep

## 2026-04-20 (carried-over context)
Unit 1 schema prereqs closed (archived to `docs/plans/archive/2026-04-19-unit-1/`).

4 agents shipped end-to-end today:
- Compliance Calendar Builder (#4) — commit 769aa09
- Outcome Learning Agent (#5) — commit 44c188c
- Sentry Triage (#10) — commit 7544152
- Support Triage (#12) — commit 7544152

Migrations applied via Supabase dashboard:
- 00064_funder_learnings.sql — `funder_learnings` + `org_funder_history` created
- 00065_triage_tables.sql — `error_triage_events` + `support_tickets` created

Verified live: `SELECT table_name FROM information_schema.tables WHERE table_name IN (...)` returns all 4.

Test suite: 523 passing / 49 files. `next build` clean. TypeScript 0 errors.

Launch checklist written: `docs/LAUNCH_CHECKLIST.md` (286 lines, 15 sections).

## 2026-04-21 (marketing additions + ingest pipeline unblocked)

### Marketing site additions
- d89467e: grant-writer questions strip on home (static pill row)
- 5653eba: **newsletter capture** — double opt-in via migration 00066, `/api/newsletter/{subscribe,confirm,unsubscribe}` routes, `NewsletterCapture` component placed on home + `/resources`, confirmation/unsubscribe pages. Footer now carries 4 social icons (LinkedIn, YouTube, Facebook, X) as inline SVG (lucide dropped brand icons for trademark reasons). `/resources` page with Learn/Verify/Community sections linking to GPA, AFP, Candid, GuideStar, r/nonprofit, etc.

### Brand consistency
- 440fc0d: **GrantIQ → GrantAQ** rename across 20 user-facing files. All pages, FAQ, pricing, emails, metadata, admin dashboard, support-triage signoff now say GrantAQ. Also fixed verifier User-Agent (`verify@grantiq.com` → `verify@grantaq.com`).
- 42a4ccc: downloaded data export filename fix (`grantiq-data-export-...` → `grantaq-data-export-...`)
- a9914e4: GitHub Actions smoke-test.yml was pointing at `www.grantiq.com` (non-existent); fixed to `www.grantaq.com`.

### Homepage + ingest ceilings
- 295ad35: Homepage added `export const revalidate = 3600` so the grant count updates hourly instead of being static-prerendered at build time. `formatGrantCount` rounds to nearest 50 instead of 100 so gains become visible faster. Grants.gov fetch ceiling raised 100 → 500 posted + 50 → 250 forecasted (5× daily output). Added `maxDuration = 300` and chunked parallel updates (20-wide) so 750-row batches finish in ~5s.
- 78f2e70: `crawl-sources` BATCH_SIZE 10 → 30, INTER_SOURCE_DELAY 2s → 500ms. `ingest-990` MAX_PAGES_PER_RUN 20 → 40, DELAY 300ms → 100ms. Added POST `/api/admin/ingest-trigger` endpoint (admin-email gated, imports and calls cron GET handlers in-process with synthetic Bearer auth).

### Cron observability
- 1d070aa: `cron_heartbeats` table (migration 00067). `src/lib/cron/heartbeat.ts` with `recordHeartbeat()` (never throws) and `getCronStatuses()` with 25h stale threshold. `CronStatusCard` at top of `/admin/agents` showing green/amber/red badges, last-run time, duration, 24h run count, error messages.
- a4ea66a: "Run now" one-click trigger buttons per cron row. Calls `/api/admin/ingest-trigger` with session auth — no terminal, no tokens. Green pill shows result summary on success (e.g. "30 sources · 14 new · 180s").

### Cron pipeline fixes — the big ones
- **09f0fba: CRON AUTH BUG (9-day silent failure).** Every cron route had `isAuthorized()` checking `x-vercel-cron-secret` header. Vercel does not send that header. Per docs Vercel sends `Authorization: Bearer ${CRON_SECRET}`. Every scheduled call was 401-ing silently. Caught via Vercel Logs after heartbeat table surfaced the "never run" rows. Fixed with shared `src/lib/cron/auth.ts` helper; all 10 cron routes migrated to `isCronAuthorized()`. Removed 10 copies of the broken local function. **This was the root cause of the ingest pipeline being dead for 9+ days.**
- 4dfcdd4: `check-urls` ordered by missing column `grant_sources.updated_at`. Canonical column is `last_verified`. Fixed.
- 2e359f9: `refresh-grants` INSERT failed the whole batch when any single row collided with the (name, funder_name) unique index. Switched to upsert with onConflict. Also fixed `ingest-990` stuck pagination: when a state was exhausted (or ProPublica returned 400 for over-pagination), `stateIndex++` happened but `pageIndex` wasn't reset, so the saved progress row kept a stale page number and retried the same dead page on every run. Reset `pageIndex = 0` when advancing state.

### Verification (2026-04-21 14:10 UTC)
Post-deploy Vercel Logs showed 200 status codes across:
- `/api/cron/crawl-sources` — 200, "Starting source crawl, count: 30"
- `/api/cron/enrich-competitiveness` — 200, "enriched 3 grants in 2.3s"
- `/api/cron/refresh-grants` — 200, "Grants.gov fetch complete, posted: 500, forecasted: 250, total: 750"
- `/api/cron/ingest-990` — 200, "990-PF ingestion started, state: DE"

Some 3rd-party 403s logged inside successful runs (e.g. hhs.gov blocking non-browser User-Agent) — expected and handled gracefully.

### Migrations applied today via Supabase dashboard
- 00066_newsletter_subscribers.sql — `newsletter_subscribers` table created
- 00067_cron_heartbeats.sql — `cron_heartbeats` table created

Verified live: both tables return one row from `information_schema.tables`.

Test suite still: 523 passing / 49 files. `next build` clean. TypeScript 0 errors.

## 2026-04-22 (legal hardening + revenue surfaces)

### Pricing + revenue surfaces
- `164d06b` Dynamic OG image via `src/app/opengraph-image.tsx` (replaced the 1200×1200 app-icon PNG that LinkedIn/Slack were cropping). Twitter image re-uses same component. Layout metadata cleaned up with openGraph.title + description.
- `164d06b` Pricing trust strip: 4-column risk-reversal block above billing toggle (6,000+ grants · 60s check · $0 start · 7-day guarantee).
- `3c5b78b` Dropped 7-day money-back guarantee (chargeback abuse risk: user consumes AI tokens then refunds). Replaced with "Cancel anytime · no long-term contracts."
- `3a8ff01` Per-tier success fee disclosure row on every pricing card: "+ N% success fee on awarded grant funds" with link to `/terms#success-fees`.

### Success-fee tracking infrastructure
- `f0d01cd` Migration 00068 extends success_fee_invoices (from migration 00007) with awarded_at, funds_received_at, due_at, stripe_invoice_id, funder_name, notes (append-only log), reported_by_admin, updated_at + trigger. New fee_tier CHECK aligned to free/starter/pro/growth/enterprise/custom.
- `f0d01cd` `src/lib/billing/success-fee.ts` — rate table (5/5/5/4/3), computeSuccessFee, computeDueDate (30 days from funds receipt).
- `f0d01cd` POST `/api/admin/success-fees` (log new award) + PATCH `/api/admin/success-fees/[id]` (lifecycle updates with append-only note history).
- `f0d01cd` `/admin/success-fees` dashboard: outstanding/collected/overdue tiles, full table with status badges, Stripe invoice deep-links.

### Legal hardening — comprehensive audit + fixes
- `734ed90` `docs/legal-liability-audit.md` (614 lines) — senior SaaS attorney-style risk memo. 3 P0 / 8 P1 / 9 P2 exposure surfaces with case law citations (Medlin v LegalZoom, UPLC v Parsons Tech, Florida Bar v Brumbaugh, Gil v Winn-Dixie, Robles v Dominos). Counsel engagement menu with budget estimates.
- `734ed90` CAN-SPAM fix: `src/emails/shared-layout.tsx` now includes physical postal address (via NEXT_PUBLIC_MAILING_ADDRESS env var), unsubscribe link, "why receiving" line, privacy link. $53,088/violation exposure closed the moment the env var is set.
- `734ed90` `/accessibility` page — WCAG 2.1 AA statement. Deters ADA surf-by demand letters (~$3-10K settlements). No federal safe harbor exists for digital a11y; published statements + documented remediation are the best practical defense.
- `a13a449` **Fortress-grade Terms of Service rewrite** (1000+ lines, 23 sections): conspicuous opening 5-point callout (reasonable notice per Meyer v Uber), E-SIGN consent, AI disclosure + assumption of risk, no-guarantee-of-funding stated FIVE places, non-refundable with rationale, chargeback pre-contact requirement, evidence-submission consent, success-fee acceleration on chargeback, rate-lock-at-draft-time, scrivener framing for formation, disclaimer of warranties, $100-or-12-month liability cap, indemnification FROM user, mandatory AAA arbitration, class waiver, mass arbitration defense (batch procedures, stayed filing fees), 1-year statute of limitations, no-reliance clause (defeats fraud claims outside 4 corners), force majeure covering Stripe/Supabase/OpenAI/Anthropic outages, 30-day change notice.
- `a13a449` Migration 00069: terms_version + terms_accepted_ip + terms_accepted_user_agent on org_members. New terms_acceptance_log audit table for re-acceptances after material changes.
- `a13a449` `src/lib/legal/terms-version.ts`: `CURRENT_TERMS_VERSION = "2026-04-22-v2"`. Signup API writes version + IP + UA at moment of acceptance. Clickwrap triangle (Meyer v Uber): reasonable notice + opportunity to review + unambiguous manifestation of assent — all three now captured as admissible evidence.

### UPL fix — biggest ongoing legal risk closed
- `2cee12e` `nonprofit_formation` AI prompt rewritten from "articles/bylaws customized to state + recommend which form" → process checklist + links to state's OFFICIAL templates + neutral IRS form overview (user self-determines using IRS eligibility worksheet) + mandatory attorney-recommendation section. No AI-drafted legal documents. No form selection advice.
- `2cee12e` `policy_drafting` AI prompt rewritten from "complete policy text ready for board adoption" → "starter templates labeled [REVIEW WITH ATTORNEY BEFORE ADOPTION]".
- `2cee12e` Formation wizard UI shows persistent Texas-style safe harbor banner on every screen: "This is self-help software. GrantAQ is not a law firm... consult a licensed attorney before filing."
- `2cee12e` SKU renamed: "Nonprofit Formation" → "Nonprofit Formation Filing Assistant". Feature bullets de-risked. Homepage marketing copy rewritten.
- Effect: cuts UPL exposure from "clear UPL in NC/TX/FL/CA" to "arguable software safe harbor under Tex. Gov't Code §81.101(c) pattern" (same insulation LegalZoom + Rocket Lawyer use). Can operate in all 50 states without partnering with Harbor Compliance or building an attorney network.

### Migrations applied via Supabase dashboard (2026-04-22)
- 00068_success_fees_extend.sql — verified: awarded_at, funds_received_at, due_at, stripe_invoice_id all present
- 00069_terms_version_tracking.sql — verified: terms_acceptance_log table + 3 new columns on org_members

### Still open (operational, user must do)
- Set `NEXT_PUBLIC_MAILING_ADDRESS` in Vercel env vars (critical for CAN-SPAM)
- Rotate `ADMIN_SECRET` (flagged "Need to Rotate" by Vercel)
- Create 4 mailbox addresses: legal@, billing@, dmca@, security@
- Engage SaaS attorney for 30-min Terms review (~$1,500)
- Run the $249 Stripe test

## Session notes
- Held on Onboarding Coach (#6) per roadmap — post-PMF.
- User preference: strictly premium pricing ($249 / $497 / $997 / FC).
- User preference: cost-conscious — avoid speculative API spend; let real user signups drive volume.
- User preference: evaluate every pasted component before building — decorative-only additions get rejected.
- User preference: no terminal if avoidable — built UI button paths instead.
- User preference: no money-back guarantees (refund abuse risk with non-recoverable AI token cost).
- User preference: fortress-grade legal posture (full no-guarantee-of-funding language, strong chargeback defenses, explicit success-fee survival after cancellation).

## Next session pickup
**Phase 1 $249 Stripe test still blocks revenue.** Five operational items open (mailing address, rotate ADMIN_SECRET, 4 mailboxes, attorney review). Code-side Phase 3 work in progress: draft viewer badges, compliance calendar, funder feedback capture, AI review-before-export gate.

Also check `/admin/agents` tomorrow morning — the Cron Status card should show all 10 crons with fresh green heartbeats from overnight runs. If anything's stale, click "Run now" to catch up, then diagnose via Vercel Logs.
