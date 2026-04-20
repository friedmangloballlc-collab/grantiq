# Progress Log: Unit 1 — Schema prerequisites

## Session: 2026-04-19

### Setup
- **Status:** complete
- **Started:** 2026-04-19
- Actions taken:
  - Initialized planning-with-files trio (`task_plan.md`, `findings.md`, `progress.md`) at grantiq repo root
  - Scoped to Unit 1 of `docs/plans/2026-04-19-001-feat-grantiq-aicall-anthropic-extension-plan.md`
  - Pre-loaded findings.md with prior brainstorm + plan research so Phase 1 can start without re-discovery
- Files created/modified:
  - `task_plan.md` (created)
  - `findings.md` (created)
  - `progress.md` (created)

### Phase 1: Live-DB inventory
- **Status:** complete
- **Started:** 2026-04-19 16:54 (Q1)
- **Completed:** 2026-04-19 17:00 (Q5)
- Actions taken:
  - Q1: confirmed `tier_limits` columns: `id`, `tier`, `feature`, `monthly_limit`, `per_request_limit`. Column is `feature`. Bonus: `per_request_limit` exists.
  - Q2: `ai_generations` is empty — BD-1 confirmed (every insert silent-failed). No backfill needed.
  - Q3: `ai_usage` has 1 row (`readiness_score`). No CHECK widening risk.
  - Q4: growth tier has 5 rows but `feature` values don't match `ACTION_TO_FEATURE` — same effective behavior as missing rows (unlimited usage).
  - Q5: confirmed BD-2 is growth-only. Enterprise + free use canonical names. Migration 00050 is 4 targeted UPDATEs.
- Files created/modified:
  - `findings.md` (live DB inventory section populated, ~6 surprises documented)
  - `task_plan.md` (Q1-Q5 marked complete)
- Discoveries forwarded to subsequent phases:
  - BD-2 fix shape (Phase 3): 4 UPDATEs scoped to growth tier only
  - BD-1 fix shape (Phase 3): clean DROP/ADD CONSTRAINT, no backfill needed
  - Open product question (Phase 2 or escalate): `strategy` feature mapping decision
  - Open product question (escalate): enterprise tier `ai_drafts: 5`, `ai_logic_models: 3` not unlimited — intentional?
  - Bonus: `per_request_limit` column exists but is NULL across growth — Unit 6 may want to seed it
  - Anomaly: only 1 `ai_usage` row total in production — sanity check after Unit 1 ships
- P1 incident ticket recommendation: Growth-tier monthly limits not enforced since launch (file separately from this Anthropic-extension work)

### Phase 2: Enum source of truth + ACTION_TO_FEATURE update
- **Status:** complete
- **Started + completed:** 2026-04-19 17:05
- Actions taken:
  - Added `AI_ACTION_TYPES` const + `AiActionType` type to `src/lib/ai/usage.ts` (10 values, source-of-truth comment block explains the 3-step protocol for adding new types)
  - Updated `ACTION_TO_FEATURE` to `Record<AiActionType, string>`; added `eligibility_status: 'eligibility_scores'`; mapped `rewrite/loi/budget` → `ai_drafts` for forward compatibility
  - Changed `checkUsageLimit` + `RecordUsageParams.actionType` signatures to `AiActionType`; removed the `|| actionType` fallback (no longer needed, type-safe)
  - Changed `AiCallOptions.actionType` to `AiActionType` in `src/lib/ai/call.ts`; imported `type AiActionType` from `@/lib/ai/usage`
  - Verified `npx tsc --noEmit` returns 0 errors
  - Confirmed via grep that all 5 live actionType strings are valid members of the new union: `eligibility_status`, `match`, `chat`, `readiness_score`, `roadmap`
- Files created/modified:
  - `src/lib/ai/usage.ts` (modified)
  - `src/lib/ai/call.ts` (modified)
- Discoveries:
  - Strategy engine emits `actionType: "roadmap"`, NOT `"strategy"`. Confirms the growth-tier `tier_limits` row labeled `'strategy'` is dead — nothing looks it up. Safe to delete in Phase 3 BD-2 fix.
  - `'strategy'` does NOT need to be added to `AI_ACTION_TYPES` (no engine emits it).

