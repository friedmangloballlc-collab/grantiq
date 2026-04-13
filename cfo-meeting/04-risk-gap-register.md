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
