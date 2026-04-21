# Task Plan: GrantAQ Launch Prep

## Goal
Take GrantAQ from code-complete to first paying customer. Unit 1 schema
work (2026-04-19) and the 4-agent ship (2026-04-20 morning) are done;
now we need Stripe, user-visible UI for the new agent outputs, external
webhook wiring, and a real paying user through the full funnel.

**Origin:** continuation of `docs/plans/archive/2026-04-19-unit-1/` —
that plan closed cleanly. This plan scopes the launch workstream.

**Checklist backing this plan:** `docs/LAUNCH_CHECKLIST.md` (286 lines,
15 sections, ~140 check items).

## Current Phase
Phase 1 — Stripe activation (still blocking revenue).

## Phases

### Phase 1: Stripe activation (P0 — blocks revenue)
- [x] Set `STRIPE_SECRET_KEY` (live, not test) in Vercel
- [x] Set `STRIPE_PUBLISHABLE_KEY` in Vercel
- [x] Create Stripe webhook → `https://grantaq.com/api/webhooks/stripe`
- [x] Set `STRIPE_WEBHOOK_SECRET` in Vercel
- [x] Verified `/api/webhooks/stripe` handles checkout.session.completed + customer.subscription.updated + customer.subscription.deleted + invoice.payment_failed
- [ ] Test purchase: Tier 1 AI-only ($249) with a real card — full flow
- [ ] Refund self — verify webhook processes refund cleanly
- [ ] Confirm `subscriptions` + `grant_drafts` rows updated correctly
- **Exit criteria:** real $249 transaction completes end-to-end, data lands in Supabase, refund works

### Phase 2: Launch checklist dry-run (P0)
- [ ] Execute `docs/LAUNCH_CHECKLIST.md` §0 (pre-flight env vars)
- [ ] Execute §1 (marketing + signup) as incognito user
- [ ] Execute §2 (onboarding + readiness)
- [ ] Execute §3 (matches + critic)
- [ ] Execute §4 (pipeline transitions) — trigger awarded + declined
- [ ] Execute §5 (writing pipeline — Tier 1 at minimum)
- [ ] Execute §9 (SQL verification — all new tables got rows)
- [ ] Log any bugs found to `docs/launch-bugs.md`
- **Exit criteria:** zero P0 failures; P1/P2 items tracked

### Phase 3: User-visible UI for new agent outputs (P1)
- [ ] Draft viewer: render `section_audits` badges (clean / flagged / blocked)
- [ ] Draft viewer: render `draft_quality_scores` (verdict + improvements)
- [ ] Compliance calendar page reads `compliance_events` for user's org
- [ ] Declined pipeline items: textarea to capture `funder_feedback_text`
- **Exit criteria:** data the agents write is viewable without a SQL query