### Phase 3: Write migration 00049 + 00050
- **Status:** complete
- **Started + completed:** 2026-04-19 17:08
- Actions taken:
  - Wrote `supabase/migrations/00049_fix_ai_recording_schema.sql` — widens both ai_generations.generation_type and ai_usage.action_type CHECK constraints to the 10-value AI_ACTION_TYPES enum. No backfill needed (Q2/Q3 confirmed clean state). Pattern matches `00031_add_growth_tier.sql`.
  - Wrote `supabase/migrations/00050_reconcile_tier_limits_growth.sql` — 4 UPDATEs to fix growth-tier feature names (match→matching_runs, readiness→readiness_scores, writing→ai_drafts, chat→grantie_messages); DELETE the dead 'strategy' row; INSERT pro ai_drafts row with placeholder limit=50.
- Files created/modified:
  - `supabase/migrations/00049_fix_ai_recording_schema.sql` (created)
  - `supabase/migrations/00050_reconcile_tier_limits_growth.sql` (created)
- Decisions made (per user via AskUserQuestion):
  - Pro ai_drafts: add row with placeholder monthly_limit=50
  - Growth strategy row: DELETE (dead code)
- Deferred items (not blocking):
  - eligibility_scores tier_limits seeding — eligibility route uses skipUsageCheck:true so feature isn't enforced. Add when bypass is removed.

### Phase 4: Update call.ts insert + Sentry tripwire
- **Status:** complete
- **Started + completed:** 2026-04-19 17:18
- Actions taken:
  - Added `import * as Sentry from "@sentry/nextjs";` to call.ts
  - Added `userId` to aiCall function destructuring (line 64-75)
  - Rewrote the ai_generations insert: `{ org_id, user_id, generation_type, model_used, tokens_input, tokens_output, estimated_cost_cents }` — matches schema exactly
  - Added defensive early-return `if (!userId)` in generationsPromise — emits ai_recording_failed to both logger and Sentry with reason='missing_user_id'
  - Replaced existing logger.error("Failed to record ai_generations entry", ...) with logger.error("ai_recording_failed", { table, org_id, action_type, err }) + Sentry.captureException
  - Added 8-line comment block above the insert documenting BD-1 history so future readers understand the schema-mismatch context
- Files created/modified:
  - `src/lib/ai/call.ts` (modified: +28 lines, -3 lines)
- Verification:
  - `npx tsc --noEmit` returned 0 errors
  - Grep confirmed all 5 production aiCall sites (grantie, match, readiness, strategy, eligibility-status) pass `userId` — defensive branch is safety net, not active code path

### Phase 5: Tests
- **Status:** complete
- **Started + completed:** 2026-04-19 17:21
- Actions taken:
  - Created `tests/lib/ai/call.test.ts` (185 lines, 7 tests). Covers: BD-1 column-name fix, missing-userId defensive branch, insert-failure observability tripwire. Mocks: `@/lib/supabase/admin`, `@/lib/ai/client`, `@/lib/ai/sanitize`, `@/lib/ai/usage` (preserves real types via `importOriginal`), `@sentry/nextjs`.
  - Extended `tests/lib/ai/usage.test.ts` with: (a) `eligibility_status` → `eligibility_scores` feature mapping test, (b) `AI_ACTION_TYPES` enum invariant test asserting every enum value resolves to a non-empty feature in `checkUsageLimit`.
  - Verified: `npx vitest run tests/lib/ai/call.test.ts tests/lib/ai/usage.test.ts` returns 2 files passed, 21 tests passed in 128ms.
- Files created/modified:
  - `tests/lib/ai/call.test.ts` (created)
  - `tests/lib/ai/usage.test.ts` (modified — added imports, +2 unit tests, +1 describe block for AI_ACTION_TYPES)
- Test inventory recorded in Test Results table below

### Phase 6: Verification + cleanup
- **Status:** complete (agent-side); production smoke pending after deploy 2026-04-19 17:25
- **Started + completed:** 2026-04-19 17:23
- Actions taken (agent-side):
  - Grep "Failed to record ai_generations" in src/ → 0 hits (old log message removed) ✓
  - Grep "ai_recording_failed" in src/ → 5 hits in call.ts (canonical tag in place) ✓
  - Grep schema columns at call.ts:157-159 → user_id, generation_type, model_used confirmed ✓
  - Migration files on disk: supabase/migrations/00049_fix_ai_recording_schema.sql + 00050_reconcile_tier_limits_growth.sql ✓
  - Final npx tsc --noEmit → 0 errors ✓
  - Full test suite (npx vitest run): 173 passed, 1 failed (pre-existing in pricing.test.ts, unrelated — confirmed via git history check on commit f5ab33f and no diff in Unit 1 work)
