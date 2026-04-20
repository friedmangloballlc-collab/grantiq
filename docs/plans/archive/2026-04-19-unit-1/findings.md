# Findings & Decisions: Unit 1 — Schema prerequisites

## Requirements
Captured from `docs/plans/2026-04-19-001-feat-grantiq-aicall-anthropic-extension-plan.md` Unit 1:
- Repair `ai_generations` insert (BD-1)
- Reconcile `tier_limits` column conflict (BD-2)
- Introduce `AI_ACTION_TYPES` enum as source of truth
- Fix growth-tier seed-value mismatch
- Wire Sentry tripwire on recording failures
- Update `ACTION_TO_FEATURE` to cover `eligibility_status`
- Tests across `tests/lib/ai/call.test.ts` (new) + `tests/lib/ai/usage.test.ts` (new)

## Research Findings (from prior brainstorm + plan research)
- `src/lib/ai/call.ts:127` currently inserts `{ org_id, action_type, model, tokens_input, tokens_output, estimated_cost_cents }` — wrong column names (schema requires `generation_type`, `model_used`) and missing `user_id` (NOT NULL in schema).
- `Promise.allSettled` on `src/lib/ai/call.ts:141` swallows the rejection silently. `logger.error` on line 136 fires but emits to console only. No alerting hookup today.
- Schema CHECK constraint on `ai_generations.generation_type` per `supabase/migrations/00005_ai_tables.sql:20` allows: `'draft', 'audit', 'rewrite', 'loi', 'budget', 'chat'`. Live `actionType` values seen via grep also include: `'match'`, `'readiness_score'`, `'roadmap'`, `'eligibility_status'`. Mismatch → CHECK violation on every insert with these values.
- `ai_usage` has its own separate CHECK constraint on `action_type` at migration 00005:49 — must be widened in the same migration as `ai_generations`.
- `tier_limits` column-name conflict: migration `00007_billing_tables.sql:39` defines `feature TEXT NOT NULL`; migration `00031_add_growth_tier.sql:15` INSERTs into `action_type`. `usage.ts:44` queries `.eq('feature', feature)` — agrees with 00007. Live DB inspection required before authoring fix.
- Growth-tier seed values in `00031_add_growth_tier.sql` use `'writing'`, `'readiness'`, `'strategy'` — none of which match `ACTION_TO_FEATURE`'s actual feature names (`'ai_drafts'`, `'readiness_scores'`, `'matching_runs'`). Even after BD-2 column resolution, growth-tier limits look up nothing.
- `usage.ts:49-51`: when `tier_limits` lookup fails, returns `allowed: true, limit: null` — i.e., **unlimited usage**. So if growth-tier rows are missing, growth customers currently pay for nothing. Separate P1 ticket required if this is the case.
- Sentry IS installed: `package.json:20` has `@sentry/nextjs` 10.48.0; `sentry.{server,client,edge}.config.ts` are wired. Use `Sentry.captureException(error, { tags, extra })`.
- Dead `_trackUsage` function at `src/lib/ai/writing/draft-generator.ts:207` already had the CORRECT schema shape (`user_id`, `generation_type`, `model_used`) — i.e., the right code existed but was never wired up. Unit 7 deletes it; Unit 1 fixes the live code path.

## Live DB Inventory

### Q1: `tier_limits` column name (✅ ran 2026-04-19 16:54)
- Result: columns are `id`, `tier`, `feature`, `monthly_limit`, **`per_request_limit`**
- The column is **`feature`** (matches migration `00007_billing_tables.sql:39` and `usage.ts:44` query), NOT `action_type`
- Migration `00031_add_growth_tier.sql:15` INSERTs into a column named `action_type` — that statement **must have failed silently or never ran**. Growth-tier rows are presumed missing in production (verify in Q4).
- **NEW DISCOVERY:** `per_request_limit` column exists in `tier_limits` and was not mentioned in the plan. Likely a per-call cap (vs `monthly_limit` which is per-billing-period). Implications: (a) the token-based soft cap in Unit 6 can probably reuse this column shape rather than introducing a brand-new `monthly_token_ceiling`; (b) check what populates `per_request_limit` today and whether it's enforced.
- Action implied:
  - Migration 00050 (BD-2 fix) is needed — but it's a **migration 00031 reissue + seed-value fix**, not a column rename. The live schema is correct (column = `feature`); 00031's INSERT was wrong on column name AND wrong on values (`'writing'` vs `'ai_drafts'`).
  - **New item for Phase 2/Phase 3:** investigate `per_request_limit` — could replace or simplify Unit 6's `monthly_token_ceiling` design. May also already provide a per-call cap that makes Unit 6's 200K hard ceiling redundant.

