# Findings — Launch Prep Workstream

## Agent wiring inventory (as of 2026-04-20)

Source of truth for "what's actually live" vs "has code but idle":

| # | Agent | Wired at | Status |
|---|---|---|---|
| 1 | Cost Watchdog | `worker/src/handlers/cost-watchdog.ts` (hourly cron) | LIVE |
| 2 | Grant Data Verifier | `worker/src/handlers/grant-verifier.ts` (nightly cron) | LIVE |
| 3 | Funder Match Critic | `src/app/api/matches/route.ts` (inline Stage 1 + Stage 2) | LIVE |
| 4 | Compliance Calendar Builder | `src/app/api/pipeline/route.ts` PATCH on awarded (fire-and-forget) | LIVE |
| 5 | Outcome Learning Agent | `src/app/api/pipeline/route.ts` PATCH on awarded/declined | LIVE |
| 6 | Onboarding Coach | — | DEFERRED (post-PMF) |
| 7 | Hallucination Auditor | `src/lib/ai/writing/pipeline.ts` per section | LIVE |
| 8 | Quality Scorer | `src/lib/ai/writing/pipeline.ts` after compliance | LIVE |
| 9 | RLS Sweep | `.github/workflows/rls-sweep.yml` | LIVE |
| 10 | Sentry Triage | `src/app/api/triage/sentry/route.ts` | IDLE — needs Sentry hook + secret |
| 11 | Smoke Test | `.github/workflows/smoke-test.yml` | LIVE |
| 12 | Support Triage | `src/app/api/triage/support/route.ts` | IDLE — needs inbound forwarder + secret |

## App sections inventory (for launch checklist coverage)

Top-level `src/app/(app)/`:
admin, analytics, calendar, certified, clients, compliance, dashboard, funders, grants, library, matches, pipeline, portfolio-tracker, roadmap, services, settings, upgrade, vault, writing.

`src/app/(app)/admin/`: agents, corrections, leads, users.
`src/app/(app)/settings/`: billing, notifications, referrals, team.
Marketing (`src/app/(marketing)/`): blog, check, grant-directory, grant-services, grants, partners, pricing, privacy, score, share, terms, tools, unsubscribe.
Tools: budget-estimator, eligibility-checker, funding-gap, grant-timeline, readiness-quiz.

## Background workers (Railway)

`worker/src/handlers/`: cost-watchdog, crawl-source, generate-embedding, generate-roadmap, grant-verifier, match-grants, score-readiness, send-sequence-emails, weekly-digest, writing.

## Cost math (per-customer-per-month, rough)

Net new spend from agents shipped this session:
- Awarded grant: +1 Opus call (Compliance, ~$0.05) + 1 Opus call (Outcome, ~$0.08) = $0.13 each
- Declined grant: +1 Opus call (Outcome, ~$0.08) each
- Error triage (if wired): +1 Haiku call (~$0.001) each
- Support triage (if wired): +1 Haiku call (~$0.003) each

At 2 wins + 5 losses + modest error/support volume per paying customer per month: ~$0.50-$1.50 new spend.
Against revenue: $249-$997 per draft. ROI math is strongly positive.

## Cost guardrails already in place

`src/lib/cost_watchdog/config.ts` tiered hard caps:
- free = $5/mo
- starter = $15/mo
- pro = $25/mo
- growth = $50/mo
- enterprise = $150/mo

Plus prompt caching on auditor / scorer / compliance-builder — sections 2..N hit the Anthropic 5-min cache at ~10% of uncached cost.

## Known open items

1. `tier_limits` table has no `UNIQUE (tier, feature)` constraint — logged in archived error log, low priority hardening.
2. `eligibility_scores` rows missing from `tier_limits` — deferred; eligibility route uses `skipUsageCheck:true`.
3. `src/lib/ai/agents/quality-scorer/rubric.ts:11` — unused import warning from lint (pre-existing, not blocking).
4. RLS sweep reports 58 pre-existing findings (writing/purchase, writing/start-draft routes) from partial patches; none in new code this session.

## External services required for full launch

| Service | Env vars needed | Agent dependent |
|---|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Revenue path |
| Anthropic | `ANTHROPIC_API_KEY` | Auditor, Scorer, Compliance, Outcome, Critic Stage 2, Triage |
| OpenAI | `OPENAI_API_KEY` | Match scoring, readiness, roadmap |
| Supabase | `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | All |
| Resend (or equivalent) | `RESEND_API_KEY` + verified domain | Emails, digest |
| Sentry | `SENTRY_DSN`, `SENTRY_WEBHOOK_SECRET` | #10 Sentry Triage |
| Support triage | `SUPPORT_WEBHOOK_SECRET` + inbound forwarder | #12 Support Triage |
| Slack (optional) | `COST_WATCHDOG_SLACK_WEBHOOK_URL` | #1 Cost Watchdog notifications |
