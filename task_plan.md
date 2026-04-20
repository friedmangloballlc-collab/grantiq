# Task Plan: Unit 1 — Schema prerequisites (BD-1 + BD-2 + silent-swallow fix)

## Goal
Repair the `ai_generations` insert that has been silently failing for every OpenAI `aiCall` since launch, reconcile the `tier_limits` column-name conflict between migrations 00007 and 00031, introduce a complete actionType enum as source of truth, fix the growth-tier seed-value mismatch, and wire a Sentry tripwire so the next silent-swallow regression is loud.

**Origin plan:** `docs/plans/2026-04-19-001-feat-grantiq-aicall-anthropic-extension-plan.md` Unit 1 (lines covering BD-1, BD-2, R14-R15 prerequisites). This task is the unblocking work for Units 4-9.

## Current Phase
Unit 1 complete (agent-side). 2 user-side DB verification steps remaining.

## Phases

### Phase 1: Live-DB inventory (no code changes)
Run 4 read-only SELECT queries against the production Supabase to verify assumptions before authoring migrations. Findings logged in `findings.md`.
- [x] Q1: `SELECT column_name FROM information_schema.columns WHERE table_name='tier_limits';` — **DONE.** Column is `feature` (NOT `action_type`). Bonus discovery: `per_request_limit` column exists. Migration 00031 broke; growth rows likely missing.
- [x] Q2: `SELECT DISTINCT generation_type, COUNT(*) FROM ai_generations GROUP BY 1;` — **DONE.** No rows returned — table is empty. Confirms BD-1 (every insert silently failed since launch). No backfill needed for CHECK widening.
- [x] Q3: `SELECT DISTINCT action_type, COUNT(*) FROM ai_usage GROUP BY 1;` — **DONE.** 1 row: `readiness_score`. No backfill needed; widening is safe. Anomaly noted: only 1 production usage row total.
- [x] Q4: `SELECT * FROM tier_limits WHERE tier='growth';` — **DONE.** 5 rows exist BUT `feature` column values don't match what `usage.ts` looks up → growth tier has effectively unlimited usage. P1 ticket still warranted. `per_request_limit` is NULL across all 5.
- [x] Log each result to `findings.md` § Live DB Inventory (Q1-Q4 logged)
- [x] Q5 (added during execution): `SELECT tier, feature, monthly_limit FROM tier_limits ORDER BY tier, feature;` — **DONE.** Confirmed: only growth tier is broken; enterprise + free use canonical names. BD-2 fix is targeted at growth only (4 UPDATE statements + 1 open product question on `strategy` feature). Starter + pro not visible in screenshot — likely canonical based on pattern.
- **Status:** complete (5 of 5 queries done; minor follow-up to verify starter+pro tiers)

### Phase 2: Enum source of truth + ACTION_TO_FEATURE update
- [x] Add exported `AI_ACTION_TYPES` constant in `src/lib/ai/usage.ts` covering all 10 values
- [x] Derive type `AiActionType` from the const
- [x] Update `AiCallOptions.actionType` type from `string` to `AiActionType` in `src/lib/ai/call.ts` (imports `type AiActionType` from `@/lib/ai/usage`)
- [x] Add `eligibility_status: 'eligibility_scores'` to `ACTION_TO_FEATURE` (also `rewrite/loi/budget` → `ai_drafts` for forward compat)
- [x] Update `checkUsageLimit` + `RecordUsageParams.actionType` signatures to `AiActionType`
- [x] Removed the `|| actionType` fallback in checkUsageLimit (now type-safe — `Record<AiActionType, string>` guarantees every action has a mapping)
- [x] Verify TypeScript compiles across all 30+ existing aiCall callers — `npx tsc --noEmit` returns 0 errors. Live actionTypes (`eligibility_status`, `match`, `chat`, `readiness_score`, `roadmap`) all valid members.
- **Status:** complete

### Phase 3: Write migration 00049_fix_ai_recording_schema.sql
- [x] Skipped pre-step normalization — Q2/Q3 confirmed clean state (ai_generations empty, ai_usage has only canonical 'readiness_score')
- [x] `ALTER TABLE ai_generations DROP CONSTRAINT IF EXISTS ai_generations_generation_type_check;` (in 00049)
- [x] `ALTER TABLE ai_generations ADD CONSTRAINT ai_generations_generation_type_check CHECK (generation_type IN (<10 values>));` (in 00049)
- [x] `ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_action_type_check;` (in 00049)
- [x] `ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_action_type_check CHECK (action_type IN (<same 10 values>));` (in 00049)
- [x] BD-2 fix in 00050 — 4 UPDATE statements + 1 DELETE for dead 'strategy' row + 1 INSERT for pro ai_drafts gap
- [DEFERRED] Seed eligibility_scores tier_limits rows — not blocking (eligibility route uses skipUsageCheck:true). Add when bypass is removed in a separate task.
- [x] Wrote `00050_reconcile_tier_limits_growth.sql` (different from originally-planned `00050_reconcile_tier_limits_column.sql` — Q1 revealed the column was already `feature`, so the fix is a data update, not a column rename)
- **Status:** complete