### Q2: `ai_generations.generation_type` distinct values (✅ ran 2026-04-19 16:54)
- Result: **"Success. No rows returned"** — table is empty
- Confirms BD-1: every OpenAI `aiCall` has been silently failing the `ai_generations` insert since launch. No row ever made it to the table.
- Legacy values requiring normalization: **none** (table is empty, so the CHECK widening will succeed without any UPDATE pre-step)
- **Implication:** Phase 3 migration is simpler than feared — no backfill or normalization step needed. Can `DROP CONSTRAINT IF EXISTS / ADD CONSTRAINT` cleanly.

### Q3: `ai_usage.action_type` distinct values (✅ ran 2026-04-19 16:56)
- Result: **1 row total — `action_type='readiness_score'`, count=1**
- Implications:
  - `ai_usage` recording works at least sometimes (contrast with `ai_generations` which is empty). The BD-1 schema mismatch is isolated to `ai_generations` only — `ai_usage` writes have a different code path that succeeded once.
  - No CHECK widening risk: the only live value (`'readiness_score'`) is already in our 10-value widened list. Migration 00049 can DROP CONSTRAINT / ADD CONSTRAINT cleanly with no UPDATE pre-step.
  - **Open question:** the fact that `ai_usage` was successfully written suggests its CHECK constraint at `00005_ai_tables.sql:49` either doesn't include the 6-value restriction I assumed, OR was widened by a later migration. Need to verify by reading the actual migration. Could mean less work for this unit.
  - **Anomaly worth noting:** only 1 production usage row total is suspiciously low. Either (a) traffic really is that low pre-launch (consistent with "code complete, needs Stripe keys" memory note), or (b) `recordUsage` is failing more often than expected too. Worth a sanity check after Unit 1 ships and we have observability on the recording path.

### Q4: `tier_limits WHERE tier='growth'` rows (✅ ran 2026-04-19 16:57)
- Result: **5 rows exist** with `feature` column populated:
  | feature (live) | monthly_limit | per_request_limit | should be (per `usage.ts:4-11`) |
  |----------------|---------------|-------------------|---------------------------------|
  | `match`        | 999           | NULL              | `matching_runs`                 |
  | `readiness`    | 999           | NULL              | `readiness_scores`              |
  | `strategy`     | 20            | NULL              | (no current mapping — strategy engine?) |
  | `writing`      | 5             | NULL              | `ai_drafts`                     |
  | `chat`         | 9999          | NULL              | `grantie_messages`              |
- **Key finding:** Migration 00031 DID run successfully (rows exist), but the **`feature` column values don't match the strings `usage.ts` queries for**. `checkUsageLimit` calls `.eq('feature', 'ai_drafts')` — no match → falls back to `allowed:true, limit:null` → **effective unlimited usage on every feature for growth tier**. Same outcome as "rows missing", different cause.
- **P1 incident still warranted.** File: "Growth-tier monthly limits not enforced — feature column values don't match ACTION_TO_FEATURE keys; users have been getting unlimited usage on writing/match/readiness/strategy/chat since growth tier launched."
- **`per_request_limit` is NULL across all 5 rows.** This column exists but isn't populated today — less leverage for Unit 6's per-call cap than initially hoped. Unit 6 may need to seed this column rather than rely on existing values.
- **Anomalies for business confirmation:**
  - `writing` limit is 5/month for growth — but real behavior is unlimited. Was 5 the intended cap? If yes, that's a meaningful revenue/upsell mechanism that hasn't been working.
  - `strategy` feature has limit 20 but isn't in `ACTION_TO_FEATURE` at all. Need to check what calls it (likely `src/lib/ai/engines/strategy.ts`).
