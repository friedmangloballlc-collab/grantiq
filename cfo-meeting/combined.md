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
# GrantAQ — Business Description

## What It Does

GrantAQ is a software platform that automatically matches businesses with grant funding they're eligible for. When a business creates an account, they answer 16 questions about their organization — entity type, industry, location, certifications, what they need funding for, and who they serve. The platform then searches a library of over 4,300 active grants and ranks the best matches using a scoring system that weighs five factors: how well the grant's purpose aligns with the business (50%), whether the business is eligible to apply (15%), how well it fits the grant's specific requirements like NAICS codes and certifications (13%), geographic match (12%), and deadline urgency (10%). The business sees their top matches instantly, with clear explanations of why each grant was surfaced and what gaps might prevent them from winning.

The grant library is not static. Seven automated processes run daily — pulling new opportunities from Grants.gov (the federal grant database), crawling 471 grant source websites using AI to extract new opportunities, classifying each grant by eligibility type and sector, generating searchable embeddings, validating data quality, and scoring competitiveness using historical award data from USAspending.gov. The system currently processes approximately 150 new federal grants per day and crawls 10 additional sources daily across state agencies, foundations, and corporate programs.

## Who Pays

Revenue comes from tiered subscriptions. Free users see 5 matched grants with limited detail. Paying subscribers ($49–$399/month) unlock the full library, unlimited matches, AI-powered grant writing, application pipeline management, document vault, team collaboration, and readiness scoring. An additional revenue stream exists through success fees — a 10% fee on grants won through the platform's full-service writing tier ($0 upfront, pay only if awarded). The subscription tiers are enforced through over 40 feature gates in the code, controlling access at the page, API, and UI component level.

## Why a Tax Advisory Firm's Clients Need This

Tax advisory firms serve exactly the businesses that qualify for grants but don't know it. Their client base is full of LLCs, S-Corps, and small nonprofits with $500K–$5M in revenue — organizations that have the financial documentation grants require (tax returns, audited financials, EINs) but lack the time or expertise to find and apply for funding. These businesses already trust their tax advisor with sensitive financial data and rely on them for strategic guidance about money.

The platform specifically captures signals that tax advisors already know about their clients: entity type, NAICS code, annual revenue, employee count, SAM.gov registration status, and whether they have audited financials. It uses these to filter out grants the business genuinely cannot win — for example, blocking for-profit businesses from seeing nonprofit-only grants, or excluding grants requiring certifications the business doesn't hold. This prevents the frustration of chasing ineligible opportunities, which is the primary reason businesses give up on grants.

## The Commercial Logic

For a tax advisory firm, offering grant matching alongside existing services creates a natural upsell that requires no new client acquisition. The firm's existing clients become platform users. The firm earns either a share of subscription revenue, a white-label licensing fee, or (in an acquisition) the full platform economics. The grant application pipeline — which tracks grants from discovery through award — generates ongoing engagement with clients throughout the year, not just during tax season. Success fees on awarded grants create a high-margin revenue stream directly tied to client outcomes. And the platform's readiness scoring gives the firm a new advisory offering: telling clients exactly what documents and registrations they need to become grant-ready, which often leads back to billable advisory work.
# Partnership Fit — Deal Structure Analysis

## The Three Structures

### (a) Acquisition — Can the codebase support it?

**Yes, with standard diligence items.** The codebase is a self-contained Next.js application with a PostgreSQL database (Supabase), Vercel hosting, and OpenAI/Stripe integrations. All code is in a single GitHub repository (`friedmangloballlc-collab/grantiq`). There are no proprietary hardware dependencies, no on-premise requirements, and no complex infrastructure to migrate.

**What transfers cleanly:**
- 369 source files, 41 database migrations, full schema
- 4,304 enriched grants with embeddings
- 471-source crawl directory
- 7 automated daily crons
- Stripe billing integration (8 price IDs across 4 tiers)
- All AI prompts and matching logic

**What requires transition work:**
- Supabase project transfer or database migration (~1 week)
- Vercel project transfer (~1 day)
- API key rotation for OpenAI, Stripe, Resend (~1 day)
- Domain transfer for grantaq.com (~1 day)
- No automated tests means acquirer must validate behavior manually or invest in test coverage (~2-4 weeks for comprehensive suite)

**Acquisition readiness: 7/10.** Clean codebase, standard stack, no exotic dependencies. Deductions for missing tests and CI/CD.

---

