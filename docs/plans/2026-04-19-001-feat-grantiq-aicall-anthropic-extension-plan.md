---
title: "feat: Extend aiCall for Anthropic + prompt caching + promptId (draft-generator migration)"
type: feat
status: active
date: 2026-04-19
origin: docs/brainstorms/2026-04-19-grantiq-llm-gateway-extension-requirements.md
---

# feat: Extend aiCall for Anthropic + prompt caching + promptId

## Overview

Extend the existing `aiCall()` wrapper in `src/lib/ai/call.ts` to cover the Anthropic provider, add Anthropic prompt caching via `cacheableContext`, introduce a `promptId` observability tag, and migrate `src/lib/ai/writing/draft-generator.ts` onto the extended wrapper. Week-1 scope is one file (draft-generator) — the other 8 Anthropic-using files in `src/lib/ai/writing/` remain on direct `new Anthropic()` and migrate in week 2 after this pattern is validated.

This plan also repairs three latent production bugs surfaced in brainstorm doc-review that must land before or alongside the Anthropic work: the `ai_generations` insert has been silently failing for every OpenAI `aiCall` (schema mismatch swallowed by `Promise.allSettled`), the `tier_limits` column name is inconsistent between migrations `00007` and `00031`, and the `draft-generator` currently bypasses the aiCall gate entirely so the highest-cost path in the product has zero usage enforcement, injection detection, or cost recording.

## Problem Frame

GrantIQ's AI surface is ~34 services split between OpenAI (gated by `aiCall`) and Anthropic (ungated, direct SDK instantiation in **10 `writing/*` files** — `ai-auditor`, `coherence-checker`, `compliance-sentinel`, `draft-generator`, `funder-analyzer`, `loi-generator`, `narrative-memory`, `review-simulator`, `rfp-parser`, plus `budget-narrative` which imports `getAnthropicClient()` rather than `new Anthropic()` but still bypasses `aiCall`). The expensive path is the unobserved path. Prompt caching on Anthropic offers a documented 59-70% bill reduction at ≥73% cache hit rate (ProjectDiscovery, 2025) for the exact prompt shape draft-generator exhibits — a ~178-line system prompt plus a repeatedly-sent org profile across 6-8 section calls per proposal. Closing the ungated gap and adding caching in one bounded patch is materially cheaper than either deferring cost control post-launch or building a fresh Gateway abstraction (see origin: `docs/brainstorms/2026-04-19-grantiq-llm-gateway-extension-requirements.md`).

## Requirements Trace

Every requirement from the origin document has an implementation unit assignment. R-numbers match the origin doc verbatim.

