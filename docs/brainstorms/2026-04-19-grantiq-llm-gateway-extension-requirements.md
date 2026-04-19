---
date: 2026-04-19
topic: grantiq-llm-gateway-extension
---

# GrantIQ `aiCall` Extension — Anthropic + Prompt Caching + promptId

## Problem Frame

`src/lib/ai/call.ts → aiCall()` already gates the **OpenAI** path with injection detection, input sanitization, tier-based usage limits (`checkUsageLimit`), and dual-table cost recording (`ai_usage` + `ai_generations`). This is a working half-Gateway.

**What bypasses it today:** 9 files in `src/lib/ai/writing/*` instantiate Anthropic directly via `new Anthropic()` — `draft-generator`, `ai-auditor`, `funder-analyzer`, `review-simulator`, `rfp-parser`, `compliance-sentinel`, `coherence-checker`, `loi-generator`, `narrative-memory` (verified via grep; `budget-narrative`, `pipeline`, `schemas`, and `prompts` do not call Anthropic directly). That path has **zero** usage enforcement, injection detection, cost recording, or cache control. It is also the higher-cost provider (Sonnet/Opus writing vs OpenAI mini-tier scoring) — so the expensive path is the unobserved path.

**Why extending aiCall beats building a new Gateway:** aiCall's core invariants (injection guard, usage gate, dual-table recording *intent*) are in place; the Anthropic-adjacent gaps are additive rather than fundamental. Adding a `provider` param + `cacheableContext` + `promptId` reuses those invariants and closes the observability/enforcement gap in a bounded patch. A fresh Gateway would take 1-2 weeks and would re-implement what already exists.

**Corrected effort estimate (post-doc-review):** week-1 is **5-7 working days**, not the original 2-3 day estimate. The revision reflects three discoveries from doc-review (detailed in `Blocking Discoveries`, below): (a) the `ai_generations` insert is silently failing against the actual schema and must be repaired as part of this work, (b) `buildDraftSectionPrompt` interpolates section-specific variables into the system prompt today and must be refactored to expose a stable prefix, (c) the row-based usage gate needs a token-based backstop added to prevent the Anthropic path from bypassing cost control by volume.

## Blocking Discoveries (from doc-review, must be resolved in this work)

The doc-review pass surfaced several code-reality facts that invalidate the original "safe reuse" framing. These are not planning details — they are prerequisites that land in the same PR as the Anthropic extension work, since each is load-bearing for at least one requirement:

- **BD-1. `ai_generations` insert is currently broken (silent failure).** Migration `supabase/migrations/00005_ai_tables.sql` defines `ai_generations` with `user_id UUID NOT NULL REFERENCES auth.users(id)`, `generation_type TEXT NOT NULL CHECK (generation_type IN ('draft', 'audit', 'rewrite', 'loi', 'budget', 'chat'))`, and `model_used TEXT NOT NULL`. `call.ts:127` inserts `{org_id, action_type, model, ...}` — wrong column names, missing `user_id`, and several live `actionType` values fail the CHECK. **Every OpenAI `aiCall` is failing this insert today**, silently swallowed by `Promise.allSettled` on line 141. Fix in scope: (a) enumerate the **complete** set of `actionType` values across `src/` via grep (confirmed: `'match'`, `'readiness_score'`, `'roadmap'`, `'eligibility_status'`, `'draft'`, `'audit'`, `'chat'`; adopt a single exported enum in `usage.ts` as the source of truth to prevent future drift); (b) widen **both** CHECK constraints — `ai_generations.generation_type` **and** `ai_usage.action_type` (also defined with a CHECK in `00005_ai_tables.sql:49`) — to match the enum; (c) update `call.ts:127` to write `user_id` (plumbed from `AiCallOptions.userId` already on line 16) and rename inserted columns to `generation_type` and `model_used`; (d) replace the `Promise.allSettled` silent-swallow pattern with an observability tripwire — log failures at `error` severity AND emit to the same channel that surfaces other production errors (this is how BD-1 went undetected in the first place; not fixing the swallow means a future drift repeats the same bug invisibly); (e) backfill-not-required (table is effectively empty post-swallow).
- **BD-2. `tier_limits` column naming conflict.** Migration `00007_billing_tables.sql:39` defines the column as `feature TEXT NOT NULL`. Migration `00031_add_growth_tier.sql:15` INSERTs into a column named `action_type`. One of the two has never run, or an undocumented rename happened between them. `checkUsageLimit` at `usage.ts:44` queries `.eq('feature', feature)` — consistent with 00007. **Action:** check the live DB schema (`SELECT column_name FROM information_schema.columns WHERE table_name='tier_limits';`) and reconcile — either re-run 00031 after fixing its column name, or add a new migration that renames the column if that's what production reflects. Decide before touching the Anthropic path so usage enforcement remains coherent.