- Remaining (user-side):
  - Trigger any AI action in the live app + run `SELECT * FROM ai_generations ORDER BY created_at DESC LIMIT 1;` — expect first non-zero row ever, with user_id populated
  - Run `SELECT feature, monthly_limit FROM tier_limits WHERE tier='growth' ORDER BY feature;` — expect canonical names (ai_drafts, grantie_messages, matching_runs, readiness_scores), no 'strategy' row
  - If migration 00049/00050 didn't run automatically post-Vercel-deploy, run `npx supabase migration up` against prod manually
- Files created/modified across all phases:
  - Code: src/lib/ai/usage.ts, src/lib/ai/call.ts (Phase 2 + 4)
  - Migrations: supabase/migrations/00049_fix_ai_recording_schema.sql, supabase/migrations/00050_reconcile_tier_limits_growth.sql (Phase 3)
  - Tests: tests/lib/ai/call.test.ts (created), tests/lib/ai/usage.test.ts (extended) (Phase 5)
  - Planning: task_plan.md, findings.md, progress.md (this trio)
- Pre-existing test failure flagged for separate ticket: `tests/lib/ai/writing/pricing.test.ts > "returns correct prices for all tier/type combinations"` — `getWritingPrice("tier1_ai_only", "sbir_sttr")` does not return 49900 as expected. Last touched commit f5ab33f (premium pricing rollout); not caused by Unit 1.

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| call.test.ts: insert uses correct columns | aiCall happy path | INSERT contains user_id, generation_type, model_used | matched | ✓ |
| call.test.ts: insert avoids legacy column names | aiCall happy path | INSERT has no action_type or model props | confirmed | ✓ |
| call.test.ts: missing-userId skips insert | aiCall without userId | no ai_generations insert | confirmed | ✓ |
| call.test.ts: missing-userId emits Sentry | aiCall without userId | Sentry.captureException with ai_recording_failed + missing_user_id | matched | ✓ |
| call.test.ts: missing-userId returns success | aiCall without userId | AiCallResult.content === "ok" | matched | ✓ |
| call.test.ts: insert error emits Sentry | aiCall with DB error | Sentry.captureException with ai_recording_failed + ai_generations | matched | ✓ |
| call.test.ts: insert error returns success | aiCall with DB error | AiCallResult.content === "ok" | matched | ✓ |
| usage.test.ts: eligibility_status maps to eligibility_scores | checkUsageLimit('eligibility_status') | tier_limits.feature query = 'eligibility_scores' | matched | ✓ |
| usage.test.ts: every AI_ACTION_TYPES enum value resolves to a feature | iterate enum | each call uses non-empty string feature | matched | ✓ |
| usage.test.ts: existing 12 tests | unchanged | unchanged | unchanged | ✓ |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-04-19 17:08 | Phase 3 migration 00050 included `INSERT INTO tier_limits ('pro', 'ai_drafts', 50)` based on misread of cropped Q5b screenshot — pro tier was assumed to be missing ai_drafts. Subsequent full screenshot revealed pro DOES have ai_drafts=2. The INSERT would have created a duplicate row (tier_limits has no UNIQUE constraint on tier+feature, only `id` PK). | 1 | Removed the INSERT entirely. Pro doesn't need it. Documented in migration comment. Logged the missing UNIQUE (tier, feature) constraint as a separate follow-up task. |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Unit 1 complete (agent-side). 2 user-side DB verification steps remaining (apply migrations locally + smoke aiCall). |
| Where am I going? | Once user applies migrations locally and smoke passes, Unit 1 fully closes and unblocks Units 2-9 of the plan at docs/plans/2026-04-19-001-feat-grantiq-aicall-anthropic-extension-plan.md |
| What's the goal? | Repair silently-failing ai_generations insert + reconcile growth-only BD-2 + lay down enum/observability prereqs (DONE in code) |
| What have I learned? | BD-1 was real (ai_generations empty in prod for the entire history); BD-2 is growth-only (4 UPDATEs + 1 DELETE); pro ai_drafts misread caught pre-deploy; tier_limits has no UNIQUE constraint (separate hardening task); AI_ACTION_TYPES enum compiles clean across all 5 production callers; Sentry already installed |
| What have I done? | Phase 1 (5 SELECTs + 1 follow-up). Phase 2 (enum + ACTION_TO_FEATURE; tsc 0 errors). Phase 3 (migrations 00049 + 00050; bug-corrected). Phase 4 (call.ts insert fix + Sentry tripwire; tsc 0 errors). Phase 5 (21 tests passing across 2 files). Phase 6 (grep + tsc + test suite verification). |

---
*Update after completing each phase or encountering errors*
