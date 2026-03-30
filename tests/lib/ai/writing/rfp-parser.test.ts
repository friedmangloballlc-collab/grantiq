// grantiq/tests/lib/ai/writing/rfp-parser.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RfpParseOutputSchema } from "@/lib/ai/writing/schemas";

// Test that a realistic Claude response passes Zod validation
describe("RFP Parser", () => {
  it("validates a realistic Claude response", () => {
    const mockResponse = {
      grant_title: "Community Health Worker Training Program",
      funder_name: "Health Resources and Services Administration (HRSA)",
      opportunity_number: "HRSA-26-123",
      deadline: "2026-07-15",
      total_funding_available: 10000000,
      award_range_min: 200000,
      award_range_max: 500000,
      estimated_awards: 25,
      cost_sharing_required: true,
      cost_sharing_pct: 25,
      grant_type: "federal",
      required_sections: [
        {
          section_name: "Project Abstract",
          description: "One-page summary of proposed project",
          page_limit: 1,
          word_limit: null,
          is_required: true,
          weight_pct: null,
          special_instructions: "Must include project title, applicant name, and summary of approach",
        },
        {
          section_name: "Project Narrative",
          description: "Full description of proposed project including need, goals, methods, evaluation, and sustainability",
          page_limit: 30,
          word_limit: null,
          is_required: true,
          weight_pct: 70,
          special_instructions: "Must use the 5 sections outlined in Section IV.2",
        },
      ],
      scoring_criteria: [
        { criterion: "Need", max_points: 20, description: "Clearly documents the need for the project", weight_pct: 20 },
        { criterion: "Response", max_points: 35, description: "Proposed approach addresses identified needs", weight_pct: 35 },
        { criterion: "Evaluative Measures", max_points: 15, description: "Evaluation plan is sound", weight_pct: 15 },
        { criterion: "Impact", max_points: 20, description: "Project will have significant impact", weight_pct: 20 },
        { criterion: "Organizational Capacity", max_points: 10, description: "Applicant can carry out proposed activities", weight_pct: 10 },
      ],
      eligibility_requirements: [
        { requirement: "Domestic public or private nonprofit", type: "entity_type", is_hard_requirement: true, details: null },
        { requirement: "Located in a medically underserved area", type: "geographic", is_hard_requirement: true, details: "As defined by HRSA MUA/MUP designation" },
      ],
      key_themes: ["health equity", "community health workers", "workforce development", "underserved populations", "culturally competent"],
      submission_format: { method: "grants_gov", details: "Application must be submitted via Grants.gov by 11:59 PM ET" },
      important_dates: [
        { event: "Application Due", date: "2026-07-15" },
        { event: "Award Notification", date: "2026-09-30" },
        { event: "Project Start", date: "2026-12-01" },
      ],
      summary: "HRSA seeks applications from nonprofits in medically underserved areas to develop Community Health Worker training and deployment programs. Awards of $200K-$500K for 3-year projects.",
    };

    const result = RfpParseOutputSchema.safeParse(mockResponse);
    expect(result.success).toBe(true);
  });

  it("rejects a response missing required_sections", () => {
    const invalid = {
      grant_title: "Test Grant",
      funder_name: "Test Funder",
      opportunity_number: null,
      deadline: null,
      total_funding_available: null,
      award_range_min: null,
      award_range_max: null,
      estimated_awards: null,
      cost_sharing_required: false,
      cost_sharing_pct: null,
      grant_type: "federal",
      // required_sections intentionally missing
      scoring_criteria: [],
      eligibility_requirements: [],
      key_themes: [],
      submission_format: { method: "grants_gov", details: null },
      important_dates: [],
      summary: "A test grant.",
    };

    const result = RfpParseOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a response with an invalid grant_type enum", () => {
    const invalid = {
      grant_title: "Test Grant",
      funder_name: "Test Funder",
      opportunity_number: null,
      deadline: null,
      total_funding_available: null,
      award_range_min: null,
      award_range_max: null,
      estimated_awards: null,
      cost_sharing_required: false,
      cost_sharing_pct: null,
      grant_type: "private",  // not in enum
      required_sections: [{
        section_name: "Abstract",
        description: "Summary",
        page_limit: null,
        word_limit: null,
        is_required: true,
        weight_pct: null,
        special_instructions: null,
      }],
      scoring_criteria: [],
      eligibility_requirements: [],
      key_themes: [],
      submission_format: { method: "email", details: null },
      important_dates: [],
      summary: "A test grant.",
    };

    const result = RfpParseOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts null for all optional fields", () => {
    const minimal = {
      grant_title: "Minimal Grant",
      funder_name: "Funder",
      opportunity_number: null,
      deadline: null,
      total_funding_available: null,
      award_range_min: null,
      award_range_max: null,
      estimated_awards: null,
      cost_sharing_required: false,
      cost_sharing_pct: null,
      grant_type: "foundation",
      required_sections: [{
        section_name: "Narrative",
        description: "Project description",
        page_limit: null,
        word_limit: null,
        is_required: true,
        weight_pct: null,
        special_instructions: null,
      }],
      scoring_criteria: [],
      eligibility_requirements: [],
      key_themes: ["health", "community"],
      submission_format: { method: "portal", details: null },
      important_dates: [],
      summary: "A minimal grant opportunity.",
    };

    const result = RfpParseOutputSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});