**Headline cost opportunity:** Anthropic prompt caching yields 90% discount on cache reads. ProjectDiscovery achieved 73.7% cache hit rate with one structural refactor (relocating dynamic content to the tail) and cut their bill 59-70%. GrantIQ's 11 system prompts (~178 lines each) and per-call org profile duplication are the exact shape this lever fits.

## Requirements

**API Surface**
- **R1.** `aiCall` accepts a new optional `provider: 'openai' | 'anthropic'` param, defaulting to `'openai'`. Existing callers require no changes.
- **R2.** `aiCall` accepts a new optional `cacheableContext: string` param — content that is stable across calls in a session but varies across orgs (e.g., the org profile doc).
- **R3.** `aiCall` accepts a new optional `promptId: string` param for observability and cache-key stability.
- **R4.** `promptId` is **required** when `provider === 'anthropic'`. It is optional for `provider === 'openai'` (callers can add it gradually for observability).
- **R5.** `promptId` follows `<domain>.<feature>.v<N>` convention (flat namespaced string). Version suffix is human-managed; bumping it forces cache invalidation.
- **R6.** `aiCall`'s return shape (`AiCallResult`) gains optional `cacheCreationTokens?: number` and `cacheReadTokens?: number` fields (populated only on Anthropic responses).

**Cache Control**
- **R7.** When `provider === 'anthropic'`, the wrapper auto-marks `systemPrompt` as a cache breakpoint with `cache_control: { type: 'ephemeral', ttl: '1h' }`.
- **R8.** When `cacheableContext` is supplied, the wrapper injects it as a cached user-message block with `cache_control: { type: 'ephemeral', ttl: '5m' }`, positioned **before** the user input.
- **R9.** User input (`userInput`) is never marked cacheable — it flows to the message tail.
- **R10.** OpenAI path emits no `cache_control` headers; OpenAI's server-side automatic caching for ≥1024-token stable prefixes applies unchanged.
- **R11.** Callers never touch `cache_control` directly — the wrapper owns cache structure.

