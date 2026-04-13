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
