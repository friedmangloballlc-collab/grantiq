import { describe, it, expect } from "vitest";
import { StrategyOutputSchema } from "@/lib/ai/schemas/strategy";

const validGrant = {
  grant_id: "g1",
  grant_name: "Community Development Block Grant",
  funder_name: "HUD",
  amount_range: "$50,000 - $250,000",
  action: "apply",
  deadline: "2026-06-30",
  estimated_hours: 40,
  prerequisites: ["SAM.gov registration"],
  rationale: "Strong alignment with housing mission and geographic eligibility.",
  source_type: "federal",
  difficulty: "moderate",
};

const validOutput = {
  quarters: [
    {
      quarter: "Q1",
      year: 2026,
      grants: [validGrant],
      capacity_hours_total: 80,
      strategy_notes: "Focus on federal grants with upcoming deadlines.",
      risk_assessment: "Moderate risk due to competition.",
    },
  ],
  annual_summary: {
    total_potential_funding: 500000,
    total_applications: 4,
    total_hours_estimated: 160,
    diversification_score: 75,
    diversification_notes: "Good mix of federal, state, and foundation sources.",
  },
  sequencing_rationale: "Start with highest-probability federal grants before moving to foundation applications.",
  readiness_gates: [
    {
      gate_name: "SAM.gov Registration",
      status: "met",
      blocks: [],
      fix_action: null,
    },
  ],
  key_dates: [
    {
      date: "2026-03-31",
      event: "Q1 deadline cluster",
      action_required: "Submit federal applications.",
    },
  ],
};

describe("StrategyOutputSchema", () => {
  it("accepts valid strategy output", () => {
    expect(StrategyOutputSchema.safeParse(validOutput).success).toBe(true);
  });

  it("rejects quarters array exceeding max of 4", () => {
    const quarter = validOutput.quarters[0];
    const invalid = { ...validOutput, quarters: [quarter, quarter, quarter, quarter, quarter] };
    expect(StrategyOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid action enum on a grant", () => {
    const invalidGrant = { ...validGrant, action: "ignore" };
    const invalid = {
      ...validOutput,
      quarters: [{ ...validOutput.quarters[0], grants: [invalidGrant] }],
    };
    expect(StrategyOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects diversification_score outside 0-100", () => {
    const invalid = {
      ...validOutput,
      annual_summary: { ...validOutput.annual_summary, diversification_score: -5 },
    };
    expect(StrategyOutputSchema.safeParse(invalid).success).toBe(false);
  });
});