**Usage Enforcement & Recording**
- **R12.** Anthropic calls flow through the same pre-flight `detectPromptInjection` + `sanitizeInput` as OpenAI calls. Both guards apply to `userInput` **and** `cacheableContext` — the latter contains org-admin-editable fields (`mission_statement`, `voice_profile`, `population_served`, `program_areas`) that are user-controllable and must not be injected into a cached block unsanitized.
- **R13.** Anthropic calls flow through the same `checkUsageLimit(orgId, actionType, tier)` pre-flight as OpenAI calls. **Counter semantics are redefined:** `checkUsageLimit` currently counts rows per `(org_id, action_type, billing_period)`. Today's `draft-generator` would insert **one `ai_usage` row per section call** (6-8 rows per draft), which means a Pro-tier `ai_drafts: 2` limit would block mid-section on the first draft. Fix: `recordUsage` is extended to dedupe within a single drafting session via a new optional `session_id` param (passed through `aiCall`). For draft-generator, `session_id` is the `grant_application_id`. Implementation — explicit to avoid the known check-then-act race in naive select-then-insert-or-update patterns: (a) **schema migration** — `ALTER TABLE ai_usage ADD COLUMN session_id TEXT` + `CREATE UNIQUE INDEX ai_usage_session_unique ON ai_usage (org_id, action_type, session_id) WHERE session_id IS NOT NULL`; (b) **upsert** — `recordUsage` uses `INSERT ... ON CONFLICT (org_id, action_type, session_id) DO UPDATE SET tokens_input = ai_usage.tokens_input + EXCLUDED.tokens_input, tokens_output = ai_usage.tokens_output + EXCLUDED.tokens_output, estimated_cost_cents = ai_usage.estimated_cost_cents + EXCLUDED.estimated_cost_cents` when `session_id` is supplied, otherwise falls back to plain INSERT. This makes "one draft = one row" atomic under concurrent writes.
- **Scope note on R13:** `checkUsageLimit` today has a pre-existing keying mismatch — it reads `tier_limits` by `feature` (via `ACTION_TO_FEATURE`) but counts `ai_usage` rows by raw `action_type`. The R13 session_id fix resolves the "one draft = one row" issue for `draft` (where `actionType` ↔ `feature` is 1:1). Multi-to-one mappings (`match`/`roadmap` both → `matching_runs`) are left unchanged in this scope — noted as follow-up in Deferred to Planning.
- **R13a.** Add a **token-based soft cap** alongside the existing row-based hard cap. **Enforcement is pre-flight with conservative estimation:** before issuing the call, `checkUsageLimit` sums `tokens_input + tokens_output` for `(org_id, billing_period)` across the current month (call this `spent`), estimates the incoming call's input tokens as `(systemPrompt.length + cacheableContext?.length + userInput.length) / 4` plus the configured `maxTokens` as the output estimate (call this `estimate`), and rejects when `spent + estimate > tier_limits.monthly_token_ceiling`. Over-ceiling calls auto-downgrade to the Haiku tier **before issuance** when the promptId has an equivalent Haiku mapping (week-2 tiering registry); else they reject with `TokenCeilingError` immediately. A secondary per-call hard ceiling (200K tokens) bounds worst-case single-call damage independent of monthly budget. `monthly_token_ceiling` is a new nullable INT column on `tier_limits` (null = unlimited, matching existing `monthly_limit` convention). ~25 LOC in `usage.ts` plus the migration; no schema change to `ai_usage` since `tokens_input` / `tokens_output` already exist.
- **R14.** Anthropic calls record to `ai_usage` and `ai_generations` via the same paths as OpenAI calls.
- **R15.** `ai_generations` gains three new nullable columns: `prompt_id TEXT`, `cache_creation_tokens INT`, `cache_read_tokens INT`.
- **R16.** A **new sibling function** `estimateAnthropicCostCents(model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, systemTtl)` is added alongside `estimateCostCents` — **the existing OpenAI-focused `estimateCostCents` signature is not modified**. Anthropic pricing is tiered: cache-write tokens billed at 1.25× input for 5-min TTL writes, **2.0× input for 1-hour TTL writes**, cache-read tokens at 0.1× input, non-cached input at 1× rate. The `systemTtl` arg lets the wrapper apportion `cacheCreationTokens` between the two write tiers based on which breakpoint they belong to.

