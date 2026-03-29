import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkUsageLimit, recordUsage, UsageLimitError } from "@/lib/ai/usage";

// --------------------------------------------------------------------------
// Mock createAdminClient so we never hit a real database
// --------------------------------------------------------------------------
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// Helper: build a chainable Supabase query mock
function buildQuery(resolveWith: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveWith),
    insert: vi.fn().mockResolvedValue(resolveWith),
  };
  // Make the chain itself thenable so awaiting it works for non-.single() paths
  return { ...chain, then: undefined };
}

// --------------------------------------------------------------------------
// UsageLimitError
// --------------------------------------------------------------------------
describe("UsageLimitError", () => {
  it("has correct name and message", () => {
    const err = new UsageLimitError(5, 10, "matching_runs", "starter");
    expect(err.name).toBe("UsageLimitError");
    expect(err.message).toContain("5/10");
    expect(err.message).toContain("matching_runs");
    expect(err.message).toContain("starter");
    expect(err.used).toBe(5);
    expect(err.limit).toBe(10);
    expect(err.feature).toBe("matching_runs");
    expect(err.tier).toBe("starter");
  });

  it("is an instance of Error", () => {
    const err = new UsageLimitError(1, 1, "ai_drafts", "free");
    expect(err).toBeInstanceOf(Error);
  });
});

// --------------------------------------------------------------------------
// checkUsageLimit
// --------------------------------------------------------------------------
describe("checkUsageLimit", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns allowed=true with nulls when tier_limits row is missing", async () => {
    // First from() call: tier_limits — returns error (no row)
    const tierLimitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "not found" } }),
    };
    mockFrom.mockReturnValueOnce(tierLimitsChain);

    const result = await checkUsageLimit("org-1", "match", "free");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
    expect(result.remaining).toBeNull();
  });

  it("returns allowed=true when monthly_limit is null (unlimited)", async () => {
    const tierLimitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { monthly_limit: null }, error: null }),
    };
    mockFrom.mockReturnValueOnce(tierLimitsChain);

    const result = await checkUsageLimit("org-1", "match", "agency");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });

  it("returns allowed=false when usage equals the limit", async () => {
    // tier_limits row
    const tierLimitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { monthly_limit: 3 }, error: null }),
    };
    // ai_usage rows — 3 rows = at limit
    const usageChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi
        .fn()
        .mockResolvedValue({
          data: [{ id: 1 }, { id: 2 }, { id: 3 }],
          error: null,
        }),
    };
    mockFrom.mockReturnValueOnce(tierLimitsChain).mockReturnValueOnce(usageChain);

    const result = await checkUsageLimit("org-1", "match", "starter");
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(3);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(0);
  });

  it("returns allowed=true when usage is under the limit", async () => {
    const tierLimitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { monthly_limit: 10 }, error: null }),
    };
    const usageChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi
        .fn()
        .mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], error: null }),
    };
    mockFrom.mockReturnValueOnce(tierLimitsChain).mockReturnValueOnce(usageChain);

    const result = await checkUsageLimit("org-1", "match", "growth");
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(2);
    expect(result.remaining).toBe(8);
  });

  it("returns allowed=true and logs error when ai_usage query fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const tierLimitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { monthly_limit: 5 }, error: null }),
    };
    const usageChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "db error" } }),
    };
    mockFrom.mockReturnValueOnce(tierLimitsChain).mockReturnValueOnce(usageChain);

    const result = await checkUsageLimit("org-1", "match", "starter");
    expect(result.allowed).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Usage check query failed:",
      expect.anything()
    );

    consoleSpy.mockRestore();
  });

  it("maps 'draft' action to 'ai_drafts' feature", async () => {
    const tierLimitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { monthly_limit: 5 }, error: null }),
    };
    const usageChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValueOnce(tierLimitsChain).mockReturnValueOnce(usageChain);

    await checkUsageLimit("org-1", "draft", "growth");

    // The second .eq() call on tierLimitsChain should use 'ai_drafts' as the feature
    expect(tierLimitsChain.eq).toHaveBeenCalledWith("feature", "ai_drafts");
  });
});

// --------------------------------------------------------------------------
// recordUsage
// --------------------------------------------------------------------------
describe("recordUsage", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("inserts a row into ai_usage with correct fields", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    await recordUsage({
      orgId: "org-abc",
      actionType: "match",
      tokensInput: 500,
      tokensOutput: 300,
      estimatedCostCents: 2,
    });

    expect(mockFrom).toHaveBeenCalledWith("ai_usage");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-abc",
        action_type: "match",
        tokens_input: 500,
        tokens_output: 300,
        estimated_cost_cents: 2,
      })
    );
  });

  it("includes a billing_period in YYYY-MM-DD format", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    await recordUsage({
      orgId: "org-abc",
      actionType: "draft",
      tokensInput: 100,
      tokensOutput: 200,
      estimatedCostCents: 1,
    });

    const [[insertArg]] = insertMock.mock.calls;
    expect(insertArg.billing_period).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("logs error but does not throw when insert fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const insertMock = vi
      .fn()
      .mockResolvedValue({ error: { message: "insert failed" } });
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    await expect(
      recordUsage({
        orgId: "org-abc",
        actionType: "chat",
        tokensInput: 50,
        tokensOutput: 50,
        estimatedCostCents: 0,
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to record AI usage:",
      expect.anything()
    );

    consoleSpy.mockRestore();
  });
});
