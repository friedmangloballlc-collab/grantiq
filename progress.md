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

## Session notes
- Held on Onboarding Coach (#6) per roadmap — post-PMF.
- User preference: strictly premium pricing ($249 / $497 / $997 / FC).
- User preference: cost-conscious — avoid speculative API spend; let real user signups drive volume.
- User preference: evaluate every pasted component before building — decorative-only additions get rejected.
- User preference: no terminal if avoidable — built UI button paths instead.

## Next session pickup
**Phase 1 is still the blocker.** Run the $249 Stripe live test purchase. Once that succeeds, verify the refund flow, then proceed to Phase 2 (launch checklist dry-run).

Also check `/admin/agents` tomorrow morning — the Cron Status card should show all 10 crons with fresh green heartbeats from overnight runs. If anything's stale, click "Run now" to catch up, then diagnose via Vercel Logs.
