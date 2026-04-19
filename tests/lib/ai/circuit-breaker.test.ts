/**
 * Tests for the per-org Anthropic prompt-cache circuit breaker (Unit 8).
 *
 * The breaker exists to defend against the silent-failure mode: Anthropic
 * accepts cache_control headers but never actually caches (malformed block,
 * outage, region issue). Without the breaker, we'd keep paying the
 * cache-write multiplier on every call without ever benefiting from reads.
 *
 * Tested invariants:
 *   - Cold start (< threshold prior rows) → NOT tripped (allow new flows)
 *   - All recent rows have cache_read_tokens=0/null → tripped (degrade)
 *   - At least one recent row has cache_read_tokens > 0 → NOT tripped
 *   - Query failure → NOT tripped (fail-open, never block on telemetry)
 *   - In-memory cache hits within TTL window
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// eslint-disable-next-line import/first
import {
  isCacheBreakerTripped,
  clearCircuitBreakerCache,
} from "@/lib/ai/circuit-breaker";

function buildAiGenerationsChain(rows: Array<{ cache_read_tokens: number | null }>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
}

beforeEach(() => {
  mockFrom.mockReset();
  clearCircuitBreakerCache();
});

describe("isCacheBreakerTripped", () => {
  it("returns false when fewer than 5 prior rows exist (cold start)", async () => {
    mockFrom.mockReturnValueOnce(
      buildAiGenerationsChain([
        { cache_read_tokens: 0 },
        { cache_read_tokens: 0 },
      ])
    );

    const tripped = await isCacheBreakerTripped("org-1", "writing.draft.v1");
    expect(tripped).toBe(false);
  });

  it("returns true when all 5 most recent rows have cache_read_tokens=0", async () => {
    mockFrom.mockReturnValueOnce(
      buildAiGenerationsChain([
        { cache_read_tokens: 0 },
        { cache_read_tokens: 0 },
        { cache_read_tokens: 0 },
        { cache_read_tokens: 0 },
        { cache_read_tokens: 0 },
      ])
    );

    const tripped = await isCacheBreakerTripped("org-1", "writing.draft.v1");
    expect(tripped).toBe(true);
  });

  it("returns true when all 5 most recent rows have cache_read_tokens=null", async () => {
    mockFrom.mockReturnValueOnce(
      buildAiGenerationsChain([
        { cache_read_tokens: null },
        { cache_read_tokens: null },
        { cache_read_tokens: null },
        { cache_read_tokens: null },
        { cache_read_tokens: null },
      ])
    );

    const tripped = await isCacheBreakerTripped("org-1", "writing.draft.v1");
    expect(tripped).toBe(true);
  });

  it("returns true on mixed null + zero (both indicate no cache reads)", async () => {
    mockFrom.mockReturnValueOnce(
      buildAiGenerationsChain([
        { cache_read_tokens: null },
        { cache_read_tokens: 0 },
        { cache_read_tokens: null },
        { cache_read_tokens: 0 },
        { cache_read_tokens: 0 },
      ])
    );

    const tripped = await isCacheBreakerTripped("org-1", "writing.draft.v1");
    expect(tripped).toBe(true);
  });

  it("returns false when at least one recent row shows cache reads (cache works)", async () => {
    mockFrom.mockReturnValueOnce(
      buildAiGenerationsChain([
        { cache_read_tokens: 0 },
        { cache_read_tokens: 1500 }, // a hit somewhere in the window
        { cache_read_tokens: 0 },
        { cache_read_tokens: 0 },
        { cache_read_tokens: 0 },
      ])
    );

    const tripped = await isCacheBreakerTripped("org-1", "writing.draft.v1");
    expect(tripped).toBe(false);
  });

  it("fails open (returns false) when the DB query errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } }),
    });

    const tripped = await isCacheBreakerTripped("org-1", "writing.draft.v1");
    expect(tripped).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Circuit breaker query failed")
    );
    consoleSpy.mockRestore();
  });

  it("caches the result in memory (no second DB call within TTL)", async () => {
    mockFrom.mockReturnValueOnce(
      buildAiGenerationsChain([
        { cache_read_tokens: 1000 },
        { cache_read_tokens: 1000 },
        { cache_read_tokens: 1000 },
        { cache_read_tokens: 1000 },
        { cache_read_tokens: 1000 },
      ])
    );

    await isCacheBreakerTripped("org-1", "writing.draft.v1");
    await isCacheBreakerTripped("org-1", "writing.draft.v1");
    await isCacheBreakerTripped("org-1", "writing.draft.v1");

    // Only the first call should hit the DB
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("uses separate cache entries per (orgId, promptId) pair", async () => {
    mockFrom
      .mockReturnValueOnce(
        buildAiGenerationsChain([
          { cache_read_tokens: 1000 },
          { cache_read_tokens: 1000 },
          { cache_read_tokens: 1000 },
          { cache_read_tokens: 1000 },
          { cache_read_tokens: 1000 },
        ])
      )
      .mockReturnValueOnce(
        buildAiGenerationsChain([
          { cache_read_tokens: 0 },
          { cache_read_tokens: 0 },
          { cache_read_tokens: 0 },
          { cache_read_tokens: 0 },
          { cache_read_tokens: 0 },
        ])
      );

    const a = await isCacheBreakerTripped("org-1", "writing.draft.v1");
    const b = await isCacheBreakerTripped("org-2", "writing.draft.v1");

    expect(a).toBe(false); // org-1 has hits → not tripped
    expect(b).toBe(true); // org-2 all-zero → tripped
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});

describe("clearCircuitBreakerCache", () => {
  it("forces a fresh DB query after being called", async () => {
    mockFrom.mockReturnValue(
      buildAiGenerationsChain([
        { cache_read_tokens: 1000 },
        { cache_read_tokens: 1000 },
        { cache_read_tokens: 1000 },
        { cache_read_tokens: 1000 },
        { cache_read_tokens: 1000 },
      ])
    );

    await isCacheBreakerTripped("org-1", "writing.draft.v1");
    expect(mockFrom).toHaveBeenCalledTimes(1);

    clearCircuitBreakerCache();
    await isCacheBreakerTripped("org-1", "writing.draft.v1");
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
