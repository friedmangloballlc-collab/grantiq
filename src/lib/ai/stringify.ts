/**
 * Canonical stable JSON stringify for cache-key stability.
 *
 * Wraps `safe-stable-stringify` (pinned via package.json) so the entire
 * codebase shares one serializer. The function returns byte-identical output
 * for any two semantically-equivalent values, regardless of object-key
 * insertion order — the load-bearing property for Anthropic prompt caching
 * (see Unit 4 cacheableContext) where a non-stable stringify silently drops
 * cache hit rate to 0%.
 *
 * Use this anywhere a value flows into a cache key, a content hash, or any
 * comparison that should be insensitive to key ordering. Do NOT use it for
 * user-facing output where key order conveys intent.
 *
 * History: introduced in Unit 2 of the LLMGateway extension plan
 * (docs/plans/2026-04-19-001-feat-grantiq-aicall-anthropic-extension-plan.md
 * R19a). Replaces ad-hoc `JSON.stringify` calls in the writing pipeline that
 * were producing inconsistent cache keys for the same logical org profile
 * depending on which Supabase query path produced the upstream object.
 */

import stableStringify from "safe-stable-stringify";

/**
 * Serialize a value to a deterministic JSON string. Object keys are sorted
 * lexically; arrays preserve their index order; cycles throw.
 *
 * Returns `undefined` only if the underlying serializer would itself return
 * `undefined` (e.g. for a top-level `undefined` or a function). Callers that
 * need a guaranteed string should pre-validate input or assert non-undefined.
 */
export function canonicalStringify(value: unknown): string | undefined {
  return stableStringify(value);
}