**Week-1 Migration Scope**
- **R17.** Only `src/lib/ai/writing/draft-generator.ts` migrates in week 1. Verify pattern works in production before scaling. The migration targets the **inner** Anthropic SDK call sites — `generateSection()` at `draft-generator.ts:132` and `generateBudget()` at `draft-generator.ts:182` — not a thin wrapper around the outer `generateDraft()` entry. Wrapping only the outer entry would leave the actual SDK calls uncovered. The migration also **deletes the dead `_trackUsage` function at `draft-generator.ts:207`** (confirmed unused via repo-wide grep) — without removal, once the inner calls migrate to `aiCall`, any future revival of `_trackUsage` would cause double-writes to `ai_usage` + `ai_generations`.
- **R18.** Draft-generator's `buildDraftSectionPrompt` in `src/lib/ai/writing/prompts.ts:171-268` is **refactored (required, not optional)**. The function currently interpolates **seven** section-specific fields directly into the returned system prompt string — `section_name`, `section_type`, `section_description`, `word_limit`, `page_limit`, `special_instructions`, and `scoring_criteria` — producing a different `systemPrompt` for every section call. Cache hits are structurally impossible in that shape. The refactor extracts all seven fields out of the system prompt into a structured user-message segment (appended to `userInput`). The returned `systemPrompt` becomes invariant across all sections of a drafting session — only the writing rules, output format rules, and tone/voice instructions. **Measurable eval (required before merge):** run pre-refactor vs post-refactor prompts across **20+ sections spanning 3-5 section types** (not 5 total) and assert measurable compliance, not just blinded preference — word count within ±10% of `word_limit` on ≥95% of sections, all `scoring_criteria` keyword tokens present in output on ≥95%, section-type-appropriate structural cues present. Quality-regression risk is real: Anthropic models weight system-role instructions more strongly than user-role; moving constraints to user role can degrade compliance even while blinded reviewers can't tell drafts apart. ~1-day refactor + ~0.5 day eval; gate the Anthropic migration on eval pass.
- **R19.** Org profile + org capabilities (currently serialized into the per-section user message) move into `cacheableContext` so they cache once per drafting session across all 6-8 section calls.
- **R19a.** `cacheableContext` must be produced by a **canonical stable-stringify utility** (either a 30-line custom serializer with sorted keys + normalized primitives, or the `safe-stable-stringify` npm package at a pinned version). JavaScript's default `JSON.stringify` preserves insertion order, not semantic order — the same logical org profile retrieved via a different Supabase query path produces a different byte sequence and therefore a different Anthropic cache key, which silently drops cache hit rate to 0% even when everything else in the pipeline works. This is a blocking correctness pre-condition for R19, not a planning detail. **Two tests required (stability alone is insufficient):** (1) **stability** — round-trip the same org's profile through the serializer twice from two different call sites in the codebase and assert byte-identical output; (2) **semantic correctness** — assert `deepEqual(deserialize(serialize(profile)), profile)` for a fixture set covering edge cases (empty strings, nulls, Unicode, arrays, nested objects) and assert every top-level key of the source profile appears in the serialized output. A bug that drops keys with empty values or truncates non-ASCII would pass the stability test alone but silently send malformed context to Anthropic — cache metrics green, drafts quality-degraded in ways spot-checks miss.
- **R19b.** Draft-generator preserves its **existing sequential execution model** (`draft-generator.ts:268-279` runs sections in a serial `for...of` loop with `await`). The serial shape naturally produces the "1 write on section 1, N-1 reads on sections 2-N" pattern that caching requires — no change needed. **Do not parallelize sections as part of this work.** Parallelization is a separate latency-optimization exercise that would introduce (a) a check-then-act race on the `grant_drafts` progress-update path at lines 270-274 (not idempotent across concurrent writes), (b) an R13 upsert contention footprint that works under R13's ON CONFLICT clause but adds complexity to reason about, and (c) Anthropic RPM contention. If parallelization is considered later, it must first satisfy: a failure-halt contract (section 1 failure prevents sections 2-N launching), per-section cache-creation verification (`cacheCreationTokens > 0` confirmed on section 1 response before fan-out), and idempotent progress-update path.
- **R20.** Per-section volatile content (RFP analysis, funder intel, examples, section name + guidance) stays in `userInput`.
- **R21.** The other 8 `writing/*` files that instantiate Anthropic directly (`ai-auditor`, `funder-analyzer`, `review-simulator`, `rfp-parser`, `compliance-sentinel`, `coherence-checker`, `loi-generator`, `narrative-memory`) remain unchanged this week and migrate in week 2.
- **R22.** The 4 `engines/*` files (match, readiness, strategy, grantie) remain unchanged — they already use `aiCall` for OpenAI. Adding `promptId` to them is a follow-up, not week-1 work.

**Observability (Week 1)**
- **R23.** `promptId` is recorded on every draft-generator call; new raw column in `ai_generations` enables ad-hoc SQL aggregation.
- **R24.** Cache-creation vs cache-read tokens are recorded separately so cache hit rate can be verified via SQL (e.g., `SELECT AVG(cache_read_tokens::float / NULLIF(tokens_input, 0)) FROM ai_generations WHERE prompt_id LIKE 'writing.draft.%'`).
- **R25.** No new dashboard is built this week. Langfuse/LiteLLM integration is week 2+.

**Response Normalization & Retry Semantics (Week 1)**
- **R26.** Anthropic's `messages.create` returns `content` as an array of blocks (typically `[{type:'text', text:'...'}]`, but may include multiple blocks, `tool_use` blocks, or an empty array on `stop_reason==='max_tokens'`). The wrapper normalizes to the same string `content` field that OpenAI callers expect by concatenating all `type:'text'` blocks in order. Non-text blocks (e.g., `tool_use`) are not silently dropped — the wrapper throws a typed error when encountering unexpected block types in week 1. `stop_reason` is surfaced on `AiCallResult` so callers can detect max-tokens truncation.
- **R27.** Retries on transient Anthropic failures (`529 overloaded`, `5xx`) happen **inside** `aiCall` — up to 2 attempts total with exponential backoff. Retries re-use the already-passed `checkUsageLimit` result (no double-gating) and record only once to `ai_usage` + `ai_generations` on final success. Retry prompts never echo previous model output or Zod error text back into the message content — only a static repair instruction is appended if needed. If all retries fail, a typed error propagates and no usage rows are written.

## Success Criteria

