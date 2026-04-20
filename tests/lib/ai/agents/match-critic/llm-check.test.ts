import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock aiCall BEFORE importing the module under test
vi.mock("@/lib/ai/call", () => ({
  aiCall: vi.fn(),
}));

import { aiCall } from "@/lib/ai/call";
import { runLlmCheck } from "@/lib/ai/agents/match-critic/llm-check";
import type {
  CriticOrgProfile,
  CriticGrantMatch,
} from "@/lib/ai/agents/match-critic/types";

const mockAiCall = vi.mocked(aiCall);

function org(partial: Partial<CriticOrgProfile> = {}): CriticOrgProfile {
  return {
    name: "Test Nonprofit",
    entity_type: "501c3",
    state: "CA",
    city: "San Francisco",
    annual_budget: 500_000,
    employee_count: 10,
    population_served: ["youth"],
    program_areas: ["education"],
    mission_statement: "Help kids learn.",
    ...partial,
  };
}

function grant(partial: Partial<CriticGrantMatch> = {}): CriticGrantMatch {
  return {
    id: "g1",
    name: "Education Grant",
    funder_name: "Acme Foundation",
    source_type: "foundation",
    category: "education",
    amount_min: 10_000,
    amount_max: 100_000,
    eligibility_types: ["501c3"],
    states: [],
    description: "Funds education programs for K-12 students.",
    ...partial,
  };
}

const ctx = { org_id: "o1", user_id: "u1", subscription_tier: "pro" };

function mockResponse(content: string) {
  return {
    content,
    input_tokens: 1000,
    output_tokens: 50,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };
}

describe("runLlmCheck", () => {
  beforeEach(() => {
    mockAiCall.mockReset();
  });

  it("returns KEEP when model says KEEP", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockResponse(
        JSON.stringify({
          verdict: "KEEP",
          kill_reason: null,
          confidence: 0.9,
          notes: "mission aligned with grant category",
        })
      )
    );
    const v = await runLlmCheck(org(), grant(), ctx);
    expect(v.verdict).toBe("KEEP");
    expect(v.killReason).toBeNull();
    expect(v.stage).toBe("llm");
    expect(v.confidence).toBe(0.9);
  });

  it("returns KILL when model says KILL at high confidence", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockResponse(
        JSON.stringify({
          verdict: "KILL",
          kill_reason: "mission_mismatch",
          confidence: 0.85,
          notes: "grant funds pure R&D; org does community services",
        })
      )
    );
    const v = await runLlmCheck(
      org({ program_areas: ["community_services"] }),
      grant({ category: "STEM research" }),
      ctx
    );
    expect(v.verdict).toBe("KILL");
    expect(v.killReason).toBe("mission_mismatch");
    expect(v.confidence).toBe(0.85);
  });

  it("reverts KILL to KEEP when confidence < 0.7 (bias toward recall)", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockResponse(
        JSON.stringify({
          verdict: "KILL",
          kill_reason: "mission_mismatch",
          confidence: 0.6,
          notes: "uncertain mismatch",
        })
      )
    );
    const v = await runLlmCheck(org(), grant(), ctx);
    expect(v.verdict).toBe("KEEP");
    expect(v.confidence).toBe(0.6);
    expect(v.notes).toContain("below threshold");
  });

  it("fails open when aiCall throws (network error)", async () => {
    mockAiCall.mockRejectedValueOnce(new Error("network down"));
    const v = await runLlmCheck(org(), grant(), ctx);
    expect(v.verdict).toBe("KEEP");
    expect(v.stage).toBe("fail_open");
    expect(v.confidence).toBe(0);
  });

  it("fails open when model returns non-JSON", async () => {
    mockAiCall.mockResolvedValueOnce(mockResponse("This is not JSON"));
    const v = await runLlmCheck(org(), grant(), ctx);
    expect(v.verdict).toBe("KEEP");
    expect(v.stage).toBe("fail_open");
  });

  it("fails open when JSON has invalid verdict value", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ verdict: "MAYBE", confidence: 0.5 }))
    );
    const v = await runLlmCheck(org(), grant(), ctx);
    expect(v.verdict).toBe("KEEP");
    expect(v.stage).toBe("fail_open");
  });

  it("clamps invalid confidence to 0.5 default", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockResponse(
        JSON.stringify({
          verdict: "KEEP",
          kill_reason: null,
          confidence: "high", // invalid type
          notes: "x",
        })
      )
    );
    const v = await runLlmCheck(org(), grant(), ctx);
    expect(v.verdict).toBe("KEEP");
    expect(v.confidence).toBe(0.5);
  });

  it("truncates very long notes to 200 chars", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockResponse(
        JSON.stringify({
          verdict: "KEEP",
          kill_reason: null,
          confidence: 0.9,
          notes: "a".repeat(500),
        })
      )
    );
    const v = await runLlmCheck(org(), grant(), ctx);
    expect(v.notes.length).toBeLessThanOrEqual(200);
  });

  it("passes correct actionType + promptId to aiCall", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockResponse(
        JSON.stringify({ verdict: "KEEP", confidence: 0.9, notes: "ok" })
      )
    );
    await runLlmCheck(org(), grant(), ctx);
    const call = mockAiCall.mock.calls[0][0];
    expect(call.actionType).toBe("match");
    expect(call.promptId).toBe("match.critic.v1");
    expect(call.provider).toBe("anthropic");
    expect(call.orgId).toBe("o1");
    expect(call.userId).toBe("u1");
    expect(call.tier).toBe("pro");
  });
});
