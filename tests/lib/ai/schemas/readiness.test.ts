import { describe, it, expect } from "vitest";
import { ReadinessOutputSchema } from "@/lib/ai/schemas/readiness";

const makeCriteria = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    criterion_id: `c${i + 1}`,
    criterion_name: `Criterion ${i + 1}`,
    score: 7,
    explanation: "This is a valid explanation for the criterion score.",
    fix_action: null,
    estimated_fix_hours: null,
    priority: null,
  }));

const validOutput = {
  overall_score: 72,
  criteria: makeCriteria(10),
  tier_label: "good",
  summary: "Organization demonstrates solid readiness across most criteria with a few key gaps.",
  top_3_gaps: [
    {
      criterion_name: "Financial Statements",
      gap_description: "Missing audited financials for prior year.",
      fix_action: "Engage CPA for audit.",
      estimated_fix_hours: 40,
    },
  ],
  eligible_grant_types: ["foundation", "state"],
  blocked_grant_types: ["federal"],
};

describe("ReadinessOutputSchema", () => {
  it("accepts valid readiness output", () => {
    expect(ReadinessOutputSchema.safeParse(validOutput).success).toBe(true);
  });

  it("rejects criteria array with wrong length (not 10)", () => {
    const invalid = { ...validOutput, criteria: makeCriteria(9) };
    expect(ReadinessOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid tier_label value", () => {
    const invalid = { ...validOutput, tier_label: "terrible" };
    expect(ReadinessOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects overall_score outside 0-100", () => {
    const invalid = { ...validOutput, overall_score: 101 };
    expect(ReadinessOutputSchema.safeParse(invalid).success).toBe(false);
  });
});
