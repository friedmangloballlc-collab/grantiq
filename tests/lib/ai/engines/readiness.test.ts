import { describe, it, expect, vi } from "vitest";
import { assessReadiness, buildReadinessUserMessage } from "@/lib/ai/engines/readiness";

vi.mock("@/lib/ai/call", () => ({
  aiCall: vi.fn().mockResolvedValue({
    content: JSON.stringify({
      overall_score: 67,
      criteria: [
        { criterion_id: "a_legal_status", criterion_name: "Legal Status & Registration", score: 9, evidence_level: "direct_evidence", explanation: "Active 501(c)(3) with valid EIN.", fix_action: null, estimated_fix_hours: null, priority: null },
        { criterion_id: "b_financial_systems", criterion_name: "Financial Systems & Audit Readiness", score: 7, evidence_level: "direct_evidence", explanation: "Has annual audit on file.", fix_action: null, estimated_fix_hours: null, priority: null },
        { criterion_id: "c_federal_registration", criterion_name: "Federal Registration", score: 3, evidence_level: "direct_evidence", explanation: "No SAM.gov registration present.", fix_action: "Register at SAM.gov. Allow 2-4 weeks for processing.", estimated_fix_hours: 4, priority: "critical" },
        { criterion_id: "d_track_record", criterion_name: "Organizational Track Record", score: 8, evidence_level: "direct_evidence", explanation: "12 years operating with documented outcomes.", fix_action: null, estimated_fix_hours: null, priority: null },
        { criterion_id: "e_grant_history", criterion_name: "Grant History & Experience", score: 6, evidence_level: "inferred", explanation: "5 foundation grants but no federal experience.", fix_action: "Consider a smaller state grant to build federal readiness.", estimated_fix_hours: 10, priority: "nice_to_have" },
        { criterion_id: "f_staffing_capacity", criterion_name: "Staffing & Capacity", score: 7, evidence_level: "direct_evidence", explanation: "8 staff members with grant experience.", fix_action: null, estimated_fix_hours: null, priority: null },
        { criterion_id: "g_mission_narrative", criterion_name: "Mission Clarity & Narrative", score: 7, evidence_level: "direct_evidence", explanation: "Clear mission on youth education.", fix_action: null, estimated_fix_hours: null, priority: null },
        { criterion_id: "h_program_design", criterion_name: "Program Design & Evaluation", score: 5, evidence_level: "inferred", explanation: "Programs exist but no formal logic model on file.", fix_action: "Develop a logic model for core programs.", estimated_fix_hours: 8, priority: "important" },
        { criterion_id: "i_compliance_docs", criterion_name: "Compliance & Documentation", score: 8, evidence_level: "direct_evidence", explanation: "Most documents available and current.", fix_action: null, estimated_fix_hours: null, priority: null },
        { criterion_id: "j_growth_stage", criterion_name: "Growth Stage Positioning", score: 7, evidence_level: "inferred", explanation: "Established org appropriately pursuing mid-size grants.", fix_action: null, estimated_fix_hours: null, priority: null },
      ],
      summary: "Atlanta Youth Foundation has a strong legal and organizational foundation with 12 years of experience. Your 501(c)(3) status and audit history are solid. The primary gap is federal grant readiness — SAM.gov registration is critical if you want to pursue federal funding. Developing formal logic models for your programs would strengthen any application.",
      top_3_gaps: [
        { criterion_id: "c_federal_registration", criterion_name: "Federal Registration", gap_description: "No SAM.gov registration blocks all federal grants", fix_action: "Register at SAM.gov (sam.gov). Allow 2-4 weeks for processing.", estimated_fix_hours: 4, unlocks: "All federal grant opportunities including HRSA, DOE, and HHS." },
        { criterion_id: "h_program_design", criterion_name: "Program Design & Evaluation", gap_description: "No formal logic model or evaluation framework", fix_action: "Develop a logic model for your top 2 programs using the W.K. Kellogg Foundation template.", estimated_fix_hours: 8, unlocks: "Foundation grants requiring program design documentation." },
        { criterion_id: "e_grant_history", criterion_name: "Grant History & Experience", gap_description: "No federal grant experience", fix_action: "Apply to a sub-$50K state grant to build your track record.", estimated_fix_hours: 10, unlocks: "Mid-size federal grants requiring prior grant experience." },
      ],
      data_completeness_pct: 85,
    }),
    inputTokens: 1000,
    outputTokens: 600,
    costCents: 3,
    model: "claude-sonnet-4-20250514",
  }),
}));

const sampleOrg = {
  name: "Atlanta Youth Foundation",
  entity_type: "nonprofit_501c3",
  mission_statement: "Empowering Atlanta youth through education",
  state: "GA",
  annual_budget: 500000,
  employee_count: 8,
  years_operating: 12,
  has_501c3: true,
  has_ein: true,
  has_sam_registration: false,
  has_grants_gov: false,
  has_audit: true,
  has_fiscal_sponsor: false,
  has_grant_writer: false,
  prior_federal_grants: 0,
  prior_foundation_grants: 5,
  sam_gov_status: "none",
  grants_gov_status: "not_registered",
  program_areas: ["youth education"],
  population_served: ["youth ages 6-18"],
  grant_history_level: "intermediate",
  outcomes_tracking: false,
};

describe("buildReadinessUserMessage", () => {
  it("includes all org capabilities in the message", () => {
    const msg = buildReadinessUserMessage(sampleOrg);

    expect(msg).toContain("Atlanta Youth Foundation");
    expect(msg).toContain("SAM.gov: Not registered");
    expect(msg).toContain("Prior Foundation Grants: 5");
  });
});

describe("assessReadiness", () => {
  it("returns enriched readiness output with server-computed fields", async () => {
    const result = await assessReadiness(
      { orgId: "org-123", userId: "user-456", tier: "pro" },
      sampleOrg
    );

    expect(result.overall_score).toBe(67);
    expect(result.criteria).toHaveLength(10);
    // tier_label is server-computed from overall_score=67 => "moderate"
    expect(result.tier_label).toBe("moderate");
    // eligible/blocked are server-computed from criteria scores
    expect(Array.isArray(result.eligible_grant_types)).toBe(true);
    expect(Array.isArray(result.blocked_grant_types)).toBe(true);
    // c_federal_registration=3 < 7, so federal is blocked
    expect(result.blocked_grant_types).toContain("federal");
    expect(result.data_completeness_pct).toBe(85);
  });
});