- **R1-R6** (API surface: `provider`, `cacheableContext`, `promptId`, result shape) → Unit 4
- **R7-R11** (cache control auto-marking, TTLs, stable prefix) → Unit 4
- **R12** (injection/sanitize on `userInput` + `cacheableContext`) → Unit 4
- **R13** (session_id dedupe via partial unique index + ON CONFLICT DO UPDATE) → Unit 5
- **R13a** (token-based soft cap with pre-flight estimation) → Unit 6
- **R14-R15** (ai_usage + ai_generations recording; new columns) → Unit 1 (BD-1 fix) + Unit 4 (new columns) + Unit 5 (session)
- **R16** (`estimateAnthropicCostCents` sibling function, tiered pricing) → Unit 4
- **R17** (migrate inner `generateSection` + `generateBudget`; delete `_trackUsage`) → Unit 7
- **R18** (refactor `buildDraftSectionPrompt` to expose stable prefix; 7 fields out) → Unit 3
- **R19-R20** (org profile into `cacheableContext`; section-volatile into `userInput`) → Unit 7
- **R19a** (canonical stable-stringify with stability + semantic tests) → Unit 2
- **R19b** (preserve sequential section execution) → Unit 7
- **R21-R22** (scope: other 8 `writing/*` files + engines/* unchanged) → Scope Boundaries (this plan does not touch them)
- **R23-R25** (observability: `prompt_id` column, cache-token columns, ad-hoc SQL) → Unit 4
- **R26** (Anthropic content-block → string normalization) → Unit 4
- **R27** (retry semantics: 2 attempts, no double-gating, no error echo) → Unit 4
- **BD-1** (ai_generations schema bug + silent-swallow fix) → Unit 1
- **BD-2** (tier_limits column conflict + growth tier seed mismatch) → Unit 1
- **SG-1, SG-2** (pre-deploy staging smoke tests) → Unit 9
- **PG-1 through PG-7** (production gates) → Unit 9
- **Rollout Strategy** (feature flag + per-org circuit breaker) → Unit 8

## Scope Boundaries

- **Only `draft-generator.ts` migrates in week 1.** The other 9 `writing/*` files that bypass `aiCall` (`ai-auditor`, `funder-analyzer`, `review-simulator`, `rfp-parser`, `compliance-sentinel`, `coherence-checker`, `loi-generator`, `narrative-memory`, `budget-narrative`) are unchanged and migrate in week 2.
- **OpenAI call sites receive no behavior changes** beyond the BD-1 insert repair (which is a correctness win, not a regression — inserts that were silently failing will now succeed).
- **No model-tier routing** (Haiku ↔ Sonnet ↔ Opus based on task) — R13a's Haiku fallback is a narrow budget-driven case, not a general router.
- **No Batch API lane.**
- **No PromptRegistry with eval harness** beyond the one-shot R18 eval for the draft-generator prompt refactor.
- **No Langfuse / LiteLLM integration** — raw `ai_generations` rows are sufficient for ad-hoc SQL in week 1.
- **No parallelization of draft sections** — explicitly preserve the sequential `for...of await` loop at `src/lib/ai/writing/draft-generator.ts:268-279`.
- **Sentry integration for the BD-1 tripwire.** Correction from earlier review: `package.json` already depends on `@sentry/nextjs` 10.48.0 with `sentry.{server,client,edge}.config.ts` wired. The BD-1 observability fix calls `Sentry.captureException(error, { tags: { tag: 'ai_recording_failed', table: '...' } })` alongside the structured `logger.error` — makes the silent-swallow regression permanently visible to on-call without waiting for a "future alerting hookup." No new Sentry work; we're using existing infrastructure.

### Deferred to Separate Tasks

- Other 8 `writing/*` file migrations → week 2 PR, gated on PG-1 through PG-7 holding for 7 calendar days and ≥ 500 draft sections recorded.
- `ACTION_TO_FEATURE` reconciliation for multi-to-one mappings (`match`/`roadmap` → `matching_runs`) → separate cost-control correctness fix.
- Adding Sentry or equivalent observability backend → separate hardening task.
- Model-tier routing, PromptRegistry, Batch API lane → per-ideation-doc rollout beyond week 2.

## Context & Research

### Relevant Code and Patterns

- `src/lib/ai/call.ts` — existing `aiCall()` (OpenAI-only, 144 lines) — the function being extended.
- `src/lib/ai/client.ts:8-17` — `getAnthropicClient()` singleton already exists; use it (replaces the top-level `new Anthropic()` at `src/lib/ai/writing/draft-generator.ts:15`).
- `src/lib/ai/client.ts:52-60` — `COST_PER_1K_TOKENS` table; add Anthropic cache-aware pricing as a sibling function per R16.
- `src/lib/ai/usage.ts` — `checkUsageLimit`, `recordUsage`, `ACTION_TO_FEATURE`. Row-count gate at line 84 (`used = usageRows?.length ?? 0`) is the mechanism R13 redefines.
- `src/lib/ai/sanitize.ts` — `detectPromptInjection`, `sanitizeInput`. String-in, string-out. Applied per R12 to both `userInput` and `cacheableContext`.
- `src/lib/ai/writing/draft-generator.ts:15` — top-level `new Anthropic()` (bypass) — deleted in Unit 7.
- `src/lib/ai/writing/draft-generator.ts:132` — `generateSection` Anthropic call — migrated in Unit 7.
- `src/lib/ai/writing/draft-generator.ts:182` — `generateBudget` Anthropic call — migrated in Unit 7.
- `src/lib/ai/writing/draft-generator.ts:207` — dead `_trackUsage` — deleted in Unit 7 (grep-confirmed unused).
- `src/lib/ai/writing/draft-generator.ts:268-279` — sequential `for...of await` loop — **preserved** per R19b.
- `src/lib/ai/writing/prompts.ts:171-268` — `buildDraftSectionPrompt` with 7 interpolated section fields — refactored in Unit 3.
- `src/lib/logger.ts` — structured JSON console logger; no Sentry. Used for the BD-1 observability tripwire.
- `supabase/migrations/00005_ai_tables.sql` — `ai_generations` + `ai_usage` table definitions (the CHECK constraints BD-1 must widen).
- `supabase/migrations/00007_billing_tables.sql:39` — `tier_limits.feature` column (BD-2 conflict source 1).
- `supabase/migrations/00031_add_growth_tier.sql` — `DROP CONSTRAINT IF EXISTS / ADD CONSTRAINT` idiom to follow for CHECK widening. Also the BD-2 conflict source 2 (INSERT references `action_type`) and the growth-tier seed-values mismatch (`'writing'/'readiness'/'strategy'` vs `ACTION_TO_FEATURE`'s `'ai_drafts'/'readiness_scores'/'matching_runs'`).
- `tests/lib/ai/writing/draft-generator.test.ts` — existing test file (269 lines, only covers `classifySectionType` + Zod); extend for the migration.
- `tests/lib/ai/engines/grantie.test.ts:5-33` — reference for `vi.mock("@/lib/ai/call", ...)` convention.
- `tests/worker/handlers/generate-roadmap.test.ts` — reference for chainable Supabase mock pattern.

### Institutional Learnings

- **None** — `docs/solutions/` does not exist in the repo. The origin requirements doc is the most complete institutional thinking on this topic. Consider writing at least the BD-1 post-mortem + R19a canonical-stringify pattern doc after week-1 deploys (ce-compound workflow).

### External References

Verified in prior ideation/brainstorm research passes (see origin doc):
- Anthropic Prompt Caching Docs — https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching — TTL options (5m, 1h), cache-block limits (max 4), discount structure (90% on reads).
- ProjectDiscovery post-mortem — https://projectdiscovery.io/blog/how-we-cut-llm-cost-with-prompt-caching — 4.2% → 73.7% cache hit rate via "relocation trick" (dynamic content to tail); 59-70% blended bill cut.
- Anthropic cache pricing tiers (2026-04-19): 1.25× input for 5-min TTL writes, 2.0× input for 1-hour TTL writes, 0.1× input for reads — confirmed on the day of implementation.

### Repository Constraints

- `AGENTS.md` directive (load-bearing): "This is NOT the Next.js you know — read the relevant guide in `node_modules/next/dist/docs/` before writing any code." This plan's Next.js surface is minimal (feature flag env var reads in library code, no new API routes in week 1), but the constraint applies if Unit 8 expands to include an admin toggle UI.
- Supabase migration naming: `NNNNN_snake_case.sql`. Next migration is `00049_...`.
- Supabase CHECK-widening idiom: `ALTER TABLE x DROP CONSTRAINT IF EXISTS x_col_check; ALTER TABLE x ADD CONSTRAINT x_col_check CHECK (col IN (...));` — used verbatim in `00031_add_growth_tier.sql`.
- Test framework: Vitest, mirror-layout `tests/`. Mocks `aiCall` at one layer; mocks `getAnthropicClient().messages.create` at the lower layer.
- No feature-flag framework — use raw `process.env.X === 'true'` inline with a single helper module.

## Key Technical Decisions

- **Extend `aiCall`, don't build a new Gateway.** Minimum churn: zero changes to 30+ existing OpenAI call sites. New optional params are additive. (See origin.)
- **Single auto-cache strategy** — wrapper marks `systemPrompt` with 1h TTL and optional `cacheableContext` with 5m TTL. Callers never touch `cache_control` by hand. (R7-R11, see origin.)
- **Sibling cost function, not overloaded signature.** Add `estimateAnthropicCostCents(model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, systemTtl)` alongside the existing `estimateCostCents`. The OpenAI path's 3-arg call is untouched. (R16.)
- **Session-dedupe via partial unique index + ON CONFLICT DO UPDATE.** Atomic under concurrent writes; `CREATE UNIQUE INDEX ... WHERE session_id IS NOT NULL` so pre-existing rows without `session_id` are unaffected. (R13.)
- **Pre-flight token enforcement with conservative estimation.** `spent + estimate > ceiling` check before call issuance. Per-call hard cap of 200K tokens independent of monthly budget. Rejects immediately if no Haiku-equivalent in the week-1 promptId set. (R13a.) **Estimator caveat:** the `length / 4` char-to-token ratio is calibrated for English. Spanish/French content runs ~3.5 chars/token (close enough); Chinese/Japanese/Korean run ~1-1.5 chars/token. If GrantIQ targets non-English grants, switch the estimator to Anthropic's `/v1/messages/count_tokens` endpoint (one extra round-trip but authoritative) — until then, document the English assumption in `usage.ts` and add a non-English fixture test to Unit 6.
- **Complete actionType enum as source of truth.** BD-1 fix introduces an exported `AI_ACTION_TYPES` constant in `src/lib/ai/usage.ts`; CHECK constraints on `ai_generations.generation_type` and `ai_usage.action_type` are widened to match. Future drift caught by TypeScript at the call site.
- **Preserve silent-swallow avoidance, add a tripwire.** Keep `Promise.allSettled` for recording (don't block the user-facing response on telemetry), but log recording failures with a distinct tag (`ai_recording_failed`) so future alerting can hook in without a code change. BD-1's root cause was invisibility, not the fire-and-forget shape.
- **Canonical stringify via `safe-stable-stringify` package, pinned.** Lighter than a custom 30-line serializer and comes with round-trip tests in its own suite. Version pinning + a golden-fixture regression test locks behavior.
- **Preserve sequential section execution.** `draft-generator.ts:268-279` is already `for...of await`. Parallelization adds race/concurrency complexity without improving cache hit rate (serial = 1 write + N-1 reads naturally). (R19b.)
- **Feature flag as env var, no framework.** Single `src/lib/ai/flags.ts` module reads `process.env.ANTHROPIC_VIA_GATEWAY` with safe default. Per-org circuit breaker queries recent `ai_generations` rows — no new infra.

## Open Questions

### Resolved During Planning

- **Anthropic client singleton vs new instance** → use existing `getAnthropicClient()` at `src/lib/ai/client.ts:8-17`; delete the top-level `new Anthropic()` in `draft-generator.ts:15`.
- **CHECK-widening SQL pattern** → follow `00031_add_growth_tier.sql`'s `DROP CONSTRAINT IF EXISTS / ADD CONSTRAINT` idiom.
- **Canonical stringify: custom vs package** → use `safe-stable-stringify` npm package (pinned), simpler than custom 30-line.
- **Eval harness location** → new `tests/evals/` directory mirror-layout; standalone Vitest suite with `.eval.test.ts` suffix so default test runs skip it.
- **Test mocking strategy** → for call-site tests, mock `@/lib/ai/call` (existing convention). For aiCall internals, mock `getAnthropicClient()` at the SDK boundary.

### Deferred to Implementation

- **Exact `tier_limits` column name in live DB** — must be checked via `SELECT column_name FROM information_schema.columns WHERE table_name='tier_limits';` at the start of Unit 1 before writing the BD-2 migration. One of `feature` or `action_type` is authoritative — the migration diverges based on what's there.
- **Supabase migration approach for new `ai_generations` columns** — ALTER TABLE with nullable columns (likely fine under current RLS) vs sidecar table. Decide after checking RLS policies during Unit 4.
- **Whether `safe-stable-stringify` npm package has any existing semantic-equivalence gaps** for GrantIQ's org profile shape — verified during Unit 2 fixture-writing, not before.
- **Exact measurable eval metrics for Unit 3** (word-count compliance threshold, keyword-presence threshold) — refined during fixture creation.

## Implementation Units

- [ ] **Unit 1: Schema prerequisites — BD-1 + BD-2 + silent-swallow fix**

**Goal:** Repair the `ai_generations` insert that has been silently failing for every `aiCall` today; reconcile the `tier_limits` column name conflict between migrations 00007 and 00031; introduce a complete actionType enum; fix the growth-tier seed value mismatch; add a logger tripwire so the next silent-failure regression is loud.

**Requirements:** BD-1, BD-2, prerequisite for R14-R15, R17

**Dependencies:** None (first unit)

**Files:**
- Create: `supabase/migrations/00049_fix_ai_recording_schema.sql`
- Create: `supabase/migrations/00050_reconcile_tier_limits_column.sql` (only if live-DB check reveals a conflict — may be empty/no-op)
- Modify: `src/lib/ai/call.ts` (lines 125-140: insert column names + user_id + distinct-tag logging)
- Modify: `src/lib/ai/usage.ts` (add `AI_ACTION_TYPES` exported constant; add `eligibility_status` → feature mapping in `ACTION_TO_FEATURE`)
- Test: `tests/lib/ai/call.test.ts` (new file — tests ai_generations insert succeeds for every actionType; tests recording failure emits the tripwire log tag)
- Test: `tests/lib/ai/usage.test.ts` (new file — tests `ACTION_TO_FEATURE` covers all enum entries; tests growth tier limits look up correctly)

**Approach:**
- **Pre-migration live-DB inventory (required before writing the migration):** run three queries in Supabase Studio and record results:
  1. `SELECT column_name FROM information_schema.columns WHERE table_name='tier_limits';` — determines whether the column is `feature`, `action_type`, or both (BD-2).
  2. `SELECT DISTINCT generation_type, COUNT(*) FROM ai_generations GROUP BY 1;` — surfaces any legacy values that must be backfilled or added to the widened CHECK list before `ADD CONSTRAINT` runs (otherwise the new constraint fails mid-migration against non-conforming rows).
  3. `SELECT DISTINCT action_type, COUNT(*) FROM ai_usage GROUP BY 1;` — same inventory for `ai_usage`.
  4. `SELECT * FROM tier_limits WHERE tier='growth';` — confirms whether growth-tier rows actually exist in production. Per `usage.ts:49-51`, a missing `tier_limits` row returns `allowed=true, limit=null` (unlimited) — meaning if growth never committed, growth-tier customers currently have unlimited usage across all features. File a **separate P1 incident ticket** if growth rows are missing; the fix below normalizes the seed but does not address any back-dated quota leakage.
- **Define `AI_ACTION_TYPES` source of truth** from the grep-verified set plus schema-preserved values:
  - Grep-confirmed live values (from origin BD-1): `'match'`, `'readiness_score'`, `'roadmap'`, `'eligibility_status'`, `'draft'`, `'audit'`, `'chat'` (7).
  - Pre-existing schema-allowed values that the original `ai_generations` CHECK at `00005_ai_tables.sql:20` enumerates: `'rewrite'`, `'loi'`, `'budget'` — keep in the widened CHECK for forward compatibility with existing DB state (the pre-existing check allows these; removing them would be a breaking narrowing).
  - Final `AI_ACTION_TYPES` = all 10 values. TypeScript type `AiActionType` derived from the const. `AiCallOptions.actionType` typed to `AiActionType` so new drift is caught at compile time.
- Migration `00049_fix_ai_recording_schema.sql`:
  - Optional pre-step: `UPDATE ai_generations SET generation_type = 'match' WHERE generation_type = 'scoring';` (only if the inventory revealed legacy values — specifics depend on what's in prod).
  - `ALTER TABLE ai_generations DROP CONSTRAINT IF EXISTS ai_generations_generation_type_check;`
  - `ALTER TABLE ai_generations ADD CONSTRAINT ai_generations_generation_type_check CHECK (generation_type IN ('match', 'readiness_score', 'roadmap', 'eligibility_status', 'draft', 'audit', 'rewrite', 'loi', 'budget', 'chat'));`
  - `ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_action_type_check;`
  - `ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_action_type_check CHECK (action_type IN (...same 10-value list...));`
  - Fix growth-tier seed values (replace `'writing'` → `'ai_drafts'`, `'readiness'` → `'readiness_scores'`, `'strategy'` → `'matching_runs'`) via `INSERT ... ON CONFLICT DO NOTHING`.
- Update `call.ts:127` insert body to `{ org_id, user_id, generation_type: actionType, model_used: model, tokens_input, tokens_output, estimated_cost_cents }`. `user_id` is already on `AiCallOptions` at line 16.
- **Observability tripwire (Sentry + logger):** wrap the failing recording path with `try { ... } catch (error) { logger.error("ai_recording_failed", { table: "ai_generations", org_id, action_type, err: String(error) }); Sentry.captureException(error, { tags: { tag: 'ai_recording_failed', table: 'ai_generations' }, extra: { org_id, action_type } }); }`. Both signals fire; future on-call alert rules can key on either. The `Promise.allSettled` shape is preserved — user-facing `aiCall` still doesn't throw on recording failure.
- **`ACTION_TO_FEATURE` mapping update:** add `eligibility_status: 'eligibility_scores'` and seed a new `tier_limits` row for that feature per tier (free=0/starter=unlimited/pro=unlimited/growth=unlimited — business to confirm exact numbers). This is cleaner than mapping `eligibility_status` onto `matching_runs` (which would compound the multi-to-one counter issue already deferred).

**Patterns to follow:**
- CHECK-widening: `supabase/migrations/00031_add_growth_tier.sql:5-12` (verbatim DROP-then-ADD with explicit constraint names).
- Structured logging: existing `logger.error(msg, { ctx })` pattern at `src/lib/logger.ts`.
- Supabase mocking in tests: `tests/worker/handlers/generate-roadmap.test.ts`.

**Test scenarios:**
- Happy path: `aiCall` with `actionType: 'match'` inserts a row into `ai_generations` with `generation_type='match'` and `user_id` populated (previously failed silently).
- Happy path: `aiCall` with each of the 10 enum values succeeds against both tables.
- Edge case: `aiCall` without `userId` in options throws a typed `MissingUserIdError` (never silently accepts — `user_id` is NOT NULL in the schema).
- Error path: simulated DB error on `ai_generations` insert produces a log entry with `tag: "ai_recording_failed"`; the `aiCall` result is still returned (recording remains best-effort).
- Integration: `ACTION_TO_FEATURE` has a mapping for every value in `AI_ACTION_TYPES`; test fails if a new enum value is added without a mapping.

**Verification:**
- Running the full OpenAI-facing test suite produces `ai_generations` rows in a test DB (previously zero).
- Grep `"Failed to record ai_generations"` across the codebase returns zero hits; `"ai_recording_failed"` is now the canonical tag.
- Migration runs successfully against a fresh DB dump.

---

- [ ] **Unit 2: Canonical stable-stringify utility**

**Goal:** Provide a deterministic serializer for `cacheableContext` so the Anthropic cache key is stable across calls regardless of object-key insertion order.

**Requirements:** R19a

**Dependencies:** None (independent; can run parallel with Unit 1 and Unit 3)

**Files:**
- Modify: `package.json` (add `safe-stable-stringify` pinned to a specific minor version)
- Create: `src/lib/ai/stringify.ts` (thin wrapper exporting `canonicalStringify(value): string`)
- Test: `tests/lib/ai/stringify.test.ts`

**Approach:**
- Pin `safe-stable-stringify` at a specific version (e.g., `"2.5.0"`). Document the pin rationale in a one-line comment.
- `canonicalStringify` is a 3-line wrapper that applies the package's configured-for-stability mode and returns a string.
- No custom logic in the wrapper — the utility's job is to make the choice once so every caller gets the same serializer.

**Patterns to follow:**
- Simple utility module pattern, no class; see existing `src/lib/ai/cache.ts` (2-line SHA-256 hash helper) as the shape analog.

**Test scenarios:**
- Happy path (stability): `canonicalStringify({ b: 1, a: 2 })` equals `canonicalStringify({ a: 2, b: 1 })` — byte-identical.
- Happy path (semantic): for 5+ fixture profiles (nested objects, arrays, Unicode, nulls, empty strings), `JSON.parse(canonicalStringify(x))` deep-equals `x`.
- Edge case: deeply nested (10+ levels) objects serialize without stack overflow.
- Edge case: circular reference throws a typed error (the package handles this; verify the thrown error is the documented type).
- Edge case: non-ASCII keys and values (Chinese, emoji, combining characters) round-trip correctly.
- Edge case: arrays preserve their index order; objects normalize key order lexically.
- Integration: the golden fixture — a representative org profile — produces a byte-identical serialization across two different call sites in the codebase (stability test against the package-version pin).

**Verification:**
- All tests pass.
- `npm ls safe-stable-stringify` reports the pinned version, no dedupe warnings.

---

- [ ] **Unit 3: Refactor `buildDraftSectionPrompt` for stable prefix + measurable eval harness**

**Goal:** Extract all 7 section-specific fields out of the system prompt so `systemPrompt` becomes invariant across all sections of a drafting session. Build a minimal eval harness to confirm output quality does not regress from the structural refactor.

**Requirements:** R18

**Dependencies:** None (independent of Units 1 and 2; can run in parallel)

**Files:**
- Modify: `src/lib/ai/writing/prompts.ts` (rewrite `buildDraftSectionPrompt`, lines 171-268)
- Create: `tests/evals/writing/section-draft.eval.test.ts` (new eval harness — suffix `.eval.test.ts` so default `vitest` run skips it; runs explicitly via `vitest run tests/evals`)
- Create: `tests/evals/writing/fixtures/` (20+ golden section-prompt fixtures across 3-5 section types)

**Approach:**
- Split `buildDraftSectionPrompt(params)` return into two strings: `stableSystemPrompt` (writing rules, output format, tone/voice — invariant across sections) and `sectionUserSegment` (all 7 section-specific fields, formatted as a Markdown preamble to the user message).
- Update the function signature to return `{ systemPrompt, sectionUserSegment }` instead of a single string.
- Update callers (`generateSection`, `generateBudget` — modified in Unit 7 anyway) to concatenate `sectionUserSegment` with the existing user message body.
- Eval harness runs each fixture through both the pre-refactor and post-refactor prompt-builder paths, capturing model output. Scoring asserts measurable compliance:
  - Word count within ±10% of `word_limit` on ≥ 95% of sections.
  - All `scoring_criteria` keyword tokens present in output on ≥ 95%.
  - Section-type-appropriate structural cues present (e.g., "need statement" sections contain evidence citations; "budget" sections contain numeric tables).
- Run evals pre-refactor first to establish baseline numbers; refactor; re-run; compare. Merge blocked if post-refactor numbers regress ≥ 5 percentage points on any metric.

**Execution note:** Write the eval harness and baseline-run against current prompts first. Don't refactor until baseline is recorded — otherwise you can't prove parity.

**Patterns to follow:**
- Mirror-layout test placement: `src/lib/ai/writing/prompts.ts` → `tests/lib/ai/writing/prompts.test.ts` for unit tests; `tests/evals/writing/` for the eval harness.
- Fixture shape: each fixture is a `.json` file containing input params + a golden output reference (not the full draft — just the measurable assertions, since draft text is non-deterministic).

**Test scenarios:**
- Happy path: 20+ fixtures across abstract, project_narrative, needs_assessment, methods_approach, evaluation_plan, budget_narrative section types.
- Measurable compliance: word count within ±10% of limit on ≥ 95%.
- Measurable compliance: `scoring_criteria` keyword tokens present on ≥ 95%.
- Measurable compliance: structural cues (evidence citations in needs; numeric tables in budget) present on ≥ 90%.
- Integration: identical parameters produce identical `systemPrompt` strings across two calls (proves the prefix is stable).
- Integration: varying only `section_name` produces different `sectionUserSegment` but identical `systemPrompt`.

**Verification:**
- Post-refactor eval numbers are within 5 pp of baseline on all three compliance metrics.
- `systemPrompt` produced by the refactored function is byte-identical across all section types when other global params are equal.

---

- [ ] **Unit 4: Extend `aiCall` for Anthropic + cache control + promptId + retry semantics**

**Goal:** Add the `provider`, `cacheableContext`, `promptId` parameters to `aiCall`. Wire the Anthropic branch through `getAnthropicClient()` with auto-applied `cache_control` blocks. Add response-content normalization, retry semantics, and Anthropic-aware cost math.

**Requirements:** R1-R12, R14-R16, R23-R27

**Dependencies:** Unit 1 (ai_generations insert must work before new columns land) + Unit 2 (canonical stringify) — both in place before Unit 4 merges.

**Files:**
- Create: `supabase/migrations/00051_ai_generations_add_cache_columns.sql` (adds `prompt_id TEXT`, `cache_creation_tokens INT`, `cache_read_tokens INT` as nullable columns)
- Modify: `src/lib/ai/call.ts` (extensively — add provider param, Anthropic branch, response normalization, retry wrapper)
- Modify: `src/lib/ai/client.ts` (add `estimateAnthropicCostCents` sibling function)
- Modify: `src/lib/ai/sanitize.ts` (if the existing `sanitizeInput`/`detectPromptInjection` functions need adjustment for larger JSON-shaped payloads — else unchanged)
- Test: `tests/lib/ai/call.test.ts` (extend Unit 1's file with Anthropic-branch coverage)
- Test: `tests/lib/ai/client.test.ts` (new file — tests `estimateAnthropicCostCents` cost math)

**Approach:**
- Migration 00051 adds 3 nullable columns. RLS policies on `ai_generations` are presumed to permit ALTER TABLE (verify during Unit 4 work; fall back to sidecar table if they don't).
- Extend `AiCallOptions`:
  - `provider?: 'openai' | 'anthropic'` (default `'openai'`)
  - `cacheableContext?: string`
  - `promptId?: string`
  - Validate: `promptId` required when `provider === 'anthropic'` — throw `PromptIdRequiredError` pre-flight.
- Extend `AiCallResult`: add optional `cacheCreationTokens?: number`, `cacheReadTokens?: number`, `stopReason?: string`.
- Branch dispatch in `aiCall`:
  - Both branches: run `detectPromptInjection` + `sanitizeInput` on `userInput` AND on `cacheableContext` if present (R12).
  - OpenAI branch: unchanged — passes `{ model, messages: [system, user] }` to `openai.chat.completions.create`. No `cache_control` emission.
  - Anthropic branch: constructs `system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral', ttl: '1h' } }]` and `messages` array with optional cached user-message block + uncached user input. Calls `anthropic.messages.create({ model, max_tokens, system, messages })` via `getAnthropicClient()`.
- Response normalization: Anthropic returns `content: Array<Block>`. Concatenate all `type: 'text'` blocks in order to a single string. Throw typed `UnexpectedBlockTypeError` if any `tool_use` or unknown block type is present (week-1 scope; tool use migrates separately).
- Retry wrapper: on Anthropic `5xx` or `529 overloaded`, retry up to 2 total attempts with 1s/3s exponential backoff. Retries do not re-invoke `checkUsageLimit` (already passed) and do not re-record (record once on final success). Retry prompts re-use the same message content — no error-text echo (R27).
- Cost math: `estimateAnthropicCostCents(model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, systemTtl)` applies: input at 1×, cache writes at 1.25× (5m TTL) or 2.0× (1h TTL) based on `systemTtl`, cache reads at 0.1×, output at the per-model output rate. Returns cents.
- Recording extensions: `recordUsage` + `ai_generations` insert now carry `prompt_id`, `cache_creation_tokens`, `cache_read_tokens`, `stop_reason`.

**Execution note:** Write failing integration tests for the Anthropic branch first (happy path, retry, normalization, injection on cacheableContext) before implementing. The branch is self-contained enough for TDD; the interaction surface with the rest of `aiCall` is small.

**Patterns to follow:**
- Singleton client: `getAnthropicClient()` at `src/lib/ai/client.ts:8-17`.
- Typed error classes: `PromptInjectionError`, `UsageLimitError` already in `call.ts` — add new error classes following the same shape.
- Fire-and-forget recording: `await Promise.allSettled([...])` pattern from `call.ts:141`, preserved (don't block user response on recording).
- Anthropic block array: Anthropic SDK docs + existing usage in `draft-generator.ts:132` (which does `response.content[0].type !== 'text'` check — formalize that check into the wrapper's normalization path).

**Test scenarios:**
- Happy path (OpenAI unchanged): existing OpenAI call path behaves identically; same tokens, same cost, same inserts.
- Happy path (Anthropic new): `aiCall({ provider: 'anthropic', promptId: 'writing.draft.v1', systemPrompt, userInput, orgId, userId, tier, actionType: 'draft' })` calls `anthropic.messages.create` once, returns normalized content, records with `prompt_id` populated.
- Happy path (with cacheableContext): identical two calls within 5 minutes in integration-test mode produce `cacheReadTokens > 0` on the second (SG-1 pre-deploy gate).
- Edge case: `provider: 'anthropic'` without `promptId` → throws `PromptIdRequiredError` pre-flight; no SDK call made; no recording.
- Edge case: Anthropic response with multiple text blocks → concatenated in order.
- Error path: Anthropic returns `tool_use` block → throws `UnexpectedBlockTypeError` (week-1 scope).
- Error path: Anthropic returns `stop_reason: 'max_tokens'` → `AiCallResult.stopReason` set to `'max_tokens'`; content is the partial text concatenation; no error thrown (caller decides whether truncation is acceptable).
- Error path: Anthropic returns 529 overload on first attempt, 200 on second → retry succeeds, recording fires once.
- Error path: Anthropic returns 500 on both attempts → retry exhausts, typed error propagates, no usage rows written (records only on success).
- Error path: `detectPromptInjection` matches pattern in `cacheableContext` → throws `PromptInjectionError`; no SDK call made.
- Integration: sanitization applies to both `userInput` and `cacheableContext` (R12).
- Integration: `estimateAnthropicCostCents(model, 1000, 500, 800, 200, '1h')` returns the expected cents (math: non-cached 0 tokens; write 800 tokens at 2.0× input; read 200 tokens at 0.1× input; output 500 tokens at output rate).

**Verification:**
- Integration test suite passes against a mocked Anthropic SDK that returns realistic responses.
- `ai_generations` rows written during tests include populated `prompt_id`, `cache_creation_tokens`, `cache_read_tokens` fields.
- OpenAI-path tests are unchanged.

---

- [ ] **Unit 5: Session-based usage dedupe migration + `recordUsage` upsert**

**Goal:** Redefine `ai_usage` counter semantics so one drafting session = one row regardless of section count, using a partial unique index + ON CONFLICT DO UPDATE. Atomic under concurrent writes.

**Requirements:** R13

**Dependencies:** Unit 1 (for stable `ai_usage` schema)

**Files:**
- Create: `supabase/migrations/00052_ai_usage_session_id.sql`
- Modify: `src/lib/ai/usage.ts` (extend `recordUsage` with session_id upsert path; unchanged fallback when `session_id` null)
- Modify: `src/lib/ai/call.ts` (pass `sessionId` from `AiCallOptions` through to `recordUsage`)
- Test: Extend `tests/lib/ai/usage.test.ts`

**Approach:**
- **RPC is mandatory (confirmed via research pass):** PostgREST's `on_conflict` query parameter only supports a bare column list, not partial-index predicates, and `upsert` in the Supabase JS client emits `DO UPDATE SET col = EXCLUDED.col` (overwrite) — it cannot express the increment semantics needed here. Using the JS upsert will fail with "no unique or exclusion constraint matching the ON CONFLICT specification" because the target is a PARTIAL index. A Postgres RPC function is the only correct path.
- Migration 00052:
  - `ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS session_id TEXT;`
  - `CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_session_unique ON ai_usage (org_id, action_type, session_id) WHERE session_id IS NOT NULL;`
  - Define the RPC function in the same migration:
    ```sql
    CREATE OR REPLACE FUNCTION record_ai_usage_session(
      p_org_id UUID, p_action_type TEXT, p_session_id TEXT,
      p_tokens_in INT, p_tokens_out INT, p_cost_cents INT,
      p_billing_period DATE
    ) RETURNS VOID AS $$
    BEGIN
      INSERT INTO ai_usage (org_id, action_type, session_id, tokens_input, tokens_output, estimated_cost_cents, billing_period)
      VALUES (p_org_id, p_action_type, p_session_id, p_tokens_in, p_tokens_out, p_cost_cents, p_billing_period)
      ON CONFLICT (org_id, action_type, session_id) WHERE session_id IS NOT NULL
      DO UPDATE SET
        tokens_input = ai_usage.tokens_input + EXCLUDED.tokens_input,
        tokens_output = ai_usage.tokens_output + EXCLUDED.tokens_output,
        estimated_cost_cents = ai_usage.estimated_cost_cents + EXCLUDED.estimated_cost_cents;
    END;
    $$ LANGUAGE plpgsql;
    ```
- `AiCallOptions`: add `sessionId?: string` here in Unit 5 (not Unit 4 — this is Unit 5's responsibility). For draft-generator, this is `grant_application_id` (threaded through from Unit 7).
- `recordUsage` logic: if `sessionId` provided, call `supabase.rpc('record_ai_usage_session', {...})`. If absent, fall back to the existing plain INSERT path unchanged.
- **Invariant contract (critical):** `recordUsage` is always called with **per-call deltas** for `tokens_input`, `tokens_output`, `estimated_cost_cents` — never cumulative running totals. The `+` in the RPC's DO UPDATE assumes this contract. Consider a branded TypeScript type `DeltaCents` / `DeltaTokens` for the parameters to compile-time-enforce. Document in the function signature and add a test that proves 6 sequential calls with per-section deltas `[100, 150, 200, 120, 180, 90]` produce `estimated_cost_cents = 840` on the deduped row.

**Patterns to follow:**
- Migration naming + `IF NOT EXISTS` idiom: existing migrations in `supabase/migrations/`.
- Partial unique index: novel to this codebase; verify the Supabase Postgres version supports it (it does — PostgreSQL ≥ 9.5).

**Test scenarios:**
- Happy path: first call with `sessionId='grant-123'` inserts a row.
- Happy path: second call with same `sessionId` updates the existing row; `tokens_input` is the sum of both calls.
- Happy path: `sessionId` absent → inserts a new row every time (legacy behavior).
- Edge case: `checkUsageLimit` against a session-deduped row counts it as ONE toward the tier limit (previously counted as N rows).
- Integration (concurrency): two simultaneous `recordUsage` calls with the same `sessionId` produce exactly one row (no duplicates under race).
- Integration: different `sessionId` values produce separate rows even for the same `(org_id, action_type)`.

**Verification:**
- A 6-section draft (same `sessionId`) produces exactly one `ai_usage` row.
- `checkUsageLimit` for Pro tier with `ai_drafts: 2` limit allows the second full draft (was blocking at section 3 of draft 1 pre-fix).

---

- [ ] **Unit 6: Token-based soft cap (R13a)**

**Goal:** Add a token-based budget ceiling as a pre-flight check alongside the existing row-based hard cap. Prevents unbounded token spend even when a user is within their row quota. Per-call hard ceiling bounds worst-case single-call damage.

**Requirements:** R13a

**Dependencies:** Unit 1 (stable schema) + Unit 5 (session_id dedupe, so monthly token sums aggregate correctly)

**Files:**
- Create: `supabase/migrations/00053_tier_limits_monthly_token_ceiling.sql`
- Modify: `src/lib/ai/usage.ts` (extend `checkUsageLimit` with token ceiling path; new `TokenCeilingError`)
- Modify: `src/lib/ai/call.ts` (surface `TokenCeilingError` from pre-flight check)
- Test: Extend `tests/lib/ai/usage.test.ts`

**Approach:**
- Migration 00053: `ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS monthly_token_ceiling INT;` (nullable = unlimited, matching `monthly_limit` convention).
- Extend `checkUsageLimit(orgId, actionType, tier, options)` signature with new `options = { systemPromptLen, cacheableContextLen, userInputLen, maxTokens }`.
- Pre-flight estimation: `estimate = (systemPromptLen + cacheableContextLen + userInputLen) / 4 + maxTokens` (the `/4` is a conservative token-per-character approximation — Anthropic/OpenAI token counts run closer to 3.5-4.0 chars/token for English).
- Current-period spend: `SELECT SUM(tokens_input + tokens_output) FROM ai_usage WHERE org_id = $1 AND billing_period = $2`.
- Reject with `TokenCeilingError` if `spent + estimate > monthly_token_ceiling`. Per-call hard ceiling of 200K regardless of monthly budget.
- Seed initial `monthly_token_ceiling` values per tier in the same migration (example defaults: free=10K, starter=1M, growth=10M, agency=100M — final values to be set by business per pricing).

**Patterns to follow:**
- `UsageLimitError` existing pattern at `src/lib/ai/usage.ts:13-25` — same shape for `TokenCeilingError`.
- Nullable column migration: existing `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern.

**Test scenarios:**
- Happy path: `spent + estimate` well under ceiling → call proceeds.
- Edge case: `monthly_token_ceiling IS NULL` → unlimited, no enforcement (matches legacy behavior).
- Edge case: `estimate` alone > 200K per-call hard cap → throws `TokenCeilingError` immediately regardless of monthly budget.
- Error path: `spent + estimate > monthly_token_ceiling` → throws `TokenCeilingError` with diagnostic info (spent, estimate, ceiling).
- Integration: token ceiling enforcement applies equally to OpenAI and Anthropic branches (via `aiCall` pre-flight).

**Verification:**
- A test org with a 10K monthly token ceiling and 9,500 tokens already spent is rejected on an incoming 1K-token call.
- A single 250K-token call is rejected even for a tier with 100M ceiling.

---

- [ ] **Unit 7: Migrate `draft-generator.ts` to `aiCall`**

**Goal:** Swap `generateSection` and `generateBudget` from direct `new Anthropic()` calls to `aiCall({ provider: 'anthropic', ... })`. Delete the top-level `new Anthropic()` (line 15) and the dead `_trackUsage` function (line 207). Move org profile + capabilities into `cacheableContext` via the canonical stringify utility. Preserve sequential execution.

**Requirements:** R17, R19, R19b, R20

**Dependencies:** Units 2 (canonical stringify), 3 (stable prefix), 4 (aiCall Anthropic branch), 5 (session_id), 6 (token ceiling — recommended but not strictly blocking; migration can land before Unit 6 if needed)

**Files:**
- Modify: `src/lib/ai/writing/draft-generator.ts` (extensively: delete line 15, delete lines 207-241, rewrite lines 127-153 + 172-200)
- Test: Extend `tests/lib/ai/writing/draft-generator.test.ts`

**Approach:**
- Delete `const anthropic = new Anthropic();` at line 15. All SDK access now flows through `aiCall` → `getAnthropicClient()`.
- Delete the dead `_trackUsage` function at lines 207-241 (confirmed unused via grep in brainstorm).
- `generateSection` (line 127-153) rewrite:
  - Build `cacheableContext` = `canonicalStringify({ org_profile: context.org_profile, org_capabilities: context.org_capabilities, funder_analysis: context.funder_analysis })`. Session-stable; cached with 5m TTL.
  - Build `userInput` = remaining per-section volatile content (section name, RFP analysis, examples, per-section guidance — the structured preamble from Unit 3's `sectionUserSegment`).
  - `systemPrompt` = the refactored invariant part from Unit 3.
  - Call `aiCall({ provider: 'anthropic', promptId: 'writing.draft.v1', systemPrompt, cacheableContext, userInput, orgId, userId, tier, actionType: 'draft', sessionId: context.grant_application_id, maxTokens, model: ANTHROPIC_MODELS.SCORING, responseFormat: { type: 'json_object' } })`.
  - Response normalization is owned by `aiCall` now — no `content[0].type` check locally.
- `generateBudget` (line 172-200) — same pattern, different `promptId: 'writing.budget.v1'`.
- Preserve the outer `for...of await` loop at lines 268-279 as-is — no parallelization.
- Update the existing retry pattern (lines 140-148): since Unit 4 now owns retry, delete the local retry loop in `draft-generator.ts`. Schema-validation retry (Zod mismatch on output) stays local since it's not an Anthropic 5xx — but use the static repair-instruction pattern from R27 (no echo of prior error text).

**Execution note:** Expect measurable quality-parity risk from the prompt refactor (Unit 3) + aiCall migration landing together. Gate this unit on the Unit 3 eval passing first; run the eval again with the full stack post-migration.

**Patterns to follow:**
- `aiCall` caller convention: already established across 30+ OpenAI call sites; same shape.
- Supabase mocking in tests: `tests/worker/handlers/generate-roadmap.test.ts`.
- `vi.mock("@/lib/ai/call", ...)`: `tests/lib/ai/engines/grantie.test.ts:5-33`.

**Test scenarios:**
- Happy path: `generateDraft` for a 6-section RFP calls `aiCall` exactly 6 times (sequentially), each with `provider: 'anthropic'`, `promptId: 'writing.draft.v1'`, `sessionId: <grant_application_id>`.
- Happy path: the `cacheableContext` passed on all 6 calls is byte-identical (proves the serializer is stable).
- Happy path: `budgetTable` generation calls `aiCall` with `promptId: 'writing.budget.v1'`.
- Edge case: missing `grant_application_id` → `sessionId` is undefined; recording falls back to plain INSERT (previous behavior). Warning logged.
- Edge case: `aiCall` throws `UsageLimitError` mid-draft → the outer draft orchestration halts; already-written sections persist.
- Edge case: `aiCall` throws `TokenCeilingError` mid-draft → same halt behavior; user gets a clear error.
- Error path: Zod validation fails on section output → local repair retry (static instruction, no error echo); if repair fails, propagate error.
- Integration: draft quality parity — 5 pre-migration drafts vs 5 post-migration drafts, blinded reviewer cannot consistently identify which is which.
- Integration: `_trackUsage` grep returns zero hits in `src/`.
- Integration: `new Anthropic()` grep returns only hits in the 8 un-migrated `writing/*` files + `src/lib/ai/client.ts:getAnthropicClient`.

**Verification:**
- A full draft generated end-to-end produces exactly 1 `ai_usage` row (session-deduped), 6 `ai_generations` rows (one per section), and all `ai_generations` rows have `prompt_id`, `cache_creation_tokens`, `cache_read_tokens` populated.
- Post-merge eval re-run shows word-count compliance, keyword compliance within 5pp of pre-merge baseline.

---

- [ ] **Unit 8: Feature flag module + per-org circuit breaker**

**Goal:** Gate the new Anthropic path behind an env-var feature flag with per-org phased rollout. Add a circuit breaker that automatically reverts any org with 5 consecutive `cache_read_tokens=0` calls to the pre-migration path.

**Requirements:** Rollout Strategy (origin doc)

**Dependencies:** Unit 7 (migration landed) + Unit 4 (cache_read_tokens being recorded)

**Files:**
- Create: `src/lib/ai/flags.ts` (new module)
- Modify: `src/lib/ai/writing/draft-generator.ts` (add flag check at the top of `generateSection` / `generateBudget`; pre-migration `new Anthropic()` path re-instated as a fallback branch behind the flag)
- Test: `tests/lib/ai/flags.test.ts` (new file)

**Approach:**
- `flags.ts` exports:
  - `isAnthropicGatewayEnabled(orgId: string): Promise<boolean>` — reads `process.env.ANTHROPIC_VIA_GATEWAY` (off | test_only | percent_10 | full). `test_only` returns true only for GrantIQ's own test org (env-configured). `percent_10` hashes `orgId` into 10% deterministically. `full` returns true for all orgs.
  - `isCircuitBreakerTripped(orgId: string, promptId: string): Promise<boolean>` — queries the last 5 `ai_generations` rows for this `(org_id, prompt_id)` ordered by `created_at DESC`. Returns `true` only if **≥ 5 rows exist AND all 5 have `cache_read_tokens` in (0, NULL)**. **Cold-start behavior (explicit): fewer than 5 rows → returns `false` (NOT tripped; allow the rollout path).** Rationale: tripping on cold-start would no-op the rollout entirely (new promptIds would never get traffic); SG-1 pre-deploy smoke test is the primary first-hour safety net. Cached in-memory for 5 minutes per `(orgId, promptId)` to avoid hammering the DB.
- **Serverless caveat (documented, accepted):** on Vercel, each function invocation may run in a distinct lambda process. The in-memory Map is therefore invocation-scoped, not process-scoped. Since draft-generation runs inside a single cron-triggered `process-jobs` invocation (max 120s) with 6 sequential sections, the cache works within one draft. Across invocations the cache is cold, meaning each `process-jobs` tick pays one DB read per active (org, promptId) pair. Accepted load: one `SELECT ... LIMIT 5` per tick per org is cheap. If load becomes a problem, migrate to a Supabase table (`org_circuit_breaker_state`) with read-through caching — deferred.
- `draft-generator.ts` adds a guard at the top of `generateSection` and `generateBudget`:
  - `if (!(await isAnthropicGatewayEnabled(orgId)) || await isCircuitBreakerTripped(orgId, promptId)) { return legacyGenerateSectionViaDirectAnthropic(...) }`
  - Pre-migration code path is kept as a private helper function in `draft-generator.ts` for the duration of the rollout.
- **Forcing function for the legacy-path cleanup:** file a ticket (e.g., GIQ-CLEANUP-1) **at merge time** with a due date of **2026-05-10** (21 days after 100% rollout target). Add a comment at the top of `legacyGenerateSectionViaDirectAnthropic`: `// REMOVE BY 2026-05-10 per GIQ-CLEANUP-1 — see docs/plans/2026-04-19-001-*.md Unit 8`. A CI grep rule can be added in that cleanup PR: `grep "REMOVE BY" src/ | awk -F 'BY ' '{print $2}'` compared against current date. Without a concrete date + ticket ID, the "temporary" path becomes permanent.

**Patterns to follow:**
- `process.env.X` direct reads with safe defaults: `src/lib/supabase/admin.ts:9,12` pattern.
- Supabase query caching: no existing pattern — add a simple Map-based in-memory cache with 5-minute TTL.

**Test scenarios:**
- Happy path: `ANTHROPIC_VIA_GATEWAY=off` → all orgs go through legacy path.
- Happy path: `ANTHROPIC_VIA_GATEWAY=test_only` → only GrantIQ test org routes through new path.
- Happy path: `ANTHROPIC_VIA_GATEWAY=percent_10` → 10% of orgs (hash-deterministic) route through new path.
- Happy path: `ANTHROPIC_VIA_GATEWAY=full` → all orgs route through new path.
- Edge case: circuit breaker tripped for a specific org/promptId → that org reverts to legacy even when flag is `full`.
- Edge case: circuit breaker cache TTL expires → re-queries DB.
- Integration: a test org with 5 consecutive `cache_read_tokens=0` records becomes circuit-broken on the next call; logs a warning with a distinct tag for investigation.

**Verification:**
- Manual: flipping `ANTHROPIC_VIA_GATEWAY` between values in a staging environment routes calls accordingly.
- Flag-off state produces zero `ai_generations` rows with `prompt_id LIKE 'writing.%'`.

---

- [ ] **Unit 9: Pre-deploy smoke tests + production gate verification**

**Goal:** Wire the pre-deploy SG-1/SG-2 smoke tests (staging) and document the PG-1 through PG-7 production gates as a runbook with SQL queries and dashboards.

**Requirements:** SG-1, SG-2, PG-1 through PG-7 (origin doc)

**Dependencies:** Units 4-8 landed.

**Files:**
- Create: `scripts/staging-smoke-test.ts` (new script — runs against a staging DB + live Anthropic sandbox)
- Create: `docs/runbooks/anthropic-gateway-rollout.md` (new runbook with SQL queries for PG-1 through PG-7)
- Modify: `package.json` (add `npm run smoke:anthropic` script)

**Approach:**
- **No staging environment exists** in GrantIQ today (verified: only `.env.local` + `.env.vercel` configs; single-environment pre-launch setup). SG-1/SG-2 therefore run against a **local Supabase + a dedicated Anthropic test API key** (NOT the production key). Cross-env cache bleed is the failure mode if shared keys are used — Anthropic's prompt cache is scoped to API key, so a staging-shaped warmup against the prod key would corrupt PG-1's cold-cache baseline. The script must read `ANTHROPIC_API_KEY` from a `.env.test` file, hash it, and **fail fast if the hash matches the production key** (compared via a known prod-key hash stored in the script).
- **Smoke test script** (`scripts/smoke-test-anthropic.ts`):
  - Prerequisite: a dedicated Anthropic API key (separate from production) with sandbox-tier limits. If the team doesn't have one, request from Anthropic before running.
  - Prerequisite: `npx supabase start` running locally with migrations 00049-00053 applied.
  - SG-1: Issue `aiCall({ provider: 'anthropic', promptId: 'smoke.test.v1', systemPrompt: <1500-token-fixed-prefixed-with-SMOKE_TEST>, cacheableContext: <500-token-fixed>, userInput: 'test', ... })` twice within 5 minutes. Assert `cacheReadTokens > 0` on the second call. Report pass/fail. Note: prefix the systemPrompt with a `SMOKE_TEST_` literal so even if the test key is accidentally swapped for the prod key, the cache-key prefix can never collide with production prompts.
  - SG-2: Run a synthetic 6-section draft twice (same `grant_application_id` simulation) and compare blended cost-per-draft. Assert ≥ 40% drop. Report numbers.
- **Production gates run as post-deploy canary**, not pre-deploy. The plan's PG-1 through PG-7 rely on real production traffic against `ai_generations`; they cannot be evaluated without it. The flow is: SG-1/SG-2 pass locally → deploy with `ANTHROPIC_VIA_GATEWAY=test_only` → flip to `percent_10` for 24h → measure PG-1 through PG-7 against the 10% cohort → if all green, flip to `full`. The per-org circuit breaker (Unit 8) is the safety net during the 10% window.
- Runbook documents 7 SQL queries (one per production gate) keyed to `ai_generations` rows. Each query returns a single pass/fail value plus supporting metrics. Formatted so an on-call engineer can copy-paste into Supabase Studio.
- Runbook also covers rollback steps: flip `ANTHROPIC_VIA_GATEWAY=off`, the legacy path reactivates within seconds.

**Patterns to follow:**
- Runbook shape: no existing convention in this repo. Simple Markdown with `## Query: <name>` + fenced SQL + `## Pass criteria`.
- Standalone script pattern: looks like other `scripts/*.ts` files already in the repo (check `scripts/` dir during Unit 9).

**Test scenarios:**
- Happy path: `npm run smoke:anthropic` against a warm staging cache returns exit 0 with PASS logs.
- Error path: staging has `ANTHROPIC_VIA_GATEWAY=off` → the script detects this and exits with a clear error ("flag must be on for the smoke test to run").
- Integration: runbook SQL queries run against a realistic test dataset and return expected values.

**Verification:**
- `npm run smoke:anthropic` passes against staging in a dry run before production deploy.
- Each of the 7 PG queries returns a pass value against a post-deploy sample.

## System-Wide Impact

- **Interaction graph:**
  - `aiCall` remains the single chokepoint for both OpenAI (30+ callers unchanged) and Anthropic (1 caller migrated; 8 un-migrated).
  - Schema migrations affect `ai_generations`, `ai_usage`, `tier_limits` — any external dashboard or SQL tool depending on these tables' shape must account for the new columns and widened CHECK constraints.
  - Circuit breaker reads `ai_generations` on every `draft-generator` call (cached 5 minutes); negligible DB load given draft-generator volume.
- **Error propagation:**
  - `PromptIdRequiredError`, `UnexpectedBlockTypeError`, `TokenCeilingError`, `MissingUserIdError` are new typed errors that callers and route handlers must handle gracefully (user-facing message for the first three; 400-class for `MissingUserIdError`).
  - `ai_recording_failed` log tag becomes the alerting hook for future Sentry/datadog integration — currently only surfaces as a structured-JSON console log.
- **State lifecycle risks:**
  - Partial writes: if `recordUsage` succeeds but `ai_generations` insert fails, the user is billed but the detailed record is missing. `Promise.allSettled` + the new error log tag surfaces this asymmetry. Rare in practice; acceptable for the best-effort recording model.
  - Cache poisoning: a bad serializer (R19a) could send malformed context that caches — the Unit 2 round-trip test guards against this pre-deploy.
  - Session-id collision: extremely unlikely given `grant_application_id` is a UUID, but if `sessionId` collides across orgs the partial unique index prevents cross-org confusion because `org_id` is also in the index.
- **API surface parity:** OpenAI callers (30+) see no signature or behavior changes. Other 8 Anthropic-using `writing/*` files are unchanged. No downstream consumers broken.
- **Integration coverage:** The 5-minute cache TTL on `cacheableContext` means mid-session org profile edits do not propagate until the next drafting session; acknowledged in origin Deferred to Planning. UX should document this behavior.
- **Unchanged invariants:**
  - OpenAI path token counts, latency, and cost model.
  - All `engines/*` files (match, readiness, strategy, grantie).
  - All 8 un-migrated `writing/*` files.
  - The `ai_generations` + `ai_usage` + `tier_limits` tables' existing rows.
  - Injection detection + sanitization patterns (extended to cacheableContext, but the functions are unchanged).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Migrations 00049-00053 ship in separate PRs and merge out-of-order (Unit 5's session_id column lands before Unit 1's CHECK widening). | **Bundle constraint:** all 5 migrations land in a single PR — even if implementation work is split into multiple PRs, the migrations must merge atomically. Add `IF NOT EXISTS` / `IF EXISTS` guards on every DDL statement so any migration is re-runnable and order-tolerant. PR template should include: "Does this PR add a migration? If yes, are all related migrations bundled together?" |
| CHECK-widening migration fails because existing rows contain values outside the new allowlist. | Pre-migration inventory (Unit 1) explicitly queries `SELECT DISTINCT generation_type FROM ai_generations` and `SELECT DISTINCT action_type FROM ai_usage` before authoring 00049. Any non-conforming rows get a `UPDATE ... SET ... WHERE ...` normalization step in the same migration ahead of `ADD CONSTRAINT`. |
| Anthropic cache silently ignored (malformed block) → pure cost regression (1.25-2.0× write multiplier on every call forever). | SG-1 smoke test asserts `cacheReadTokens > 0` on a second identical call. Deploy blocked if SG-1 fails. |
| `buildDraftSectionPrompt` refactor regresses draft quality (system-role vs user-role behavioral shift). | Unit 3 eval harness with measurable compliance (word count, keyword presence) + blinded 5-vs-5 spot-check. Merge blocked on ≥5pp regression. |
| Canonical stringify package has semantic gaps for GrantIQ's org profile shape. | Unit 2 round-trip test across edge-case fixtures; version pinned + golden-fixture regression test. |
| `tier_limits` column name check reveals unexpected schema state. | Unit 1 starts with the live-DB inspection query; migration 00050 adjusts based on findings. Blocking, not silent. |
| Feature flag misconfiguration deploys new path to 100% day 1. | Default `ANTHROPIC_VIA_GATEWAY=off` at deploy; staged rollout in runbook; per-org circuit breaker as safety net. |
| Circuit breaker thrashes between enabled/disabled for a given org. | In-memory cache (5-minute TTL) prevents per-request thrashing; once tripped, stays tripped until manually cleared or TTL lapses. |
| Retry loop interacts badly with `checkUsageLimit` (double-gating or double-recording). | Unit 4 test scenarios explicitly cover retry paths; recording happens once on final success only. |
| Migrations 00049-00053 out-of-order apply on a developer machine. | Sequential numbering + `IF NOT EXISTS` idioms make each migration idempotent and re-runnable. |
| `AI_ACTION_TYPES` enum drifts again in the future. | TypeScript type derivation at the `AiCallOptions.actionType` signature catches new values at the call site; CHECK constraints reject DB writes. Belt-and-suspenders. |
| Per-org circuit breaker false-trips on legitimate cold-start traffic. | Cold-start (fewer than 5 prior rows) explicitly defaults to NOT tripped per Unit 8 spec. Threshold of 5 consecutive misses is tuned for post-warm traffic. Rollout to 10% cohort first means a 5-miss streak is ~1 hour of draft activity at typical volume, enough signal to distinguish cold-start from systemic failure. |
| Retry wrapper retries on local exceptions (e.g., `UnexpectedBlockTypeError`) and double-bills Anthropic without recording the first attempt. | Retry whitelist is **strict**: only `5xx` and `529 overloaded` HTTP errors trigger retry. Local exceptions (block type, JSON parse, schema validation) propagate immediately on attempt 1. Test scenario: `Anthropic returns 200 with unknown block type → UnexpectedBlockTypeError thrown on attempt 1; NO attempt 2; no recording row written`. |
| Tier quota-semantics change in Unit 5 (per-section → per-draft) is customer-facing and may break upsell economics: a Pro user previously hitting cap at section 3 now gets multiple full drafts. | **Out-of-band product confirmation required before Unit 5 ships.** Pricing-page language (`'Pro: 2 AI drafts per month'`) implies per-draft semantics so the fix is contractually correct, but Pro users effectively get a 5-10× quota increase. Confirm with business that intended behavior matches; consider tier-limit recalibration if revenue model assumed throttling. |
| Unit 3 eval treats "5pp parity with baseline" as the bar but baseline quality may already be unacceptable in absolute terms. | Add absolute-floor gates alongside relative gates: word-count compliance ≥ 90%, keyword-presence ≥ 90%, structural-cues ≥ 85%. Both must pass. If pre-refactor baseline misses the absolute floor, freeze the refactor and open a separate "improve base prompt quality" workstream. |
| Token estimator (`length / 4`) under-estimates for non-English content (CJK ~1-1.5 chars/token). | English-only assumption documented inline; non-English fixture test in Unit 6 asserts estimator-vs-actual within 20%; if GrantIQ supports non-English grants, switch to Anthropic's `count_tokens` endpoint. |
| Legacy code path (`legacyGenerateSectionViaDirectAnthropic`) lives indefinitely after rollout, becoming an attack surface and divergence source. | **Forcing function:** ticket GIQ-CLEANUP-1 filed at merge time with deadline 2026-05-10; in-code `// REMOVE BY 2026-05-10` comment; CI grep rule added in cleanup PR enforces the date going forward. |

## Documentation / Operational Notes

- **Runbook**: `docs/runbooks/anthropic-gateway-rollout.md` (created in Unit 9) — rollout procedure, gate queries, rollback steps.
- **UX note**: profile edits mid-drafting-session propagate at next session (5m TTL on `cacheableContext`). Document in user-facing help.
- **Post-deploy compound**: after week-1 passes PG-1 through PG-7 for 7 calendar days, run `ce-compound` to capture learnings docs under (new) `docs/solutions/`:
  - BD-1 post-mortem on silent `Promise.allSettled` failures.
  - R19a canonical serialization pattern.
  - CHECK-constraint widening idiom (links to `00031` + `00049`).
  - Session-based usage dedupe pattern (partial unique index + ON CONFLICT).
  - Anthropic 4-breakpoint budget as a planning constraint.
- **Next.js**: this plan does not touch API routes or middleware in week 1, so the `AGENTS.md` directive ("read `node_modules/next/dist/docs/` before writing Next.js code") is not triggered. If Unit 8 expands to include an admin UI in a follow-up, apply the directive then.

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-19-grantiq-llm-gateway-extension-requirements.md`
- **Ideation context:** `docs/ideation/2026-04-19-grantiq-token-usage-ideation.md` (7 survivors; this plan implements Survivor #1 week-1 scope)
- Anthropic Prompt Caching Docs: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- ProjectDiscovery cost-reduction postmortem: https://projectdiscovery.io/blog/how-we-cut-llm-cost-with-prompt-caching
- Key codebase references: `src/lib/ai/call.ts`, `src/lib/ai/client.ts`, `src/lib/ai/usage.ts`, `src/lib/ai/writing/draft-generator.ts`, `src/lib/ai/writing/prompts.ts`, `supabase/migrations/00005_ai_tables.sql`, `supabase/migrations/00031_add_growth_tier.sql`, `tests/lib/ai/engines/grantie.test.ts`