- **Follow-up query needed (not in original Q1-Q4 set):** `SELECT tier, feature, monthly_limit FROM tier_limits ORDER BY tier, feature;` to check whether the same `feature`-string mismatch exists across free/starter/pro tiers, or if it's only growth.

### Q5: Full `tier_limits` audit (✅ ran 2026-04-19 17:00, partial visibility — 16 of 33 rows shown)
- Visible rows confirm:
  - **enterprise** tier uses canonical feature names: `ai_drafts` (5), `ai_logic_models` (3), `grantie_messages` (NULL), `matching_runs` (NULL), `pipeline_items` (NULL), `readiness_scores` (NULL), `team_members` (NULL). NULL = unlimited per `usage.ts:54-55`.
  - **free** tier uses canonical names: `ai_drafts` (0), `ai_logic_models` (0), `grantie_messages` (10), `matching_runs` (1), `pipeline_items` (3), `readiness_scores` (1).
  - **growth** (per Q4) uses BROKEN names: `match`/`readiness`/`writing`/`chat`/`strategy`.
  - starter and pro tiers not visible in screenshot — likely also canonical based on the pattern, but Phase 1 should confirm before Phase 3 migration is finalized.

### Q5b: starter + pro tier verification (✅ ran 2026-04-19 17:03)
- Result: both starter AND pro use **canonical** feature names matching `ACTION_TO_FEATURE`. Confirmed BD-2 scope is growth-only.
- **starter** features visible: `ai_drafts: 0` (or 5), `ai_logic_models: 0`, `grantie_messages: 100`, `matching_runs: 5`, `pipeline_items: 10`, `readiness_scores: 5`, `team_members: 2`
- **pro** features visible: `ai_logic_models: 1`, `grantie_messages: NULL`, `matching_runs: NULL`, `pipeline_items: NULL`, `readiness_scores: NULL`, `team_members: 5`. **No `ai_drafts` row visible for pro tier** — alphabetically it should come before `ai_logic_models` if present.
- **NEW finding (separate from BD-2):** Pro tier appears to be **missing an `ai_drafts` row entirely**. Same effective behavior as growth's broken-feature-names bug — `checkUsageLimit` for `actionType='draft'` on a pro user finds nothing → returns `allowed:true, limit:null` → unlimited drafts for pro users.
- **Updated open product questions:**
  - Pro tier: should pro have an `ai_drafts` row? If yes, what limit? Suggest seeding in same migration as BD-2.
  - Enterprise: confirmed has `ai_drafts: 5` and `ai_logic_models: 3` — not unlimited like its other rows. Intentional?
  - Strategy growth row: dead code (strategy engine emits `actionType: 'roadmap'`). Safe to DELETE in BD-2 migration.

### CORRECTION — pro tier ai_drafts (✅ verified via fuller screenshot 2026-04-19 17:07)
- **Pro DOES have an ai_drafts row** with `monthly_limit=2`. Earlier "missing pro ai_drafts" finding was a misread of a cropped screenshot.
- Implication: no INSERT needed in migration 00050. Pro's existing limit (2 drafts/month) stands until business decides to change it.
- The original concern (unlimited drafts for pro) was wrong — pro is correctly capped at 2.

