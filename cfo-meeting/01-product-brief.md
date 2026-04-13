# GrantAQ — Product Brief

**Positioning:** GrantAQ is an AI-powered grant discovery and matchmaking platform that connects businesses and nonprofits with funding opportunities from 4,300+ grants across federal, state, foundation, and corporate sources — then guides them through evaluation, application, and compliance.

**Target User:** Small-to-mid-market businesses (LLCs, S-Corps, nonprofits) with $50K–$5M annual budgets seeking grant funding. Particularly strong for organizations that don't have a dedicated grant writer.

---

## Top 5 Capabilities

| # | Capability | Proof | Maturity |
|---|-----------|-------|----------|
| 1 | **AI Grant Matching** — 5-component weighted scoring (similarity, eligibility, fit, location, timing) with 14 hard-filter rules that exclude ineligible grants before ranking | `src/lib/matching/weighted-score.ts:105-288`, `src/lib/matching/hard-filter.ts:76-220` | Production |
| 2 | **Automated Grant Library** — 4,304 active grants maintained by 7 daily crons: Grants.gov API refresh, AI web crawler (471 sources), enrichment, embeddings, competitiveness scoring, validation, URL checks | `vercel.json` (cron schedule), `src/app/api/cron/` (7 route handlers) | Production |
| 3 | **16-Question Profiling** — Structured onboarding captures entity type, NAICS, SAM status, certifications, beneficiaries, project description, funding range, and mission — feeds compound vector embedding for matching | `src/components/onboarding/chat-interface.tsx:31-360` (CORE_STEPS array) | Production |
| 4 | **Tiered SaaS Billing** — 5-tier model (Free→$399/mo Enterprise) with 40+ feature gates controlling access to library, matches, AI writing, pipeline, and team features. Stripe checkout + webhook integration. | `src/lib/billing/feature-gates.ts:1-205`, `src/lib/stripe/config.ts` | MVP |
| 5 | **Grant Application Pipeline** — 8-stage kanban (identified→awarded/declined) with AI writing engine (3-tier pricing), compliance sentinel, readiness scoring, and success-fee tracking (10% on awards) | `supabase/migrations/00022_pipeline_8_stages.sql`, `src/lib/ai/writing/` (8 modules) | Production |

---

## Integration Surface

| System | Status | File Reference |
|--------|--------|----------------|
| Stripe (payments) | Wired — checkout, portal, webhooks, subscription lifecycle | `src/lib/stripe/`, `src/app/api/webhooks/stripe/route.ts` |
| OpenAI (AI) | Wired — GPT-4o-mini scoring, text-embedding-3-small | `src/lib/ai/client.ts` |
| Supabase (DB + Auth) | Wired — PostgreSQL + pgvector + RLS + Auth | `src/lib/supabase/` |
| Grants.gov (data) | Wired — daily API refresh, 150 grants/day | `src/lib/ingestion/grants-gov-client.ts` |
| USAspending.gov (data) | Wired — competitiveness scoring, free API | `src/lib/ingestion/usaspending-client.ts` |
| Resend (email) | Scaffolded — templates exist, worker not deployed | `src/lib/email/` |
| PostHog (analytics) | Wired | `src/components/analytics/posthog-provider.tsx` |
| Crisp (chat) | Wired — marketing pages only | `src/components/shared/crisp-chat.tsx` |

---

## Maturity Snapshot

| Component | Status |
|-----------|--------|
| Matching engine (vector + filters + scoring) | **Production** |
| Grant data pipeline (7 daily crons) | **Production** |
| Multi-tenancy (RLS at DB layer) | **Production** |
| Onboarding + profile collection | **Production** |
| Stripe billing | **MVP** (not yet processing live payments) |
| Email delivery | **Stubbed** (enqueued, not sent) |
| White-label / custom branding | **Aspirational** (feature gate exists, not built) |
| SSO / SAML | **Aspirational** (listed in enterprise tier, not built) |
| Automated test suite | **Not implemented** |
| CI/CD pipeline | **Not implemented** |