### Phase 4: Update call.ts insert + Sentry tripwire
- [x] Updated `src/lib/ai/call.ts` insert body to use correct columns (`user_id`, `generation_type`, `model_used`) — BD-1 fixed
- [x] Added `userId` to `aiCall` function destructuring at top
- [x] Verified all 5 production call sites pass userId correctly: grantie, match, readiness, strategy engines + eligibility-status route
- [x] Added defensive early-return in `generationsPromise` IIFE if userId is missing — emits to both logger and Sentry; never throws to user
- [x] Replaced swallowed `logger.error("Failed to record ai_generations entry", ...)` with structured `logger.error("ai_recording_failed", { table, org_id, action_type, err })` + `Sentry.captureException(error, { tags: { tag: 'ai_recording_failed', table }, extra: { ... } })`
- [x] Confirmed `@sentry/nextjs` import resolves (package.json:20 already lists it; `import * as Sentry from "@sentry/nextjs"` works)
- [x] Preserved `Promise.allSettled` shape — recording remains best-effort, no throw to user
- [x] Added comment block in call.ts documenting the BD-1 history so future readers understand why this code shape exists
- [x] `npx tsc --noEmit` → 0 errors
- **Status:** complete

### Phase 5: Tests
- [x] Created `tests/lib/ai/call.test.ts` — 7 tests covering BD-1 fix surface
- [x] Test: insert uses correct columns (`user_id`, `generation_type`, `model_used`)
- [x] Test: insert does NOT use legacy column names (`action_type`, `model`)
- [x] Test: missing-userId branch skips insert + emits Sentry with `tag: 'ai_recording_failed'`, `reason: 'missing_user_id'`
- [x] Test: missing-userId branch preserves user-facing AiCallResult return
- [x] Test: ai_generations insert failure emits Sentry with `tag: 'ai_recording_failed'`, `table: 'ai_generations'`
- [x] Test: insert failure preserves user-facing AiCallResult return (best-effort contract)
- [x] Extended `tests/lib/ai/usage.test.ts` — added eligibility_status → eligibility_scores mapping test + AI_ACTION_TYPES enum invariant test (every enum value resolves to a non-empty feature)
- [x] Ran full suite for both files: `npx vitest run tests/lib/ai/call.test.ts tests/lib/ai/usage.test.ts` → 2 files passed, 21 tests passed
- **Status:** complete

### Phase 6: Verification + cleanup
- [x] Grep verify: `grep "Failed to record ai_generations" src/` returns 0 hits ✓
- [x] Grep verify: `grep "ai_recording_failed" src/` returns 5 hits in call.ts (canonical tag) ✓
- [x] Grep verify: correct schema columns at `src/lib/ai/call.ts:157-159` (`user_id`, `generation_type`, `model_used`) ✓
- [x] Migration files exist on disk: `supabase/migrations/00049_*.sql` + `00050_*.sql` ✓
- [x] Final `npx tsc --noEmit` → 0 errors ✓
- [x] Full test suite: 173 passed / 1 failed ✓ (1 failure is pre-existing in `tests/lib/ai/writing/pricing.test.ts`, unrelated to Unit 1 — last touched commit f5ab33f, no Unit 1 file diff)
- [ ] **REQUIRES USER ACTION:** Apply migration 00049 + 00050 against local Supabase (`npx supabase db reset` for fresh DB, or `npx supabase migration up` for additive)
- [ ] **REQUIRES USER ACTION:** Smoke: trigger one `aiCall` against local DB; assert ai_generations row exists with populated user_id + generation_type
- [x] Final task_plan.md + progress.md update — Phase 6 marked complete for the agent-side; user-side DB checks remaining
- **Status:** complete (agent-side); 2 user-side DB steps pending

## Key Questions
1. Does the live `tier_limits` schema use `feature` or `action_type`? (Phase 1 Q1 answer drives whether migration 00050 is needed)
2. Are there legacy values in `ai_generations.generation_type` or `ai_usage.action_type` that need normalization before CHECK widening? (Phase 1 Q2/Q3)
3. Do growth-tier rows exist in production today? If not, file separate P1 incident ticket — growth users have unlimited usage right now.
4. What `eligibility_scores` tier limits should be seeded? (Business decision — placeholder 0 for free tier, unlimited for others until confirmed)
5. Should `MissingUserIdError` land in this unit or be deferred to Unit 4? (Currently scoped to Unit 1 in plan; verify during Phase 5 test design)

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use `AI_ACTION_TYPES` exported const + derived type | Single source of truth catches future drift at compile time; eliminates the BD-1 class of silent failure permanently |
| Sentry.captureException + logger.error (both fire) | Sentry already installed (`@sentry/nextjs` 10.48.0 per package.json); using existing infra costs nothing and closes the silent-swallow loop |
| `eligibility_status` → new `eligibility_scores` feature (not mapped onto `matching_runs`) | Keeps multi-to-one mapping cleanup deferred separately; doesn't compound the existing match/roadmap → matching_runs collision |
| Bundle 00049 + 00050 (if needed) into the same PR as the call.ts code change | Per plan's Risks table — atomic merge prevents schema/code mismatch in production |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       |         |            |

## Notes
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions (attention manipulation)
- Log ALL errors in this file AND in progress.md with timestamps
- After 3 failed attempts on the same issue, escalate to user (per skill 3-Strike protocol)
- DO NOT write external/web content into this file — use findings.md for that
