import { describe, it, expect } from "vitest";
import {
  MatchBatchLLMOutputSchema,
  MatchLLMOutputSchema,
  computeMatchScore,
  deriveWinProbability,
  deriveRecommendedAction,
  enrichLLMOutput,
} from "@/lib/ai/schemas/match";

const validScores = {
  mission_alignment: 9,
  capacity_fit: 7,
  geographic_match: 10,
  budget_fit: 8,
  competitive_advantage: 6,
  funder_history_fit: 7,
};

const validMatchLLMOutput = {
  grant_id: "abc-123",
  scores: validScores,
  match_rationale: "Strong mission alignment with focus on youth education. Geographic coverage matches.",
  missing_requirements: ["SAM.gov registration required"],
  has_hard_eligibility_barrier: false,
};

describe("MatchLLMOutputSchema", () => {
  it("accepts valid LLM match output", () => {
    expect(MatchLLMOutputSchema.safeParse(validMatchLLMOutput).success).toBe(true);
  });

  it("rejects dimension scores outside 1-10", () => {
    const invalid = {
      ...validMatchLLMOutput,
      scores: { ...validScores, mission_alignment: 11 },
    };
    expect(MatchLLMOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects match_rationale shorter than 10 characters", () => {
    const invalid = { ...validMatchLLMOutput, match_rationale: "too short" };
    expect(MatchLLMOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects missing has_hard_eligibility_barrier", () => {
    const { has_hard_eligibility_barrier, ...invalid } = validMatchLLMOutput;
    expect(MatchLLMOutputSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("MatchBatchLLMOutputSchema", () => {
  it("accepts array of scored grants", () => {
    const valid = {
      scored_grants: [validMatchLLMOutput],
    };
    expect(MatchBatchLLMOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts empty scored_grants array", () => {
    expect(MatchBatchLLMOutputSchema.safeParse({ scored_grants: [] }).success).toBe(true);
  });
});

describe("computeMatchScore", () => {
  it("computes weighted average and returns integer 0-100", () => {
    const score = computeMatchScore(validScores);
    // 9*0.25 + 7*0.20 + 10*0.15 + 8*0.15 + 6*0.15 + 7*0.10 = 7.95 => *10 = 79.5 => round = 80
    expect(score).toBe(80);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("deriveWinProbability", () => {
  it("returns low when has_hard_eligibility_barrier is true", () => {
    expect(deriveWinProbability(90, true, [])).toBe("low");
  });

  it("returns low when matchScore < 50", () => {
    expect(deriveWinProbability(40, false, [])).toBe("low");
  });

  it("returns very_high when score >= 85 and no missing requirements", () => {
    expect(deriveWinProbability(90, false, [])).toBe("very_high");
  });

  it("returns high when score >= 70 and one or fewer missing requirements", () => {
    expect(deriveWinProbability(75, false, ["one gap"])).toBe("high");
  });

  it("returns moderate for mid-range scores", () => {
    expect(deriveWinProbability(65, false, ["gap1", "gap2"])).toBe("moderate");
  });
});

describe("deriveRecommendedAction", () => {
  it("returns skip when has hard barrier", () => {
    expect(deriveRecommendedAction("high", true, 80, 0)).toBe("skip");
  });

  it("returns skip when match score < 50", () => {
    expect(deriveRecommendedAction("low", false, 40, 0)).toBe("skip");
  });

  it("returns apply when high probability and no missing requirements", () => {
    expect(deriveRecommendedAction("high", false, 80, 0)).toBe("apply");
  });

  it("returns prepare_then_apply when high probability but missing requirements", () => {
    expect(deriveRecommendedAction("high", false, 75, 2)).toBe("prepare_then_apply");
  });

  it("returns research_more for moderate probability with no missing", () => {
    expect(deriveRecommendedAction("moderate", false, 65, 0)).toBe("research_more");
  });
});

describe("enrichLLMOutput", () => {
  it("adds match_score, win_probability, and recommended_action", () => {
    const raw = { scored_grants: [validMatchLLMOutput] };
    const enriched = enrichLLMOutput(raw);
    const g = enriched.scored_grants[0];

    expect(g.grant_id).toBe("abc-123");
    expect(typeof g.match_score).toBe("number");
    expect(["low", "moderate", "high", "very_high"]).toContain(g.win_probability);
    expect(["apply", "prepare_then_apply", "research_more", "skip"]).toContain(g.recommended_action);
    expect(g.scores).toEqual(validScores);
    expect(g.match_rationale).toBe(validMatchLLMOutput.match_rationale);
  });
});
