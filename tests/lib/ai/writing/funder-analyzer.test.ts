// grantiq/tests/lib/ai/writing/funder-analyzer.test.ts

import { describe, it, expect } from "vitest";
import { FunderAnalysisOutputSchema } from "@/lib/ai/writing/schemas";

describe("Funder Analyzer", () => {
  it("validates a complete funder analysis output", () => {
    const mockAnalysis = {
      funder_name: "Health Resources and Services Administration (HRSA)",
      funder_type: "federal",
      mission_alignment_notes:
        "HRSA's focus on community health workers and medically underserved areas directly aligns with the applicant's mission to expand primary care access in rural Georgia. The applicant's existing CHW program and FQHC designation demonstrate concrete alignment with HRSA's funding priorities.",
      giving_trends: {
        direction: "increasing",
        total_annual_giving: 12000000000,
        avg_award_size: 350000,
        typical_range: { min: 200000, max: 500000 },
      },
      stated_priorities: [
        "community health workers",
        "medically underserved areas",
        "workforce development",
        "health equity",
        "culturally competent care",
      ],
      geographic_focus: ["United States", "rural communities", "medically underserved areas"],
      past_award_patterns: {
        favors_new_applicants: true,
        typical_org_size: "medium",
        repeat_funding_common: false,
        avg_grant_duration_years: 3,
      },
      language_preferences: [
        "medically underserved areas",
        "health equity",
        "community health workers",
        "evidence-based",
        "culturally competent",
      ],
      red_flags: [
        "research-only proposals",
        "capital construction",
        "proposals without clear community need data",
        "organizations without prior health services experience",
      ],
      writing_recommendations: [
        "Lead with MUA/MUP designation data and HRSA health shortage area statistics",
        "Use HRSA's exact terminology: 'community health workers' not 'patient navigators'",
        "Emphasize sustainability beyond grant period — HRSA rarely funds same org twice",
        "Include specific CHW training curriculum aligned with HRSA CHW Core Competencies",
        "Document community partnerships with letters of support from local health departments",
        "Address all 5 HRSA review criteria with equal depth in the Project Narrative",
      ],
      alignment_score: 87,
    };

    const result = FunderAnalysisOutputSchema.safeParse(mockAnalysis);
    expect(result.success).toBe(true);
  });

  it("validates a low-alignment funder analysis", () => {
    const lowAlignment = {
      funder_name: "National Endowment for the Arts",
      funder_type: "federal",
      mission_alignment_notes:
        "Very limited alignment. NEA focuses on arts programming while the applicant operates health services. No overlap in program areas.",
      giving_trends: {
        direction: "stable",
        total_annual_giving: 180000000,
        avg_award_size: 25000,
        typical_range: { min: 5000, max: 100000 },
      },
      stated_priorities: ["arts education", "creative placemaking", "artist fellowships"],
      geographic_focus: ["United States"],
      past_award_patterns: {
        favors_new_applicants: null,
        typical_org_size: "small",
        repeat_funding_common: null,
        avg_grant_duration_years: 1,
      },
      language_preferences: ["creative placemaking", "arts education", "accessibility"],
      red_flags: ["non-arts programming", "medical/health services", "research"],
      writing_recommendations: [
        "Do not apply to this funder for health programming",
        "If pursuing arts integration angle, document specific arts programming components",
      ],
      alignment_score: 12,
    };

    const result = FunderAnalysisOutputSchema.safeParse(lowAlignment);
    expect(result.success).toBe(true);
  });

  it("rejects alignment_score below 1", () => {
    const invalid = {
      funder_name: "Test Funder",
      funder_type: "foundation",
      mission_alignment_notes: "Some notes",
      giving_trends: {
        direction: "unknown",
        total_annual_giving: null,
        avg_award_size: null,
        typical_range: { min: null, max: null },
      },
      stated_priorities: [],
      geographic_focus: [],
      past_award_patterns: {
        favors_new_applicants: null,
        typical_org_size: null,
        repeat_funding_common: null,
        avg_grant_duration_years: null,
      },
      language_preferences: [],
      red_flags: [],
      writing_recommendations: [],
      alignment_score: 0,  // min(1) violated
    };

    const result = FunderAnalysisOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects alignment_score above 100", () => {
    const invalid = {
      funder_name: "Test Funder",
      funder_type: "state",
      mission_alignment_notes: "Notes",
      giving_trends: {
        direction: "stable",
        total_annual_giving: null,
        avg_award_size: null,
        typical_range: { min: null, max: null },
      },
      stated_priorities: [],
      geographic_focus: [],
      past_award_patterns: {
        favors_new_applicants: null,
        typical_org_size: "any",
        repeat_funding_common: null,
        avg_grant_duration_years: null,
      },
      language_preferences: [],
      red_flags: [],
      writing_recommendations: [],
      alignment_score: 101,  // max(100) violated
    };

    const result = FunderAnalysisOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid funder_type enum value", () => {
    const invalid = {
      funder_name: "Test",
      funder_type: "nonprofit",  // not in enum
      mission_alignment_notes: "Notes",
      giving_trends: {
        direction: "stable",
        total_annual_giving: null,
        avg_award_size: null,
        typical_range: { min: null, max: null },
      },
      stated_priorities: [],
      geographic_focus: [],
      past_award_patterns: {
        favors_new_applicants: null,
        typical_org_size: null,
        repeat_funding_common: null,
        avg_grant_duration_years: null,
      },
      language_preferences: [],
      red_flags: [],
      writing_recommendations: [],
      alignment_score: 50,
    };

    const result = FunderAnalysisOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
