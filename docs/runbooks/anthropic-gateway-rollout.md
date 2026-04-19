# Anthropic Gateway Rollout Runbook

Operational playbook for monitoring, verifying, and rolling back the Unit 1-8 LLMGateway extension that landed 2026-04-19.

## What's running

After the 8 commits shipped in this rollout, every `aiCall({ provider: 'anthropic', ... })` flows through:

1. Pre-flight injection detection on `userInput` + `cacheableContext`
2. Pre-flight row-based usage gate (`checkUsageLimit`)
3. Pre-flight token-based ceiling (`checkTokenCeiling`, when `monthly_token_ceiling` is set)
4. Per-org circuit breaker (`isCacheBreakerTripped`) — degrades to non-cached path on silent cache failure
5. Anthropic SDK call with `cache_control` blocks (1h system, 5m cacheableContext)
6. Response normalization (concat text blocks, throw on `tool_use`)
7. Retry on `5xx`/`529` only (2 attempts, exponential backoff)
8. Best-effort recording to `ai_generations` + `ai_usage` (Sentry tripwire on failure)

The first migrated production call site is `src/lib/ai/writing/draft-generator.ts` (Unit 7).

## Production gate queries (PG-1 through PG-7)

Run each in Supabase Studio after the first ~100 production drafts to verify the rollout. Each returns a single pass/fail indication plus supporting metrics.

### PG-1: Intra-session cache hit rate

```sql
SELECT AVG(cache_read_tokens::float / NULLIF(tokens_input, 0)) AS hit_rate
FROM ai_generations
WHERE prompt_id LIKE 'writing.draft.%'
  AND grant_application_id IN (
    SELECT grant_application_id
    FROM ai_generations
    WHERE prompt_id LIKE 'writing.draft.%'
    GROUP BY grant_application_id
    HAVING COUNT(*) >= 2
  );
```

**Pass:** `hit_rate >= 0.50`. **Target:** `0.70+`. ProjectDiscovery's reference is `0.73`.

### PG-2: Cost per draft (post vs pre)

```sql
SELECT
  DATE(created_at) AS day,
  COUNT(DISTINCT grant_application_id) AS drafts,
  SUM(estimated_cost_cents) / NULLIF(COUNT(DISTINCT grant_application_id), 0) AS cents_per_draft
FROM ai_generations
WHERE prompt_id LIKE 'writing.%'
GROUP BY 1
ORDER BY 1 DESC
LIMIT 14;
```

**Pass:** `cents_per_draft` post-deploy is `<= 60%` of the pre-deploy baseline (target: `40-50%`).

### PG-3: Draft quality regression check

Manual: pick 5 pre-deploy drafts and 5 post-deploy drafts (same section types, same orgs). Have a non-engineer reviewer score them blind on:

- Word count compliance with the section's `word_limit`
- Coverage of the scoring criteria
- Tone/voice match to the org profile

**Pass:** reviewer cannot consistently identify pre vs post.

### PG-4: Latency per call

```sql
-- ai_generations doesn't store latency directly, so this is approximate via
-- created_at deltas between consecutive sections of the same draft.
SELECT
  prompt_id,
  COUNT(*) AS n,
  AVG(EXTRACT(EPOCH FROM (
    created_at - LAG(created_at) OVER (PARTITION BY grant_application_id ORDER BY created_at)
  ))) AS avg_inter_section_seconds
FROM ai_generations
WHERE prompt_id LIKE 'writing.draft.%'
GROUP BY 1;
```

**Pass:** average inter-section delta within `+1s` of the pre-deploy baseline. Cache writes typically add 200-800ms; cache reads should be net faster.

### PG-5: Zero recording errors

Search Sentry for `tag: 'ai_recording_failed'` over the last 48h post-deploy.

**Pass:** zero events. Any non-zero indicates the BD-1 fix has a regression OR a `userId` is missing from a call site.

### PG-6: OpenAI path unchanged

```sql
SELECT generation_type, COUNT(*) AS n, AVG(estimated_cost_cents) AS avg_cents
FROM ai_generations
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND prompt_id IS NULL  -- OpenAI calls don't set promptId
GROUP BY 1
ORDER BY n DESC;
```

**Pass:** `avg_cents` for each OpenAI action type matches pre-deploy baseline within 10%.

