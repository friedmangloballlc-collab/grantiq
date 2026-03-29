import { describe, it, expect, vi } from "vitest";
import { generateStrategy, buildStrategyUserMessage } from "@/lib/ai/engines/strategy";
import { StrategyOutputSchema } from "@/lib/ai/schemas/strategy";

vi.mock("@/lib/ai/call", () => ({
  aiCall: vi.fn().mockResolvedValue({
    content: JSON.stringify({
      quarters: [
        {
          quarter: "Q2 2026",
          year: 2026,
          grants: [
            {
              grant_id: "grant-001",
              grant_name: "Youth Education Initiative",
              funder_name: "Ford Foundation",
              amount_range: "$25,000 - $100,000",
              action: "apply",
              deadline: "2026-06-15",
              estimated_hours: 40,
              prerequisites: [],
              rationale: "Strong mission alignment, foundation grant appropriate for org's experience level.",
              source_type: "foundation",
              difficulty: "moderate",
            },
          ],
          capacity_hours_total: 40,
          strategy_notes: "Focus on one high-probability foundation grant to build momentum. Your 12 years of experience and existing foundation track record make this a strong starting point.",
          risk_assessment: "Main risk is deadline timing — start preparation by May 1 to allow 6 weeks.",
        },
      ],
      annual_summary: {
        total_potential_funding: 100000,
        total_applications: 1,
        total_hours_estimated: 40,
        diversification_score: 25,
        diversification_notes: "All recommendations are foundation grants. Consider adding state grants in Q3 to diversify.",
      },
      sequencing_rationale: "With intermediate grant experience and no federal history, we start with foundation grants where you have proven success. Federal opportunities can be introduced in Q3-Q4 after SAM.gov registration.",
      readiness_gates: [
        {
          gate_name: "SAM.gov Registration",
          status: "not_met",
          blocks: ["Federal Youth Services Grant"],
          fix_action: "Register at SAM.gov by April 2026 to unlock federal grants in Q3.",
        },
      ],
      key_dates: [
        {
          date: "2026-05-01",
          event: "Begin Ford Foundation application",
          action_required: "Start drafting narrative sections",
        },
        {
          date: "2026-06-15",
          event: "Ford Foundation Deadline",
          action_required: "Submit final application",
        },
      ],
    }),
    inputTokens: 3000,
    outputTokens: 1500,
    costCents: 30,
    model: "claude-opus-4-20250514",
  }),
}));

describe("buildStrategyUserMessage", () => {
  it("includes readiness data and matched grants", () => {
    const msg = buildStrategyUserMessage(
      {
        name: "Atlanta Youth Foundation",
        entity_type: "nonprofit_501c3",
        state: "GA",
        annual_budget: 500000,
        employee_count: 8,
        has_grant_writer: false,
        grant_history_level: "intermediate",
      },
      {
        overall_score: 67,
        tier_label: "moderate",
        eligible_grant_types: ["foundation", "state", "corporate"],
        blocked_grant_types: ["federal"],
        top_3_gaps: [],
        criteria: [],
      },
      [
        {
          grant_id: "grant-001",
          grant_name: "Youth Education Initiative",
          funder_name: "Ford Foundation",
          source_type: "foundation",
          match_score: 78,
          win_probability: "high",
          amount_range: "$25,000 - $100,000",
          deadline: "2026-06-15",
        },
      ],
      [],
      "2026-03-29"
    );

    expect(msg).toContain("Atlanta Youth Foundation");
    expect(msg).toContain("Readiness Score: 67");
    expect(msg).toContain("Ford Foundation");
    expect(msg).toContain("2026-03-29");
  });
});

describe("generateStrategy", () => {
  it("returns Zod-validated strategy output", async () => {
    const result = await generateStrategy(
      { orgId: "org-123", userId: "user-456", tier: "pro" },
      {
        name: "Atlanta Youth Foundation",
        entity_type: "nonprofit_501c3",
        state: "GA",
        annual_budget: 500000,
        employee_count: 8,
        has_grant_writer: false,
        grant_history_level: "intermediate",
      },
      {
        overall_score: 67,
        tier_label: "moderate",
        eligible_grant_types: ["foundation", "state", "corporate"],
        blocked_grant_types: ["federal"],
        top_3_gaps: [],
        criteria: [],
      },
      [
        {
          grant_id: "grant-001",
          grant_name: "Youth Education Initiative",
          funder_name: "Ford Foundation",
          source_type: "foundation",
          match_score: 78,
          win_probability: "high",
          amount_range: "$25,000 - $100,000",
          deadline: "2026-06-15",
        },
      ],
      [],
      "2026-03-29"
    );

    const parsed = StrategyOutputSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.quarters.length).toBeGreaterThanOrEqual(1);
    expect(result.annual_summary.total_applications).toBeGreaterThanOrEqual(1);
  });
});
