import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/call", () => ({ aiCall: vi.fn() }));

import { aiCall } from "@/lib/ai/call";
import { extractRubric, inferRubric } from "@/lib/ai/agents/quality-scorer/rubric";

const mockAiCall = vi.mocked(aiCall);

function mockAiResp(content: string) {
  return {
    content,
    inputTokens: 1000,
    outputTokens: 200,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    costCents: 2,
    model: "claude-sonnet-4-20250514",
  };
}

describe("extractRubric", () => {
  it("returns null when scoring_criteria is empty", () => {
    expect(extractRubric({ scoring_criteria: [] })).toBeNull();
  });

  it("returns null when scoring_criteria is missing", () => {
    expect(extractRubric({})).toBeNull();
  });

  it("returns rubric with source='explicit_from_rfp' when criteria present", () => {
    const r = extractRubric({
      scoring_criteria: [
        { criterion: "alignment", max_points: 50, description: "..." },
        { criterion: "impact", max_points: 50, description: "..." },
      ],
    });
    expect(r).not.toBeNull();
    expect(r?.source).toBe("explicit_from_rfp");
    expect(r?.total_points).toBe(100);
    expect(r?.criteria).toHaveLength(2);
  });

  it("returns null when all criteria have 0 points", () => {
    expect(
      extractRubric({
        scoring_criteria: [{ criterion: "x", max_points: 0, description: "" }],
      })
    ).toBeNull();
  });
});

describe("inferRubric", () => {
  const ctx = {
    org_id: "o1",
    user_id: "u1",
    subscription_tier: "pro",
    draft_id: "d1",
  };

  beforeEach(() => mockAiCall.mockReset());

  it("returns inferred rubric when AI returns valid JSON", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          criteria: [
            { criterion: "impact", max_points: 60, description: "..." },
            { criterion: "capacity", max_points: 40, description: "..." },
          ],
        })
      )
    );
    const r = await inferRubric({}, null, ctx);
    expect(r.source).toBe("inferred");
    expect(r.total_points).toBe(100);
    expect(r.criteria).toHaveLength(2);
  });

  it("falls back to default 5-criterion rubric on AI failure", async () => {
    mockAiCall.mockRejectedValueOnce(new Error("timeout"));
    const r = await inferRubric({}, null, ctx);
    expect(r.source).toBe("inferred");
    expect(r.total_points).toBe(100);
    expect(r.criteria).toHaveLength(5);
    expect(r.criteria.map((c) => c.max_points).reduce((a, b) => a + b)).toBe(100);
  });

  it("falls back to default on malformed JSON", async () => {
    mockAiCall.mockResolvedValueOnce(mockAiResp("not json"));
    const r = await inferRubric({}, null, ctx);
    expect(r.criteria).toHaveLength(5);
  });

  it("falls back to default when AI returns empty criteria", async () => {
    mockAiCall.mockResolvedValueOnce(mockAiResp(JSON.stringify({ criteria: [] })));
    const r = await inferRubric({}, null, ctx);
    expect(r.criteria).toHaveLength(5);
  });
});