### PG-7: promptId populated on Anthropic calls

```sql
SELECT
  COUNT(*) FILTER (WHERE prompt_id IS NULL) AS missing_prompt_id,
  COUNT(*) FILTER (WHERE prompt_id IS NOT NULL) AS with_prompt_id,
  COUNT(*) FILTER (WHERE cache_creation_tokens IS NOT NULL OR cache_read_tokens IS NOT NULL) AS anthropic_calls
FROM ai_generations
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**Pass:** every Anthropic call (`cache_creation_tokens IS NOT NULL OR cache_read_tokens IS NOT NULL`) also has `prompt_id IS NOT NULL`. `missing_prompt_id` reflects only OpenAI calls (which is expected).

## Circuit breaker status check

```sql
-- For each (org, prompt_id), compute cache hit rate over the last 5 calls
WITH recent AS (
  SELECT
    org_id,
    prompt_id,
    cache_read_tokens,
    ROW_NUMBER() OVER (PARTITION BY org_id, prompt_id ORDER BY created_at DESC) AS rn
  FROM ai_generations
  WHERE prompt_id IS NOT NULL
)
SELECT
  org_id,
  prompt_id,
  COUNT(*) AS recent_calls,
  COUNT(*) FILTER (WHERE cache_read_tokens > 0) AS recent_cache_hits,
  CASE
    WHEN COUNT(*) >= 5 AND COUNT(*) FILTER (WHERE cache_read_tokens > 0) = 0 THEN 'TRIPPED'
    WHEN COUNT(*) < 5 THEN 'WARMING'
    ELSE 'OK'
  END AS breaker_status
FROM recent
WHERE rn <= 5
GROUP BY org_id, prompt_id
HAVING COUNT(*) >= 3
ORDER BY breaker_status DESC, recent_calls DESC;
```

Any row with `breaker_status = 'TRIPPED'` indicates an org/prompt where the in-app circuit breaker is degrading to non-cached path. Investigate the underlying cause (often a malformed `cacheableContext` or a Supabase-side issue with the canonical-stringify output).

## Rollback

If PG-1 through PG-7 fail badly, two rollback options:

### Option 1 — Code rollback (fastest)

```bash
git -C /Users/poweredbyexcellence/grantiq revert 72944b5  # Unit 7 (draft-generator migration)
git -C /Users/poweredbyexcellence/grantiq push origin master
```

This reverts draft-generator to direct `new Anthropic()` calls but leaves Units 1-6 + 8 in place (schema fixes, type safety, recording, breaker module). The other 8 `writing/*` files are unaffected because they never migrated.

### Option 2 — DB-level emergency

If draft generation is failing entirely (not just expensive), the most likely cause is a bad `cacheableContext` value. Check the most recent failed `ai_generations` insert via Sentry; the breaker should auto-degrade after 5 consecutive zero-cache-read calls per org/prompt without any code change.

## When to revisit

- After **7 calendar days** of post-deploy traffic, re-run all PG queries and compute the actual cost-per-draft delta.
- After **first $1k of post-deploy Anthropic spend**, validate the projected savings ratio.
- After **first 30 days**, decide whether to migrate the other 8 `writing/*` files (Unit 7's pattern is the template).

## Side-finding tickets to file separately

These were surfaced during the rollout but are out of Unit 1-9 scope:

1. **P1 — Growth-tier customers had unlimited usage from launch through 2026-04-19 17:30.** BD-2 fix stopped the bleed; customer-comms / billing reconciliation TBD.
2. **`tier_limits` lacks UNIQUE (tier, feature) constraint.** Structurally allows duplicate rows; the migration patterns we used (idempotent UPDATE) work around this but a separate hardening migration should add the constraint.
3. **Pre-existing failure in `tests/lib/ai/writing/pricing.test.ts`** — unrelated to this rollout. Last touched commit `f5ab33f` (premium pricing rollout).
4. **8 other `writing/*` files still bypass `aiCall`** — `ai-auditor`, `funder-analyzer`, `review-simulator`, `rfp-parser`, `compliance-sentinel`, `coherence-checker`, `loi-generator`, `narrative-memory`, `budget-narrative`. They have neither injection detection nor usage gating today. Migrating them follows the Unit 7 template.
