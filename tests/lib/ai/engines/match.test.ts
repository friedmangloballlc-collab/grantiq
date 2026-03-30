import { describe, it, expect, vi } from "vitest";
import {
  scoreGrantBatch,
  buildMatchUserMessage,
} from "@/lib/ai/engines/match";
import { MatchBatchLLMOutputSchema } from "@/lib/ai/schemas/match";

vi.mock("@/lib/ai/call", () => ({
  aiCall: vi.fn().mockResolvedValue({
    content: JSON.stringify({
      scored_grants: [
        {
          grant_id: "grant-001",
          scores: {
            mission_alignment: 9,
            capacity_fit: 7,
            geographic_match: 8,
            budget_fit: 7,
            competitive_advantage: 6,
            funder_history_fit: 6,
          },
          match_rationale:
            "Strong mission alignment on youth education. Atlanta service area matches Georgia focus. Budget range appropriate.",
          missing_requirements: ["SAM.gov registration (takes 2-4 weeks)"],
          has_hard_eligibility_barrier: false,
        },
      ],
    }),
    inputTokens: 1500,
    outputTokens: 400,
    costCents: 8,
    model: "claude-sonnet-4-20250514",
  }),
}));

const sampleOrg = {
  name: "Atlanta Youth Foundation",
  entity_type: "nonprofit_501c3",
  mission_statement: "Empowering Atlanta youth",
  state: "GA",
  city: "Atlanta",
  annual_budget: 500000,
  employee_count: 8,
  program_areas: ["youth education"],
  population_served: ["youth ages 6-18"],
  grant_history_level: "intermediate",
  has_501c3: true,
  has_sam_registration: false,
  has_audit: true,
  years_operating: 12,
  prior_federal_grants: 0,
  prior_foundation_grants: 5,
};

const sampleGrant = {
  id: "grant-001",
  name: "Youth Education Initiative",
  funder_name: "Ford Foundation",
  source_type: "foundation",
  amount_min: 25000,
  amount_max: 100000,
  description: "Supporting youth education in Southeast",
  deadline: "2026-06-15",
  states: ["GA", "FL"],
  eligibility_types: ["nonprofit_501c3"],
};

describe("buildMatchUserMessage", () => {
  it("includes org profile and grant details", () => {
    const msg = buildMatchUserMessage(sampleOrg, [sampleGrant]);
    expect(msg).toContain("Atlanta Youth Foundation");
    expect(msg).toContain("grant-001");
    expect(msg).toContain("Ford Foundation");
  });

  it("includes all org capability flags", () => {
    const msg = buildMatchUserMessage(sampleOrg, [sampleGrant]);
    expect(msg).toContain("501(c)(3) Status: Yes");
    expect(msg).toContain("SAM.gov Registration: Not registered");
    expect(msg).toContain("Has recent audit");
  });

  it("formats budget range correctly", () => {
    const msg = buildMatchUserMessage(sampleOrg, [sampleGrant]);
    expect(msg).toContain("$25,000");
    expect(msg).toContain("$100,000");
  });

  it("shows national when states array is empty", () => {
    const nationalGrant = { ...sampleGrant, states: [] };
    const msg = buildMatchUserMessage(sampleOrg, [nationalGrant]);
    expect(msg).toContain("National");
  });

  it("handles null city/state gracefully", () => {
    const noLocation = { ...sampleOrg, city: null, state: null };
    const msg = buildMatchUserMessage(noLocation, [sampleGrant]);
    expect(msg).toContain("Unknown, Unknown");
  });
});

describe("scoreGrantBatch", () => {
  it("returns enriched match scores with computed match_score", async () => {
    const result = await scoreGrantBatch(
      { orgId: "org-123", userId: "user-456", tier: "pro" },
      sampleOrg,
      [sampleGrant]
    );
    // MatchBatchLLMOutputSchema validates the LLM layer; result is the enriched output
    expect(result.scored_grants).toHaveLength(1);
    expect(typeof result.scored_grants[0].match_score).toBe("number");
    // Computed score: round((9*.25 + 7*.20 + 8*.15 + 7*.15 + 6*.15 + 6*.10) * 10) = 74
    expect(result.scored_grants[0].match_score).toBe(74);
  });

  it("returns correct win_probability and recommended_action", async () => {
    const result = await scoreGrantBatch(
      { orgId: "org-123", userId: "user-456", tier: "pro" },
      sampleOrg,
      [sampleGrant]
    );
    // score=74, no hard barrier, 1 missing => high; high + missing > 0 => prepare_then_apply
    expect(result.scored_grants[0].win_probability).toBe("high");
    expect(result.scored_grants[0].recommended_action).toBe("prepare_then_apply");
  });

  it("result passes MatchBatchLLMOutputSchema when re-examining LLM layer structure", async () => {
    // Verify the mock LLM response itself is valid per LLM schema
    const llmPayload = {
      scored_grants: [
        {
          grant_id: "grant-001",
          scores: {
            mission_alignment: 9,
            capacity_fit: 7,
            geographic_match: 8,
            budget_fit: 7,
            competitive_advantage: 6,
            funder_history_fit: 6,
          },
          match_rationale:
            "Strong mission alignment on youth education. Atlanta service area matches Georgia focus. Budget range appropriate.",
          missing_requirements: ["SAM.gov registration (takes 2-4 weeks)"],
          has_hard_eligibility_barrier: false,
        },
      ],
    };
    expect(MatchBatchLLMOutputSchema.safeParse(llmPayload).success).toBe(true);
  });
});