### (b) White-Label License — Can the codebase support it?

**Not today. Material engineering required.**

**What exists:**
- Multi-tenancy at DB layer (RLS policies on all org-scoped tables, `supabase/migrations/00010_rls_policies.sql`)
- Feature gate for `white_label` at enterprise tier (`src/lib/billing/feature-gates.ts:line ~180`)
- Two-firm data isolation already works (tested via org_members → org_id scoping)

**What does NOT exist:**
- **Custom branding per tenant:** The app renders "GrantAQ" everywhere. No tenant-specific logo, color, or copy configuration. (`src/app/layout.tsx` hardcodes "GrantAQ" in metadata, `src/components/layout/app-shell.tsx` hardcodes the logo)
- **Custom domain per tenant:** Vercel serves a single domain. No multi-domain routing or tenant-specific subdomain support.
- **Tenant-level settings admin:** No UI for a partner firm to manage their own branding, user invitations, or billing configuration.
- **Tenant-scoped billing:** Stripe is configured for a single merchant (GrantAQ). White-label would need either Stripe Connect (marketplace) or separate Stripe accounts per tenant.
- **Isolated grant libraries:** All tenants share the same 4,304 grants. A white-label partner might want to add proprietary grants or restrict which grants their clients see.

**Engineering estimate to stand up ONE branded instance:**

| Work Item | Effort | Assumptions |
|-----------|--------|-------------|
| Tenant branding config (logo, colors, name, domain) | 2 weeks | New `tenant_config` table, theme provider reads from DB |
| Custom domain routing | 1 week | Vercel supports custom domains per deployment; need middleware routing |
| Tenant admin dashboard | 2 weeks | UI for partner to manage users, view analytics, configure settings |
| Stripe Connect or separate billing | 2 weeks | Marketplace billing with revenue split |
| Tenant-scoped grant library | 1 week | Add `tenant_id` filter to grant queries, allow custom grant uploads |
| Testing and QA | 1 week | Manual QA across both tenant instances |
| **Total** | **~9 weeks** | One senior full-stack engineer, no scope creep |

**White-label readiness: 3/10.** Foundation is there (RLS, multi-tenancy), but the presentation layer is entirely single-brand.

---

### (c) Revenue-Share Partnership — Can the codebase support it?

**Yes, this is the lowest-friction option today.**

A revenue-share where the tax firm distributes GrantAQ to their clients requires:

| Requirement | Supported? | How |
|-------------|-----------|-----|
| Referral tracking | ✅ Yes | `supabase/migrations/00017_referrals.sql` — tracks referrer, referred user, status (pending→converted), $50 credit per referral |
| Partner attribution | ⚠️ Partial | Referral codes exist, but no "partner" entity. Would need a `partners` table to track firm-level attribution vs individual referrals |
| Revenue reporting | ⚠️ Partial | `subscriptions` table tracks tier/status per org, but no partner-level revenue rollup |
| Co-branded landing page | ❌ Not built | Would need a `/partners/[slug]` page with firm's name and logo |
| Bulk client onboarding | ❌ Not built | Each client signs up individually. No CSV import or firm-initiated invitations |

**Engineering estimate for rev-share partnership:**

| Work Item | Effort | Assumptions |
|-----------|--------|-------------|
| Partner entity + attribution | 3 days | New `partners` table, link referrals to partner, track originated revenue |
| Partner revenue dashboard | 1 week | Show partner: total referrals, active subscribers, monthly revenue share |
| Co-branded signup page | 3 days | `/partners/[slug]` with firm name, optional logo, auto-applied referral code |
| Bulk client invitation | 3 days | Partner uploads CSV of client emails, system sends branded invitations |
| Revenue share calculation + payout tracking | 1 week | Monthly calculation of partner's share, exportable for accounting |
| **Total** | **~3-4 weeks** | One engineer |

**Revenue-share readiness: 6/10.** Referral infrastructure exists. Needs partner-level entity and reporting.

---

## Recommendation

**Lead with (c) revenue-share, with a contractual option to upgrade to (b) white-label at a later date.**

Rationale:
1. Revenue-share requires ~3-4 weeks of engineering vs ~9 weeks for white-label
2. The tax firm can start distributing to clients within a month
3. Revenue-share proves demand before investing in white-label
4. The contract can include a milestone: "Once partner-originated ARR reaches $X, parties agree to convert to white-label with [defined terms]"
5. White-label becomes the upgrade path after validating the partnership works