### CRITICAL FINDING (separate from Unit 1 scope) — tier_limits has NO unique constraint
- Schema (00007:36-42): only `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`. No UNIQUE on (tier, feature).
- This is why migration 00031's `ON CONFLICT DO NOTHING` was a no-op without a target — Postgres caught only the (impossible) PK conflict, never the (tier, feature) duplicate it intended to prevent.
- Combined with the action_type column-name bug, that's TWO independent reasons 00031 misbehaved.
- Risk going forward: any future seed migration that doesn't carefully guard against duplicates can silently create them. checkUsageLimit's `.single()` query throws when it hits two rows for the same (org, tier, feature) lookup.
- Fix (DEFERRED — not Unit 1 scope): write a separate migration that (a) detects + dedupes any existing duplicate (tier, feature) rows, (b) adds `ALTER TABLE tier_limits ADD CONSTRAINT tier_limits_tier_feature_unique UNIQUE (tier, feature);`. Track as a hardening task.
- **Conclusion: the BD-2 fix is GROWTH-ONLY.** 4 simple UPDATE statements + 1 open product question (`strategy` row — delete or map?). Far smaller than the column-rename or full-tier-rewrite I initially feared.
- Migration 00050 shape:
  ```sql
  UPDATE tier_limits SET feature = 'matching_runs'    WHERE tier='growth' AND feature='match';
  UPDATE tier_limits SET feature = 'readiness_scores' WHERE tier='growth' AND feature='readiness';
  UPDATE tier_limits SET feature = 'ai_drafts'        WHERE tier='growth' AND feature='writing';
  UPDATE tier_limits SET feature = 'grantie_messages' WHERE tier='growth' AND feature='chat';
  -- 'strategy' (limit 20): TBD — either DELETE the row or add ACTION_TO_FEATURE['strategy'] = 'strategy' + INSERT new tier_limits rows for all tiers
  ```
- **Open product questions surfaced:**
  - `strategy` feature exists in growth tier with limit 20. What service produces it? Likely `src/lib/ai/engines/strategy.ts`. If we want to keep the cap, add `strategy` to `ACTION_TO_FEATURE` and seed `strategy` rows for ALL tiers. If not, delete the row.
  - Enterprise has `ai_drafts: 5` and `ai_logic_models: 3` — not unlimited. Confirm with business this is intentional (or whether enterprise should match the NULL=unlimited pattern of its other rows).
  - Free `ai_drafts: 0` — correct (gates AI behind paid). No action.
  - Worth asking: do starter and pro tiers have the same canonical-name pattern? If yes, BD-2 is targeted at growth only. If no, scope grows.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Bundle BD-1 + BD-2 + Sentry tripwire into a single migration + code PR | Per plan's Risks table — atomic merge prevents schema/code mismatch landing in production. Five migrations across Units 1, 4, 5, 6 all bundle in one PR for the same reason. |
| `AI_ACTION_TYPES` exported `as const` + TypeScript-derived type | Catches future actionType drift at compile time at the call site (30+ aiCall callers across the codebase). Eliminates the class of bug BD-1 represents. |
| Sentry tag `'ai_recording_failed'` matches logger tag | Single tag string searchable across both observability surfaces (Sentry dashboard + log aggregator). Future alert rule keys on this tag. |
| New `eligibility_scores` feature in `ACTION_TO_FEATURE` and tier_limits | Cleaner than mapping onto existing `matching_runs` (which has the multi-to-one collision already deferred). One row per tier seeded with placeholder values until business confirms. |
| `Promise.allSettled` shape preserved | Recording remains best-effort (don't fail user-facing aiCall on telemetry hiccup). Sentry + structured log are the new visibility layer; the swallow itself isn't the bug — invisibility was. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
- Origin plan: `docs/plans/2026-04-19-001-feat-grantiq-aicall-anthropic-extension-plan.md`
- Origin requirements: `docs/brainstorms/2026-04-19-grantiq-llm-gateway-extension-requirements.md`
- Schema: `supabase/migrations/00005_ai_tables.sql` (ai_generations + ai_usage definitions)
- BD-2 conflict source 1: `supabase/migrations/00007_billing_tables.sql:39`
- BD-2 conflict source 2 + CHECK-widening idiom reference: `supabase/migrations/00031_add_growth_tier.sql`
- Code being fixed: `src/lib/ai/call.ts:127-141`
- Usage gate: `src/lib/ai/usage.ts:4-11` (ACTION_TO_FEATURE), `:34-88` (checkUsageLimit), `:90-117` (recordUsage)
- Sentry config: `sentry.server.config.ts` (and client/edge variants)
- Test patterns reference: `tests/lib/ai/engines/grantie.test.ts:5-33` (vi.mock pattern), `tests/worker/handlers/generate-roadmap.test.ts` (Supabase mock pattern)
- Migration naming: next number is `00049_...` (current max in `supabase/migrations/` is 00048)

## Visual/Browser Findings
*(N/A — task is backend code + DB migrations; no UI surface in Unit 1)*

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
