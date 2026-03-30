import { describe, it, expect } from "vitest";
import {
  ReadinessLLMOutputSchema,
  computeTierLabel,
  computeGrantEligibility,
  enrichReadinessOutput,
} from "@/lib/ai/schemas/readiness";

const makeCriteria = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    criterion_id: `c${i + 1}`,
    criterion_name: `Criterion ${i + 1}`,
    score: 7,
    evidence_level: "direct_evidence" as const,
    explanation: "This is a valid explanation for the criterion score.",
    fix_action: null,
    estimated_fix_hours: null,
    priority: null,
  }));

const validLLMOutput = {
  overall_score: 72,
  criteria: makeCriteria(10),
  summary: "Organization demonstrates solid readiness across most criteria with a few key gaps.",
  top_3_gaps: [
    {
      criterion_id: "b_financial_systems",
      criterion_name: "Financial Statements",
      gap_description: "Missing audited financials for prior year.",
      fix_action: "Engage CPA for audit.",
      estimated_fix_hours: 40,
      unlocks: "State and federal grants requiring audited financials.",
    },
  ],
  data_completeness_pct: 80,
};

describe("ReadinessLLMOutputSchema", () => {
  it("accepts valid LLM readiness output", () => {
    expect(ReadinessLLMOutputSchema.safeParse(validLLMOutput).success).toBe(true);
  });

  it("rejects criteria array with wrong length (not 10)", () => {
    const invalid = { ...validLLMOutput, criteria: makeCriteria(9) };
    expect(ReadinessLLMOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects overall_score below 10", () => {
    const invalid = { ...validLLMOutput, overall_score: 5 };
    expect(ReadinessLLMOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects overall_score above 100", () => {
    const invalid = { ...validLLMOutput, overall_score: 101 };
    expect(ReadinessLLMOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid evidence_level on a criterion", () => {
    const badCriteria = makeCriteria(10);
    (badCriteria[0] as any).evidence_level = "made_up_value";
    const invalid = { ...validLLMOutput, criteria: badCriteria };
    expect(ReadinessLLMOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects summary shorter than 20 characters", () => {
    const invalid = { ...validLLMOutput, summary: "Too short" };
    expect(ReadinessLLMOutputSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("computeTierLabel", () => {
  it("returns excellent for score >= 90", () => {
    expect(computeTierLabel(90)).toBe("excellent");
    expect(computeTierLabel(95)).toBe("excellent");
  });

  it("returns good for score 70-89", () => {
    expect(computeTierLabel(70)).toBe("good");
    expect(computeTierLabel(89)).toBe("good");
  });

  it("returns moderate for score 50-69", () => {
    expect(computeTierLabel(50)).toBe("moderate");
    expect(computeTierLabel(69)).toBe("moderate");
  });

  it("returns not_ready for score below 50", () => {
    expect(computeTierLabel(49)).toBe("not_ready");
    expect(computeTierLabel(10)).toBe("not_ready");
  });
});

describe("computeGrantEligibility", () => {
  it("marks federal eligible when SAM >= 7, financial >= 7, legal >= 8", () => {
    const { eligible } = computeGrantEligibility({
      a_legal_status: 8,
      b_financial_systems: 7,
      c_federal_registration: 7,
      g_mission_narrative: 6,
    });
    expect(eligible).toContain("federal");
  });

  it("blocks federal when SAM registration is low", () => {
    const { blocked } = computeGrantEligibility({
      a_legal_status: 9,
      b_financial_systems: 8,
      c_federal_registration: 3,
      g_mission_narrative: 7,
    });
    expect(blocked).toContain("federal");
  });

  it("marks foundation eligible when legal >= 5 and narrative >= 5", () => {
    const { eligible } = computeGrantEligibility({
      a_legal_status: 6,
      b_financial_systems: 6,
      c_federal_registration: 3,
      g_mission_narrative: 6,
    });
    expect(eligible).toContain("foundation");
  });
});

describe("enrichReadinessOutput", () => {
  it("adds tier_label, eligible_grant_types, and blocked_grant_types", () => {
    const enriched = enrichReadinessOutput(validLLMOutput);

    expect(enriched.overall_score).toBe(72);
    expect(enriched.criteria).toHaveLength(10);
    expect(["excellent", "good", "moderate", "not_ready"]).toContain(enriched.tier_label);
    expect(Array.isArray(enriched.eligible_grant_types)).toBe(true);
    expect(Array.isArray(enriched.blocked_grant_types)).toBe(true);
    expect(enriched.data_completeness_pct).toBe(80);
  });
});
