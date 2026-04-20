# Task Plan: GrantIQ Launch Prep

## Goal
Take GrantIQ from code-complete to first paying customer. Unit 1 schema
work (2026-04-19) and the 4-agent ship (2026-04-20 morning) are done;
now we need Stripe, user-visible UI for the new agent outputs, external
webhook wiring, and a real paying user through the full funnel.

**Origin:** continuation of `docs/plans/archive/2026-04-19-unit-1/` —
that plan closed cleanly. This plan scopes the launch workstream.

**Checklist backing this plan:** `docs/LAUNCH_CHECKLIST.md` (286 lines,
15 sections, ~140 check items).

## Current Phase
Phase 1 — Stripe activation.

## Phases

### Phase 1: Stripe activation (P0 — blocks revenue)
- [ ] Set `STRIPE_SECRET_KEY` (live, not test) in Vercel
- [ ] Set `STRIPE_PUBLISHABLE_KEY` in Vercel
- [ ] Create Stripe webhook → `https://grantaq.com/api/webhooks/stripe`
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Vercel
- [ ] Verify `/api/webhooks/stripe` exists and handles invoice.payment_succeeded + customer.subscription.deleted
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
- **Exit criteria:** none — this is deferred cleanup

### Phase 6: First paying customer funnel
- [ ] Share sign-up link with 1-3 warm prospects
- [ ] First real purchase (non-you)
- [ ] Monitor first 24 hours per `docs/LAUNCH_CHECKLIST.md` §15
- **Exit criteria:** first external customer successfully generates a draft

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| (none yet) | | | |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Start of Phase 1 (Stripe activation). All 12 agents shipped; 9 live, 2 need webhooks, 1 deferred. 6 migrations applied (00059-00065). |
| Where am I going? | Phase 1 → real $249 purchase works. Phase 2 → golden path smoke passes. Phase 3 → agent outputs visible in UI. Phase 4 → Sentry + Support triage wired. Phase 6 → first external paying customer. |
| What's the goal? | First paying customer through the full funnel: signup → readiness → matches → pipeline → Tier 1 draft → compliance calendar. |
| What have I learned? | Shipping more agents won't move revenue; only Stripe can. Agent output without UI = dormant value. Cost Watchdog caps protect us from runaway LLM spend during launch. |
| What have I done? | Archived Unit 1 plan. Launch checklist written (`docs/LAUNCH_CHECKLIST.md`). 4 agents shipped today (#4, #5, #10, #12). Migrations 00064 + 00065 applied and verified via SQL. Full build + 523 tests passing. |

---
*Update after completing each phase or encountering errors*