**Which clients this attaches to:** Small business clients ($500K-$5M revenue) who file as LLCs, S-Corps, or nonprofits. Specifically:
- Clients with SAM.gov registration (the firm likely helped set this up)
- Clients in industries with strong federal grant programs (healthcare, technology, agriculture, energy, education)
- Clients with 3+ years of audited financials (required for larger federal grants)
- Clients who've asked about "alternative funding" or "government programs"

The tax firm already has every data point needed to pre-qualify clients for grant matching — entity type, NAICS code, revenue, employee count, EIN. The onboarding flow asks for exactly these inputs.
# Risk & Gap Register

## Security Posture

| Risk | Severity | Detail | File Reference |
|------|----------|--------|----------------|
| **No automated tests** | HIGH | 0 application test files. vitest installed but unused. Matching engine, filters, scoring logic all untested. | `package.json` (vitest in devDeps), no `tests/` directory with app tests |
| **No CI/CD pipeline** | HIGH | No GitHub Actions, no pre-commit hooks, no automated deployment gates. Code pushes directly to production via `git push origin master`. | `.github/workflows/` does not exist |
| **Admin client bypasses RLS** | MEDIUM | `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses all RLS. Used in 15+ API routes and 7 crons. A server-side code bug could leak cross-tenant data. | `src/lib/supabase/admin.ts:7-15` |
| **Security headers configured** | LOW (mitigated) | CSP, HSTS, X-Frame-Options, X-XSS-Protection all set. | `next.config.ts:3-16` |
| **Auth is cookie-based** | LOW | Supabase SSR auth with `getUser()` (server-side JWT validation, not `getSession()` which is forgeable). Correctly implemented. | `middleware.ts:21-46` |

## PII & Data Handling

| Risk | Severity | Detail |
|------|----------|--------|
| **EIN stored as encrypted JSONB** | LOW | `ein_encrypted` column uses field-level encryption via `FIELD_ENCRYPTION_KEY` env var. | 
| **Mission statements + project descriptions stored in plaintext** | MEDIUM | These contain business-sensitive information. No at-rest encryption beyond Supabase's default disk encryption. |
| **API keys in environment variables** | LOW | Standard practice. Keys not in code. Vercel env vars used for production. |
| **No data retention policy** | MEDIUM | No TTL on user data, no automated deletion, no GDPR right-to-erasure workflow (though account deletion endpoint exists at `src/app/api/account/delete/route.ts`). |
| **Grant data is public** | LOW | All grant information comes from public sources (Grants.gov, government websites). No PII in grant data. |

## SOC 2 / Compliance Readiness

| Requirement | Status | Gap |
|-------------|--------|-----|
| Access control | ✅ RLS enforced at DB layer | Role-based access (owner/admin/editor/viewer) defined but not enforced in RLS — application-level only |
| Audit logging | ✅ `audit_logs` table exists | Not populated — no code writes to it |
| Change management | ❌ No CI/CD | No deployment approvals, no code review gates |
| Data encryption in transit | ✅ HTTPS enforced (HSTS) | — |
| Data encryption at rest | ⚠️ Supabase default | No application-level encryption beyond EIN field |
| Incident response | ❌ No monitoring | No Sentry/DataDog/error tracking. Errors logged to Vercel function logs only |
| Vendor management | ⚠️ Partial | Dependencies on Vercel, Supabase, OpenAI, Stripe. No vendor assessment documentation |
| Business continuity | ❌ No backup strategy | Supabase provides daily backups on Pro plan, but no documented DR procedure |

**SOC 2 readiness: 2/10.** The foundation exists (auth, RLS, encryption) but documentation, monitoring, CI/CD, and audit trail are not implemented.

## SLA & Support Tooling

| Item | Status |
|------|--------|
| Uptime monitoring | ❌ Not configured (no Pingdom, UptimeRobot, etc.) |
| Error tracking | ❌ No Sentry or equivalent |
| Customer support | ✅ Crisp chat on marketing pages |
| Status page | ❌ Not implemented |
| SLA documentation | ❌ Not written |
| On-call rotation | ❌ Single developer |

## Grant Data Sourcing Risk

| Source | Risk Level | Detail |
|--------|-----------|--------|
| **Grants.gov API** | LOW | Official federal API. Public data. No ToS restrictions on commercial use. Free, no API key needed. `src/lib/ingestion/grants-gov-client.ts` |
| **SAM.gov API** | LOW | Official federal API. Requires free API key. `src/lib/ingestion/sam-gov-client.ts` |
| **USAspending.gov API** | LOW | Official federal API. Public, no key needed. `src/lib/ingestion/usaspending-client.ts` |
| **Web crawler (471 sources)** | MEDIUM-HIGH | Crawls foundation/corporate/state websites using cheerio + GPT-4o-mini extraction. User-Agent identifies as "GrantAQ-Bot". **No robots.txt checking implemented.** Some sites may have ToS prohibiting scraping. `src/lib/ingestion/web-crawler.ts:28-35` |
| **XLSX seed data** | LOW | One-time import from a curated spreadsheet. Static data, no ongoing licensing concern. `src/lib/ingestion/xlsx-parser.ts` |

**Primary risk:** The web crawler processes 10 websites daily from the grant_source_directory (471 sources). While most are government sites with public data, foundation and corporate websites may have ToS restrictions. The crawler does not check `robots.txt` before fetching. This is a **legal risk** that counsel should review.

## Key-Person / Bus-Factor Risk

| Risk | Severity | Detail |
|------|----------|--------|
| **Single developer** | HIGH | Entire codebase written by one person + AI pair programming. No other contributors in git history. |
| **No documentation** | HIGH | No README beyond CLAUDE.md (AI instructions). No architecture docs, no onboarding guide for new developers. |
| **No runbooks** | HIGH | Cron jobs, data pipeline, embedding generation — all undocumented operationally. |
| **Standard stack** | LOW (mitigating) | Next.js + Supabase + Stripe is mainstream. A senior full-stack engineer could onboard in 1-2 weeks. |

## Load-Bearing but Fragile Code

| Component | Risk | Detail |
|-----------|------|--------|
| **Matching pipeline in onboarding/complete** | HIGH | Single 280-line API route handles: embedding generation, vector recall, hard filtering, weighted scoring, match storage, readiness scoring. Any failure = no matches for user. No retry logic. `src/app/api/onboarding/complete/route.ts` |
| **useSyncExternalStore Date.now()** | MEDIUM | Multiple components use time-based rendering that previously caused React hydration crashes (#185). Fixed but fragile — any new time-dependent component could reintroduce. `src/components/shared/deadline-countdown.tsx`, `src/components/matches/match-filters.tsx` |
| **Vercel 60s function timeout** | MEDIUM | The onboarding/complete endpoint runs embedding + vector recall + filtering + scoring. Readiness scoring was moved to background to fit within 60s. If grant library grows significantly, matching may timeout again. |
| **No queue worker deployed** | MEDIUM | `worker/` directory exists with full job handlers, but is not deployed. All processing is inline in API routes. Email sequences, background jobs sit in `job_queue` with status "pending" forever. `worker/src/` (exists), no deployment config active |
# Meeting Prep — CFO of Tax Advisory Firm

## Top 5 Technical Questions They'll Ask

### 1. "How is client data isolated? If we bring our clients onto this, can other firms see their data?"

**Answer:** Data isolation is enforced at the database layer, not the application layer. Every table containing client data has a Row-Level Security (RLS) policy that restricts access to rows where `org_id IN (SELECT auth.user_org_ids())` — a PostgreSQL function that returns only the organizations the logged-in user belongs to. This runs inside the database engine itself, meaning even if application code has a bug, the database will not return data belonging to another organization. The policy is defined in `supabase/migrations/00010_rls_policies.sql` and applies to 20+ tables including grant_matches, readiness_scores, grant_pipeline, document_vault, and subscriptions. Server-side admin operations (cron jobs, webhooks) use a service role key that bypasses RLS — these routes validate authorization before executing.

### 2. "Where does the grant data come from? Are there licensing concerns?"

**Answer:** The primary source is the Grants.gov API — the official U.S. federal grant database. This is public data with no licensing restrictions. We also pull from SAM.gov (official federal registration database) and USAspending.gov (historical award data). All three are free federal APIs. The remaining grant data comes from our AI web crawler, which processes 471 registered source websites — state economic development agencies, community foundations, corporate grant programs. The crawler identifies itself via User-Agent header. The legal risk is that some foundation and corporate websites may have Terms of Service that restrict automated access. We currently do not check robots.txt before crawling. This is a point counsel should review. The seed data (~4,300 grants) was imported from a curated spreadsheet of publicly available grant information.

### 3. "What happens if OpenAI changes pricing or goes down?"

**Answer:** The system uses OpenAI for two things: text embeddings (grant search) and GPT-4o-mini (scoring, enrichment, chat). If OpenAI is unavailable, matching falls back to keyword-based search (`src/app/api/onboarding/complete/route.ts:125-165`) — users still get matches, just ranked by text relevance instead of semantic similarity. The AI model is abstracted behind `src/lib/ai/client.ts` — switching to Anthropic Claude (already configured as a reference provider) or another model requires changing one constant. Embeddings are generated once and stored — the 3,593 grants with embeddings continue to work even if OpenAI is down. Monthly OpenAI cost is approximately $8 at current usage, scaling to ~$60 at 2,000 users. This is not a material cost risk.

### 4. "Is this SOC 2 compliant?"

**Answer:** Not today. The security fundamentals are in place — database-layer access control (RLS), HTTPS-only with HSTS preload, field-level encryption for EINs, cookie-based JWT authentication with server-side validation. What's missing for SOC 2: no CI/CD pipeline (code deploys have no approval gate), no error monitoring (Sentry or equivalent), audit_logs table exists but isn't populated, no documented incident response or business continuity procedures, and no automated test suite. Estimated effort to reach SOC 2 Type I readiness: 8-12 weeks with a dedicated engineer plus compliance consultant. The architecture doesn't have structural blockers — it's documentation, monitoring, and process work.

### 5. "Can we see this working with real data before committing?"

**Answer:** Yes. The platform is live at grantaq.com with 4,304 active grants, all enriched with eligibility types and sector classifications. A demo account can be created in 3 minutes — the 16-question onboarding produces real matches against the live grant library. The matching pipeline runs inline (no background queue dependency), so results appear within 15 seconds. The demo would show: onboarding flow, match results with factual criteria explanations, grant detail pages, readiness scoring, the upgrade wall (tier gating), and the pipeline board. We can create a demo with a profile matching a typical client of their firm.

---

## Top 3 Commercial Questions to Ask Them

### 1. "How many of your clients would you estimate are eligible for federal or state grants today — and how many of them know it?"

**Why this matters:** This sizes the opportunity. If they say "most of our SMB clients" but "almost none know it," the distribution value is high and a revenue-share makes sense. If they say "a niche subset," white-label might not justify the investment. The answer also tells you whether they see this as a bolt-on to existing advisory (rev-share) or a new practice area (acquisition/white-label).

### 2. "Would your firm want to be the brand your clients associate with this — or would you prefer to offer it as a recommended tool?"

**Why this matters:** This directly determines structure. "We want our name on it" = white-label (9 weeks of engineering). "We'd recommend it" = revenue-share (3-4 weeks). "We want to own it" = acquisition. Don't pitch a structure before they answer this. Their answer also reveals how deep they want the integration — are they imagining this inside their client portal, or as a separate tool they link to?

### 3. "What does your client onboarding process look like today, and what data do you already collect from new clients?"

**Why this matters:** The onboarding asks for entity type, NAICS, revenue, employee count, SAM status, EIN, certifications, and state. A tax firm already has ALL of this. If they have a client intake form or CRM, the highest-value integration is pre-filling the GrantAQ profile from their existing data — which turns a 3-minute onboarding into a zero-friction experience. This could be the key differentiator that makes the partnership sticky. It also opens a technical discussion about API integration that raises the perceived sophistication of your product.

---

## One Thing You Should Not Say

**Do not say: "We have a white-label-ready platform that your firm can brand as your own."**

The code does not support this. The feature gate for `white_label` exists as a string in `src/lib/billing/feature-gates.ts` under the enterprise tier, but there is zero implementation behind it. There is no tenant-specific branding, no custom domain routing, no partner admin dashboard, no tenant-scoped billing via Stripe Connect, and no configurable logos or themes. Every page renders "GrantAQ" with hardcoded metadata, icons, and colors. If the CFO's technical advisor asks to see the white-label configuration panel, there is nothing to show.

**What to say instead:** "The architecture supports multi-tenancy — each firm's client data is isolated at the database layer. White-label branding is on our roadmap and would take approximately 9 weeks to deliver for a committed partner. For a faster start, we can launch a co-branded referral program in 3-4 weeks that gives your firm attribution, a partner dashboard, and revenue share on every client who subscribes."

This is honest, positions the revenue-share as speed-to-market, and frames white-label as an earned upgrade — which is exactly the deal structure the codebase actually supports.
