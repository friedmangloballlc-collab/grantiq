/**
 * Per-org Anthropic prompt-cache circuit breaker (Unit 8 / R8 of plan).
 *
 * Defends against the silent-failure mode where Anthropic accepts
 * cache_control headers but never actually caches (malformed block,
 * unexpected response shape, region-specific outage). When the cache
 * silently no-ops, we keep paying the cache-write multiplier (1.25-2.0x
 * input rate) on every call without ever benefiting from cache reads —
 * a pure cost regression that's invisible without per-org observation.
 *
 * Mechanism: query the last N ai_generations rows for (org_id, prompt_id).
 * If ALL of them have cache_read_tokens in (0, NULL), the breaker is
 * tripped — Anthropic isn't actually caching for this org's prompt, and
 * future calls should degrade to the non-cached path (omit cache_control)
 * to stop the bleeding.
 *
 * Cold-start behavior: fewer than the threshold of prior rows → NOT tripped.
 * Rationale: tripping on cold start would no-op the entire rollout for
 * new (org, prompt) combinations. The pre-deploy SG-1 smoke test (Unit 9)
 * is the primary first-hour safety net; the breaker catches regressions
 * AFTER traffic has flowed.
 *
 * Caching: in-memory Map with 5-minute TTL per (orgId, promptId). On
 * Vercel serverless this is invocation-scoped, not process-scoped — so
 * the cache holds within a single cron tick (where draft-generator's
 * 6-8 sequential calls live) but reverts to a fresh DB query on the
 * next invocation. Acceptable load: one SELECT per active (org, prompt)
 * per cron tick.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/** Number of consecutive zero-cache-read rows required to trip the breaker. */
const TRIP_THRESHOLD = 5;
/** In-memory cache TTL — invocation-scoped on Vercel, fine for our use. */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  tripped: boolean;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(orgId: string, promptId: string): string {
  return `${orgId}::${promptId}`;
}

/**
 * Returns true if the per-org per-prompt cache is structurally broken and
 * the caller should degrade to the non-cached path.
 *
 * Returns false (NOT tripped) when:
 *   - Fewer than TRIP_THRESHOLD prior rows exist (cold start)
 *   - At least one prior row has cache_read_tokens > 0 (cache works)
 *   - The query itself fails (fail-open — don't block on telemetry)
 */
export async function isCacheBreakerTripped(
  orgId: string,
  promptId: string
): Promise<boolean> {
  const key = cacheKey(orgId, promptId);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tripped;
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("ai_generations")
    .select("cache_read_tokens")
    .eq("org_id", orgId)
    .eq("prompt_id", promptId)
    .order("created_at", { ascending: false })
    .limit(TRIP_THRESHOLD);

  if (error) {
    logger.error("Circuit breaker query failed", { err: String(error), orgId, promptId });
    return false; // fail-open
  }

  const rows = data ?? [];

  // Cold start: not enough data to judge — don't trip
  if (rows.length < TRIP_THRESHOLD) {
    cache.set(key, { tripped: false, expiresAt: Date.now() + CACHE_TTL_MS });
    return false;
  }

  // All recent rows show no cache reads → cache is broken for this (org, prompt)
  const tripped = rows.every(
    (row) => row.cache_read_tokens === null || row.cache_read_tokens === 0
  );

  if (tripped) {
    logger.warn("Anthropic cache circuit breaker tripped", {
      orgId,
      promptId,
      threshold: TRIP_THRESHOLD,
      message:
        "Last 5 calls had cache_read_tokens in (0, null). Degrading to non-cached path.",
    });
  }

  cache.set(key, { tripped, expiresAt: Date.now() + CACHE_TTL_MS });
  return tripped;
}

/**
 * Test/admin helper: clear the in-memory breaker cache. Useful in tests
 * and for ops who want to force a fresh DB check after manually fixing
 * the underlying cause.
 */
export function clearCircuitBreakerCache(): void {
  cache.clear();
}
