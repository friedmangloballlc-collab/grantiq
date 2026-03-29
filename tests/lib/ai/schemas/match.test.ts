import { describe, it, expect } from "vitest";
import { MatchScoreOutputSchema, MatchBatchOutputSchema } from "@/lib/ai/schemas/match";

const validBreakdown = {
  mission_alignment: 9,
  capacity_fit: 7,
  geographic_match: 10,
  budget_fit: 8,
  competition_level: 6,
  funder_history_fit: 7,
};

describe("MatchScoreOutputSchema", () => {
  it("accepts valid match score output", () => {
    const valid = {
      grant_id: "abc-123",
      match_score: 82,
      score_breakdown: validBreakdown,
      why_it_matches: "Strong mission alignment with focus on youth education. Geographic coverage matches.",
      missing_requirements: ["SAM.gov registration required"],
      win_probability: "moderate",
      recommended_action: "apply",
    };
    expect(MatchScoreOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects match_score outside 0-100", () => {
    const invalid = {
      grant_id: "abc",
      match_score: 105,
      score_breakdown: validBreakdown,
      why_it_matches: "test string here ok",
      missing_requirements: [],
      win_probability: "moderate",
      recommended_action: "apply",
    };
    expect(MatchScoreOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects dimension scores outside 1-10", () => {
    const invalid = {
      grant_id: "abc",
      match_score: 80,
      score_breakdown: { ...validBreakdown, mission_alignment: 11 },
      why_it_matches: "test string here ok",
      missing_requirements: [],
      win_probability: "moderate",
      recommended_action: "apply",
    };
    expect(MatchScoreOutputSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("MatchBatchOutputSchema", () => {
  it("accepts array of scored grants", () => {
    const valid = {
      scored_grants: [
        {
          grant_id: "abc",
          match_score: 82,
          score_breakdown: validBreakdown,
          why_it_matches: "Strong match for this org",
          missing_requirements: [],
          win_probability: "high",
          recommended_action: "apply",
        },
      ],
    };
    expect(MatchBatchOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts empty scored_grants array", () => {
    expect(MatchBatchOutputSchema.safeParse({ scored_grants: [] }).success).toBe(true);
  });
});
