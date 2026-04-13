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
