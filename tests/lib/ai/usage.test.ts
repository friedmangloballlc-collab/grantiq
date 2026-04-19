import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkUsageLimit,
  recordUsage,
  UsageLimitError,
  AI_ACTION_TYPES,
  type AiActionType,
} from "@/lib/ai/usage";

// --------------------------------------------------------------------------
// Mock createAdminClient so we never hit a real database
// --------------------------------------------------------------------------
const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom, rpc: mockRpc }),
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
      expect.stringContaining("Usage check query failed")
    );

    consoleSpy.mockRestore();
  });

  it("maps 'eligibility_status' action to 'eligibility_scores' feature", async () => {
    const tierLimitsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { monthly_limit: null }, error: null }),
    };
    mockFrom.mockReturnValueOnce(tierLimitsChain);

    await checkUsageLimit("org-1", "eligibility_status", "free");

    expect(tierLimitsChain.eq).toHaveBeenCalledWith("feature", "eligibility_scores");
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
    mockRpc.mockReset();
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
      expect.stringContaining("Failed to record AI usage")
    );

    consoleSpy.mockRestore();
  });
});

// --------------------------------------------------------------------------
// recordUsage — session_id RPC path (Unit 5 / R13)
// --------------------------------------------------------------------------
describe("recordUsage with sessionId (Unit 5)", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("calls record_ai_usage_session RPC when sessionId is supplied", async () => {
    mockRpc.mockResolvedValueOnce({ error: null });

    await recordUsage({
      orgId: "org-abc",
      actionType: "draft",
      tokensInput: 500,
      tokensOutput: 200,
      estimatedCostCents: 7,
      sessionId: "grant-app-123",
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith(
      "record_ai_usage_session",
      expect.objectContaining({
        p_org_id: "org-abc",
        p_action_type: "draft",
        p_session_id: "grant-app-123",
        p_tokens_input: 500,
        p_tokens_output: 200,
        p_cost_cents: 7,
      })
    );
    // Plain INSERT path should NOT have been called
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("falls back to plain INSERT when sessionId is omitted", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    await recordUsage({
      orgId: "org-abc",
      actionType: "match",
      tokensInput: 100,
      tokensOutput: 50,
      estimatedCostCents: 1,
    });

    // RPC should NOT have been called when sessionId is absent
    expect(mockRpc).not.toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalled();
  });

  it("includes p_billing_period in YYYY-MM-DD format on RPC path", async () => {
    mockRpc.mockResolvedValueOnce({ error: null });

    await recordUsage({
      orgId: "org-abc",
      actionType: "draft",
      tokensInput: 1,
      tokensOutput: 1,
      estimatedCostCents: 0,
      sessionId: "grant-app-123",
    });

    const [, args] = mockRpc.mock.calls[0];
    expect(args.p_billing_period).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("logs error but does not throw when RPC fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRpc.mockResolvedValueOnce({ error: { message: "rpc failed" } });

    await expect(
      recordUsage({
        orgId: "org-abc",
        actionType: "draft",
        tokensInput: 1,
        tokensOutput: 1,
        estimatedCostCents: 0,
        sessionId: "grant-app-123",
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to record AI usage (session)")
    );

    consoleSpy.mockRestore();
  });
});

// --------------------------------------------------------------------------
// AI_ACTION_TYPES enum + ACTION_TO_FEATURE invariants (added in Unit 1)
// --------------------------------------------------------------------------
describe("AI_ACTION_TYPES enum", () => {
  it("contains the 10 canonical action types", () => {
    expect(AI_ACTION_TYPES).toEqual([
      "match",
      "readiness_score",
      "roadmap",
      "eligibility_status",
      "draft",
      "audit",
      "rewrite",
      "loi",
      "budget",
      "chat",
    ]);
  });

  it("every AI_ACTION_TYPES value resolves to a feature in checkUsageLimit", async () => {
    // Smoke-test the type-system guarantee that ACTION_TO_FEATURE covers every enum value.
    // If a future enum addition skips its mapping, this test fails (TS catches it at compile;
    // runtime here is the safety net for refactors that bypass typing).
    for (const action of AI_ACTION_TYPES) {
      const tierLimitsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { monthly_limit: null }, error: null }),
      };
      mockFrom.mockReset();
      mockFrom.mockReturnValueOnce(tierLimitsChain);

      const result = await checkUsageLimit("org-1", action as AiActionType, "free");
      expect(result.allowed).toBe(true);
      // The feature lookup must have been called with a non-undefined value
      const featureCalls = tierLimitsChain.eq.mock.calls.filter(
        ([col]) => col === "feature"
      );
      expect(featureCalls).toHaveLength(1);
      expect(featureCalls[0][1]).toBeTruthy();
      expect(typeof featureCalls[0][1]).toBe("string");
    }
  });
});