**Pre-deploy gate (staging smoke test — MUST pass before production rollout):**
- **SG-1.** Identical `(systemPrompt, cacheableContext, userInput)` issued twice within 5 minutes in staging returns `cacheReadTokens > 0` on the second call. Without this smoke test, a malformed `cache_control` block returns 200 OK with `cacheReadTokens=0` indefinitely while billing every call at the 1.25-2.0× write multiplier — a pure cost regression indistinguishable from normal ramp-up. This is the silent-failure tripwire.
- **SG-2.** Running the same draft-generator session twice back-to-back shows blended cost-per-draft drops ≥ 40%. This measures the *outcome* (cost), not the behavior (cache hit rate) — a 50% hit rate could mean 60% cost cut or 5% cost cut depending on where the tokens live.

**Production gate (after first 100 real draft-generator calls):**
- **PG-1. Intra-session cache hit rate ≥ 85%** on multi-section sessions, measured via `SELECT AVG(cache_read_tokens::float / NULLIF(tokens_input, 0)) FROM ai_generations WHERE prompt_id LIKE 'writing.draft.%' AND grant_application_id IN (SELECT grant_application_id FROM ai_generations WHERE prompt_id LIKE 'writing.draft.%' GROUP BY grant_application_id HAVING COUNT(*) >= 2)`. Measures sections 2-N vs section 1 within the same drafting session; this is where caching is expected to fire. Supplementary report — also compute the **global** cross-session hit rate (no `HAVING` filter) and the **drafts-started-to-completed ratio** vs pre-migration baseline, to detect the early-abandon bias where users quit after section 1.
- **PG-2. Cost per completed draft drops ≥ 40%** vs pre-migration baseline, measured in `ai_generations.estimated_cost_cents` summed per `grant_application_id`.
- **PG-3. No regression in draft quality** — manual spot-check of 5 pre-migration vs 5 post-migration drafts; reviewer cannot consistently identify which is which.
- **PG-4. Latency delta ≤ +1s** on section 1 vs pre-migration baseline (Anthropic cache-write requests typically add 200-800ms; ≤+1s is a realistic gate). Sections 2-N should be **faster** than baseline (cache reads are cheaper and faster than non-cached).
- **PG-5. Zero production errors** attributable to aiCall changes in the first 48 hours post-deploy.
- **PG-6. OpenAI path unchanged** — no latency change, no cost change, no new migrations across `engines/*` or services using OpenAI today. (Note: the `ai_generations` insert bug repair per BD-1 **will** change OpenAI behavior — it will start successfully recording rows where today it silently fails. This is a correctness win, not a regression.)
- **PG-7. `ai_generations.prompt_id` populated on 100% of draft-generator calls** (null on all other rows — that's expected and correct for the pre-migration OpenAI paths).

## Rollout Strategy

- **Feature flag `ANTHROPIC_VIA_GATEWAY=true`** gates the new Anthropic path at `draft-generator.ts:132` and `draft-generator.ts:182`. Default off in production at deploy time; flipped on for GrantIQ's own test org first, then 10% of production orgs for 24h, then 100% if PG-1 through PG-7 all green. Two code paths coexist for up to 7 days post-deploy. **Per-org circuit breaker during the 10% rollout:** publish per-org cache-read-token metrics (not just aggregates); any org in the cohort with `cache_read_tokens=0` across ≥5 consecutive calls is automatically flipped back to the pre-migration path and flagged for investigation. Prevents one pathological org (50KB profile, sanitizeInput edge case, etc.) from silently burning cost under the cover of a green aggregate metric.
- **Rollback:** flip `ANTHROPIC_VIA_GATEWAY=false` — immediately reverts to `new Anthropic()` direct-call path. The `ai_generations` schema fix (BD-1) is forward-compatible (widening a CHECK constraint + column renames won't break rollback). Rows written with `prompt_id` remain but are ignored by the pre-migration code path.
- **Week-2 go/no-go criteria (same thresholds as week-1):** before migrating the other 8 Anthropic files, confirm draft-generator has sustained PG-1 ≥ 85% and PG-2 ≥ 40% over 7 calendar days with ≥ 500 draft sections recorded. If either misses, do not proceed with week-2 migration — instead investigate the pattern failure (likely candidates: prompt-shape drift, serialization instability, breakpoint exhaustion) and fix before scaling.

## Scope Boundaries

**Explicitly out of scope this week:**
- Model-tier routing (Haiku ↔ Sonnet ↔ Opus selection based on task type — R13a's Haiku downgrade is a narrow budget-driven case, not a general router)
- Batch API lane (`lane: 'batch'` parameter)
- PromptRegistry with eval harness
- Langfuse or LiteLLM integration
- The other 8 un-migrated `writing/*` files (`ai-auditor`, `funder-analyzer`, `review-simulator`, `rfp-parser`, `compliance-sentinel`, `coherence-checker`, `loi-generator`, `narrative-memory`)
- Explicit OpenAI prompt caching (it's automatic on stable prefixes)
- `engines/*` adding promptId (observability nice-to-have, not week-1 blocker)
- Parallelizing draft sections (explicitly deferred per R19b — would require orchestration guarantees this scope does not provide)

**Explicitly out of scope permanently (per ideation rejection list):**
- Content-addressable cross-tenant prompt dedupe (privacy/correctness risk)
- Provider RTB auction between Anthropic and OpenAI (overengineered at current scale)
- Three-tier (exact + semantic + origin) cache stack (premature)

**Anthropic cache-breakpoint budget (factual constraint):**
- Anthropic allows at most **4** `cache_control` breakpoints per request. Week-1 auto-marking uses 2 (system + optional cacheableContext). Week-2 migrations that need additional cached blocks (e.g., per-file static examples + org profile + RFP boilerplate) must either share the same `cacheableContext` param (via concatenation with a canonical delimiter) or extend the wrapper API — this is tracked explicitly as a week-2 scope constraint, not silently deferred.

## Key Decisions

- **Single `aiCall` with provider param** (vs sibling `aiCallAnthropic` or middleware chain) — zero churn for 30+ existing OpenAI call sites; preserves all aiCall invariants in one place.
- **Auto-cache system + optional `cacheableContext`** (vs explicit `cacheBlocks[]` or registry-driven) — minimum caller ceremony; 2 breakpoints covers the ProjectDiscovery pattern; callers never write `cache_control` by hand.
- **`promptId` required on Anthropic only** (vs everywhere or fully optional) — observability where the money is without forcing a churn commit across 30+ OpenAI call sites.
- **Draft-generator only in week 1** (vs top 5 or all 13) — single-file blast radius; verify the pattern empirically (cache hit rate, quality, latency) before migrating the other 12.
- **Row-based `ai_usage` stays; add token observability in `ai_generations`** (vs switch to token-based cap now) — monetization model change is a product decision for week 2+; this week focuses on making costs visible without changing how limits are priced.
- **1h TTL on system, 5min TTL on cacheableContext** — system is near-invariant (human edits to prompt files happen rarely), orgs change profiles mid-session rarely but do occur; 5min covers a single drafting session.

## Dependencies / Assumptions

- Anthropic prompt caching is generally available (verified: Anthropic docs, 2026-04-19).
- Anthropic cache pricing: 1.25× input for writes (5-min TTL) / 2.0× for 1-hour TTL writes, 0.1× input for reads (verified: pricing research).
- `@anthropic-ai/sdk` v0.80 already installed (verified: `src/lib/ai/client.ts`) and supports `cache_control` block parameter.
- Supabase `ai_generations` table can accept `ALTER TABLE ADD COLUMN` with nullable columns without breaking existing RLS policies — needs verification during planning.
- `draft` action type in `ACTION_TO_FEATURE` maps to `ai_drafts` feature (verified: `src/lib/ai/usage.ts:8`) — draft-generator's existing budget gating path is reusable.

## Request Flow (extended aiCall)

```
Caller
  │
  ▼
aiCall({provider, promptId, systemPrompt, cacheableContext?, userInput, orgId, tier, actionType, ...})
  │
  ├─▶ detectPromptInjection(userInput)    ← same as today
  ├─▶ sanitizeInput(userInput)            ← same as today
  ├─▶ checkUsageLimit(orgId, actionType, tier)  ← same as today; blocks if over tier limit
  │
  ├─ provider === 'openai':
  │    └─▶ openai.chat.completions.create({ model, messages: [system, user] })
  │         (OpenAI auto-caches stable prefix ≥1024 tokens, server-side)
  │
  └─ provider === 'anthropic':
       └─▶ anthropic.messages.create({
              model,
              system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral', ttl: '1h' } }],
              messages: [
                cacheableContext && { role: 'user', content: [{ type: 'text', text: cacheableContext, cache_control: { type: 'ephemeral', ttl: '5m' } }] },
                { role: 'user', content: userInput }    ← no cache_control
              ]
           })
  │
  ▼
Record to ai_usage (monthly counter) + ai_generations (detailed, now with prompt_id, cache_*_tokens)
  │
  ▼
Return { content, inputTokens, outputTokens, costCents, model, cacheCreationTokens?, cacheReadTokens? }
```

## Outstanding Questions

### Resolve Before Planning
*(none — the doc-review pass resolved the blocking questions by elevating them into requirements: buildDraftSectionPrompt refactor sizing → R18, canonical serialization → R19a, parallel fan-out → R19b, rollback strategy → Rollout Strategy section, ai_generations schema bug → BD-1, tier_limits conflict → BD-2, row-based-budget gaps → R13 / R13a, response shape → R26, retry semantics → R27, cacheableContext sanitization → R12.)*

### Deferred to Planning
- **[Affects R15][Technical]** Supabase migration approach for the three new `ai_generations` columns — ALTER TABLE with nullable columns (simple, forward-compatible) vs a new sidecar `ai_generations_detail` table (safer if RLS policies forbid ALTER). Pick during planning; ALTER is likely fine.
- **[Affects BD-2][Needs research]** Live DB inspection to determine whether `tier_limits.feature` or `tier_limits.action_type` is the actual column name in production. Blocks the R13 reuse claim until resolved. Expected ~5 minutes of `psql` / Supabase studio time. **Secondary finding from re-review:** migration `00031_add_growth_tier.sql` seeds with action-type values `'writing'`, `'readiness'`, `'strategy'` that do not match `ACTION_TO_FEATURE`'s `'ai_drafts'`, `'readiness_scores'`, `'matching_runs'` — meaning the growth tier has effectively no enforceable limits today regardless of which column name wins the BD-2 reconciliation. Fix the seed values in the same migration that resolves BD-2.
- **[Affects ACTION_TO_FEATURE][Technical]** Reconcile the full `actionType` ↔ `feature` mapping. `usage.ts:4-11` is missing `eligibility_status` (used by `src/app/api/services/eligibility-status/generate/route.ts:107` with `skipUsageCheck: true`). Add it alongside the BD-1 enum consolidation — one exported constant eliminates future drift.
- **[Affects R13 scope note][Technical]** Counter keying mismatch (checkUsageLimit reads `tier_limits` by `feature`, counts `ai_usage` by raw `action_type`) affects multi-to-one mappings like `match`/`roadmap` → `matching_runs`. Out of scope for this Anthropic extension; worth noting as a follow-up cost-control correctness fix.
- **[Affects R16 / estimateAnthropicCostCents][Needs research]** Reconfirm Anthropic cache write multipliers (1.25× 5min / 2.0× 1h) against the live pricing page on implementation day — pricing has evolved during 2025-2026 and the Dependencies note was verified 2026-04-19.
- **[Affects R12 / R19a][Technical]** Audit `sanitizeInput` and `detectPromptInjection` behavior on structured content: curly quotes, em-dashes, non-ASCII org names, and JSON-shaped strings up to 4KB. These functions were designed for short free-text prompts; planning should confirm they preserve semantics on the larger, more structured payloads that flow via `cacheableContext`.
- **[Affects R21][Security]** The 8 un-migrated `writing/*` files (`ai-auditor`, `funder-analyzer`, `review-simulator`, `rfp-parser`, `compliance-sentinel`, `coherence-checker`, `loi-generator`, `narrative-memory`) remain on `new Anthropic()` through week-2. This is not a *new* regression (they're ungated today), but week-2 planning should set a hard deadline and consider an interim per-org dollar-cap at the route layer as a stopgap.
- **[Affects skipUsageCheck (call.ts:29)][Security]** The existing `skipUsageCheck: boolean` escape hatch allows any caller to bypass the gate. Consider: for `provider === 'anthropic'`, require that `skipUsageCheck: true` be paired with a named internal-caller allowlist entry — else throw. ~10 LOC guardrail; worth adding in week-2 polish.
- **[Affects R19][Product]** Mid-session org-profile edits: the 5m `cacheableContext` TTL means a user edit to `mission_statement` mid-draft is invisible to sections 2-N until a new drafting session. Acceptable (most edits happen between drafts, not during) but surface in UX: note that profile changes take effect at next drafting session.

## Next Steps
→ `/ce-plan` for structured implementation planning (no blocking questions remain).