### Phase 4: External webhook wiring (P1)
- [ ] Set `SENTRY_WEBHOOK_SECRET` in Vercel
- [ ] Add Sentry service hook → `/api/triage/sentry`
- [ ] Verify test error lands in `error_triage_events`
- [ ] Set `SUPPORT_WEBHOOK_SECRET` in Vercel
- [ ] Configure inbound email forwarder OR Intercom webhook → `/api/triage/support`
- [ ] Verify test ticket lands in `support_tickets`
- **Exit criteria:** both idle agents (#10, #12) are live

### Phase 5: Technical debt (P2, safe to defer)
- [ ] Add `UNIQUE (tier, feature)` on `tier_limits` (documented follow-up)
- [ ] Seed `eligibility_scores` tier_limits rows
- [ ] Admin triage queue UI at `/admin/triage` (read-only view of both triage tables)
- [ ] Wire remaining 7 cron routes to `recordHeartbeat` (only 3 wired so far)
- [ ] Rotate `ADMIN_SECRET` (Vercel flagged "Need to Rotate"; partially exposed)
- **Exit criteria:** none — this is deferred cleanup

### Phase 6: First paying customer funnel
- [ ] Share sign-up link with 1-3 warm prospects
- [ ] First real purchase (non-you)
- [ ] Monitor first 24 hours per `docs/LAUNCH_CHECKLIST.md` §15
- **Exit criteria:** first external customer successfully generates a draft

### Phase 7 (completed 2026-04-21): Ingest pipeline unblocked
- [x] Newsletter capture — migration 00066, `/api/newsletter/*` routes, homepage + `/resources` section, confirm/unsubscribe pages
- [x] Footer social icons (inline SVG — LinkedIn, YouTube, Facebook, X)
- [x] `/resources` marketing page with Learn/Verify/Community sections
- [x] Rename GrantIQ → GrantAQ across 20 user-facing files
- [x] Homepage `revalidate = 3600` so grant count updates hourly
- [x] Grants.gov fetch ceiling 150 → 750/day
- [x] `crawl-sources` BATCH_SIZE 10 → 30, inter-source delay 2s → 500ms
- [x] `ingest-990` MAX_PAGES 20 → 40, DELAY 300 → 100ms
- [x] Manual trigger endpoint `/api/admin/ingest-trigger`
- [x] Cron heartbeat table (migration 00067) + recordHeartbeat helper
- [x] Admin Cron Status card on `/admin/agents` with stale flagging
- [x] "Run now" one-click trigger buttons per cron
- [x] **Fix cron auth bug** — all 10 routes were 401-ing Vercel's scheduled calls because they checked `x-vercel-cron-secret` (not sent) instead of `Authorization: Bearer CRON_SECRET` (what Vercel actually sends). Shared `src/lib/cron/auth.ts` helper.
- [x] Fix check-urls schema bug: ordered by missing `updated_at` → swapped to `last_verified`
- [x] Fix refresh-grants dup-insert crash: switched to upsert onConflict=name,funder_name
- [x] Fix ingest-990 stuck pagination: reset `pageIndex = 0` when advancing state
- [x] Fix smoke-test.yml pointing at wrong domain (grantiq → grantaq)
- [x] Fix downloaded data export filename (grantiq → grantaq)

## Migrations to apply (if not already)
- [x] 00066_newsletter_subscribers.sql — applied via Supabase dashboard
- [x] 00067_cron_heartbeats.sql — applied via Supabase dashboard

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-04-21 | `crawl-sources` silently 401-ing for 9 days | 1 | Found root cause in cron auth header mismatch. Fixed in 09f0fba. |
| 2026-04-21 | `check-urls` 500: column `updated_at` doesn't exist | 1 | Swapped ORDER BY to `last_verified` (canonical column). Fixed in 4dfcdd4. |
| 2026-04-21 | `refresh-grants` dup-key crash on insert | 1 | Switched to upsert with onConflict. Fixed in 2e359f9. |
| 2026-04-21 | `ingest-990` stuck on DE page=400 | 1 | Reset pageIndex when advancing state. Fixed in 2e359f9. |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase 1 — Stripe $249 test still blocks revenue. Ingest pipeline fully unblocked (Phase 7 done 2026-04-21). |
| Where am I going? | Phase 1 → real $249 purchase works. Phase 2 → golden path smoke passes. Phase 3 → agent outputs visible in UI. Phase 4 → Sentry + Support triage wired. Phase 6 → first external paying customer. |
| What's the goal? | First paying customer through the full funnel: signup → readiness → matches → pipeline → Tier 1 draft → compliance calendar. |
| What have I learned? | Cron 401s are invisible without heartbeat tracking. `x-vercel-cron-secret` is NOT what Vercel sends — docs say Authorization: Bearer CRON_SECRET. Homepage static prerender silently froze the grant counter until we added revalidate. |
| What have I done? | Phase 7 shipped (ingest pipeline + observability + 4 real bug fixes + marketing site additions). Phases 1-4 still pending. |

---
*Update after completing each phase or encountering errors*
