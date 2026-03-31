# GrantIQ Final Audit Report — 6 Agent Comprehensive Review

---

## CRITICAL ISSUES (Fix Immediately)

| # | Issue | Agent | Impact |
|---|-------|-------|--------|
| 1 | `estimateCostCents()` returns dollars, not cents — 100x undercount | AI | All cost tracking is wrong |
| 2 | LOI generator uses invalid model ID `claude-sonnet-4-5` | AI | LOI generation completely broken |
| 3 | Rules of Hooks violation on write page | Frontend | **FIXED** — useState after early return |
| 4 | Optimistic subscription upgrade before payment | Security | Users get paid tier without paying |
| 5 | 6 failing tests (cache mocks not updated) | Code Quality | CI/CD would block deploys |
| 6 | 3 missing DB tables (partner_applications, partner_referrals, grant_lois) | Database | Partner program + LOI persistence broken |
| 7 | 8+ missing columns (org_profiles, grant_outcomes) | Database | Analytics, dashboard, sequences crash |

## HIGH ISSUES (Fix This Week)

| # | Issue | Agent | Impact |
|---|-------|-------|--------|
| 8 | Middleware uses `getSession()` not `getUser()` | Security | Auth bypass possible via forged cookie |
| 9 | Writing routes missing org membership checks (IDOR) | Security | Any user can upload RFPs to any org |
| 10 | Writing pipeline (8 files) bypasses aiCall() | AI | No injection detection, no usage limits, no cost tracking |
| 11 | Cache module exists but never integrated | AI | Every AI call pays full cost regardless of changes |
| 12 | `/pricing` route doesn't exist — linked from 3 places | Frontend | **FIXED** — redirects to /upgrade and /#pricing |
| 13 | Industry grant footer links wrong path | Frontend | **FIXED partially** — needs /grants/industry/ prefix |
| 14 | Analytics tier names "applicant"/"growth" don't match OrgContext | Frontend | **FIXED** — updated tier references |
| 15 | `auth.user_org_ids()` vs `public.user_org_ids()` schema mismatch in migrations | Database | Later migrations fail if run sequentially |

## MEDIUM ISSUES (Fix This Sprint)

| # | Issue | Agent |
|---|-------|-------|
| 16 | No rate limiting on AI endpoints or signup | Security |
| 17 | No Content-Security-Policy header | Security |
| 18 | CORS wildcard on embed endpoints | Security |
| 19 | Error messages leak implementation details | Security |
| 20 | PostgREST filter injection via .or() interpolation | Security |
| 21 | calibrateScores() doesn't re-derive win_probability after recalculation | AI |
| 22 | Feedback collected but never consumed for model improvement | AI |
| 23 | 77 console statements should use structured logger | Code Quality |
| 24 | 21 TypeScript `any` types | Code Quality |
| 25 | LOI page charges $49 with no payment gate | Frontend |
| 26 | Mobile nav ignores progressive sidebar phases | Frontend |
| 27 | Server-side fetch() with relative URLs fails silently | Security |
| 28 | 15 missing database indexes | Database |
| 29 | N+1 query patterns in 4 files | Database |
| 30 | `full_migration.sql` inconsistent with individual migrations | Database |

## LOW ISSUES

| # | Issue | Agent |
|---|-------|-------|
| 31 | cache.ts orphaned (never imported) | AI |
| 32 | DraftResult import unused in pipeline.ts | AI |
| 33 | certCriteria never passed to AppSidebar | Frontend |
| 34 | Blog uses dangerouslySetInnerHTML (safe for now, static content) | Security |
| 35 | Job status check bypassed when org_id missing | Security |
| 36 | Duplicate index in migration 00026 | Database |

---

## FEATURE COMPLETENESS (from Product Manager audit — pending)

*Waiting for feature completeness agent to report.*

---

## WHAT WAS ALREADY FIXED IN THIS AUDIT

- [x] Rules of Hooks violation on write page (useState after early return)
- [x] /pricing links → redirected to /upgrade and /#pricing
- [x] Analytics tier names "applicant"/"growth" → "growth" consistently

## PRIORITY FIX ORDER

1. Fix `estimateCostCents()` — multiply by 100 (1 line)
2. Fix LOI model ID — change to MODELS.SCORING (1 line)
3. Fix 6 failing tests — update cache mocks
4. Remove optimistic subscription upgrade in checkout route
5. Fix middleware `getSession()` → `getUser()`
6. Add org membership checks to writing routes
7. Create missing DB tables + columns migration
8. Standardize `public.user_org_ids()` in all migrations
