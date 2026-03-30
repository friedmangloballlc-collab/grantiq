// grantiq/tests/lib/ai/writing/schemas.test.ts

import { describe, it, expect } from "vitest";
import {
  RfpParseOutputSchema,
  RfpSectionSchema,
  FunderAnalysisOutputSchema,
  DraftSectionOutputSchema,
  BudgetTableOutputSchema,
  CoherenceCheckOutputSchema,
  AuditOutputSchema,
  ReviewSimulationOutputSchema,
  ComplianceOutputSchema,
  NarrativeExtractionOutputSchema,
} from "@/lib/ai/writing/schemas";

// ============================================================
// RfpParseOutputSchema
// ============================================================

describe("RfpParseOutputSchema", () => {
  const validRfp = {
    grant_title: "Youth Mental Health Initiative",
    funder_name: "SAMHSA",
    opportunity_number: "SM-26-001",
    deadline: "2026-06-15",
    total_funding_available: 5000000,
    award_range_min: 100000,
    award_range_max: 500000,
    estimated_awards: 15,
    cost_sharing_required: false,
    cost_sharing_pct: null,
    grant_type: "federal",
    required_sections: [{
      section_name: "Project Narrative",
      description: "Describe the proposed project",
      page_limit: 25,
      word_limit: null,
      is_required: true,
      weight_pct: 40,
      special_instructions: "Must include logic model",
    }],
    scoring_criteria: [{
      criterion: "Need",
      max_points: 25,
      description: "Demonstrates clear need",
      weight_pct: null,
    }],
    eligibility_requirements: [{
      requirement: "Must be a 501(c)(3)",
      type: "entity_type",
      is_hard_requirement: true,
      details: null,
    }],
    key_themes: ["evidence-based", "youth", "mental health", "community"],
    submission_format: { method: "grants_gov", details: null },
    important_dates: [{ event: "LOI Due", date: "2026-05-01" }],
    summary: "SAMHSA seeks applications for youth mental health programs.",
  };

  it("validates a well-formed RFP parse output", () => {
    expect(RfpParseOutputSchema.safeParse(validRfp).success).toBe(true);
  });

  it("rejects empty required_sections array (min 1 violated)", () => {
    const invalid = { ...validRfp, required_sections: [] };
    expect(RfpParseOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid grant_type enum value", () => {
    const invalid = { ...validRfp, grant_type: "nonprofit" };
    expect(RfpParseOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("accepts null for all nullable fields", () => {
    const nulled = {
      ...validRfp,
      opportunity_number: null,
      deadline: null,
      total_funding_available: null,
      award_range_min: null,
      award_range_max: null,
      estimated_awards: null,
      cost_sharing_pct: null,
    };
    expect(RfpParseOutputSchema.safeParse(nulled).success).toBe(true);
  });
});

// ============================================================
// RfpSectionSchema
// ============================================================

describe("RfpSectionSchema", () => {
  it("validates a section with all fields present", () => {
    const valid = {
      section_name: "Budget Narrative",
      description: "Justify all budget line items",
      page_limit: 5,
      word_limit: 2500,
      is_required: true,
      weight_pct: 20,
      special_instructions: "Use SF-424A format",
    };
    expect(RfpSectionSchema.safeParse(valid).success).toBe(true);
  });

  it("validates a section with null limits and instructions", () => {
    const valid = {
      section_name: "Abstract",
      description: "Brief project summary",
      page_limit: null,
      word_limit: null,
      is_required: true,
      weight_pct: null,
      special_instructions: null,
    };
    expect(RfpSectionSchema.safeParse(valid).success).toBe(true);
  });
});

// ============================================================
// FunderAnalysisOutputSchema
// ============================================================

describe("FunderAnalysisOutputSchema", () => {
  it("validates a complete funder analysis", () => {
    const valid = {
      funder_name: "Robert Wood Johnson Foundation",
      funder_type: "foundation",
      mission_alignment_notes: "Both focus on health equity for underserved rural communities.",
      giving_trends: {
        direction: "increasing",
        total_annual_giving: 500000000,
        avg_award_size: 350000,
        typical_range: { min: 100000, max: 1000000 },
      },
      stated_priorities: ["health equity", "community health workers", "social determinants"],
      geographic_focus: ["United States", "rural communities"],
      past_award_patterns: {
        favors_new_applicants: false,
        typical_org_size: "medium",
        repeat_funding_common: true,
        avg_grant_duration_years: 3,
      },
      language_preferences: ["health equity", "vulnerable populations", "systems change"],
      red_flags: ["individual scholarships", "capital campaigns", "endowments"],
      writing_recommendations: [
        "Lead with equity framing",
        "Emphasize community voice in program design",
      ],
      alignment_score: 82,
    };
    expect(FunderAnalysisOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects alignment_score below 1", () => {
    const invalid = {
      funder_name: "Test",
      funder_type: "federal",
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
    expect(FunderAnalysisOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects alignment_score above 100", () => {
    const base = {
      funder_name: "Test",
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
    expect(FunderAnalysisOutputSchema.safeParse(base).success).toBe(false);
  });
});

// ============================================================
// DraftSectionOutputSchema
// ============================================================

describe("DraftSectionOutputSchema", () => {
  it("validates a complete draft section output", () => {
    const valid = {
      section_name: "Project Narrative",
      section_type: "project_narrative",
      content: "Our organization proposes to...",
      word_count: 2450,
      page_estimate: 4.9,
      within_limits: true,
      key_themes_addressed: ["evidence-based", "youth", "mental health"],
      scoring_criteria_addressed: ["Need", "Approach", "Evaluation"],
      confidence_score: 8,
      notes: "Organization should add specific local outcome data",
    };
    expect(DraftSectionOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects confidence_score outside 1-10 range", () => {
    const invalid = {
      section_name: "Abstract",
      section_type: "abstract",
      content: "Brief summary",
      word_count: 200,
      page_estimate: 0.4,
      within_limits: true,
      key_themes_addressed: [],
      scoring_criteria_addressed: [],
      confidence_score: 11,  // max(10) violated
      notes: null,
    };
    expect(DraftSectionOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid section_type", () => {
    const invalid = {
      section_name: "Test",
      section_type: "executive_summary",  // not in enum
      content: "Content",
      word_count: 100,
      page_estimate: 0.2,
      within_limits: true,
      key_themes_addressed: [],
      scoring_criteria_addressed: [],
      confidence_score: 7,
      notes: null,
    };
    expect(DraftSectionOutputSchema.safeParse(invalid).success).toBe(false);
  });
});

// ============================================================
// BudgetTableOutputSchema
// ============================================================

describe("BudgetTableOutputSchema", () => {
  it("validates a budget with correct structure", () => {
    const valid = {
      line_items: [{
        category: "personnel",
        description: "Project Director (0.5 FTE)",
        quantity: 1,
        unit_cost: 45000,
        grant_funded: 45000,
        cost_share: 0,
        total: 45000,
        justification: "Will oversee all project activities.",
      }],
      total_grant_request: 45000,
      total_cost_share: 0,
      total_project_cost: 45000,
      indirect_cost_rate: 15.5,
      budget_period: "12 months",
      math_valid: true,
    };
    expect(BudgetTableOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty line_items array (min 1 violated)", () => {
    const invalid = {
      line_items: [],  // min(1) violated
      total_grant_request: 0,
      total_cost_share: 0,
      total_project_cost: 0,
      indirect_cost_rate: null,
      budget_period: "12 months",
      math_valid: true,
    };
    expect(BudgetTableOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("accepts null for indirect_cost_rate", () => {
    const valid = {
      line_items: [{
        category: "supplies",
        description: "Program supplies",
        quantity: null,
        unit_cost: null,
        grant_funded: 5000,
        cost_share: 0,
        total: 5000,
        justification: "Needed for program delivery.",
      }],
      total_grant_request: 5000,
      total_cost_share: 0,
      total_project_cost: 5000,
      indirect_cost_rate: null,
      budget_period: "6 months",
      math_valid: true,
    };
    expect(BudgetTableOutputSchema.safeParse(valid).success).toBe(true);
  });
});

// ============================================================
// AuditOutputSchema
// ============================================================

describe("AuditOutputSchema", () => {
  const makeDimension = (dim: string) => ({
    dimension: dim,
    score: 7,
    strengths: ["Clear need documented"],
    weaknesses: ["Missing SMART objectives"],
    improvements: [],
  });

  const validAudit = {
    overall_score: 75,
    grade: "B",
    dimensions: [
      makeDimension("need_statement"),
      makeDimension("goals_objectives"),
      makeDimension("methods_approach"),
      makeDimension("evaluation_plan"),
      makeDimension("budget_justification"),
      makeDimension("organizational_capacity"),
    ],
    top_strengths: ["Strong needs assessment", "Clear methodology"],
    critical_weaknesses: ["Weak evaluation plan"],
    win_probability_estimate: 35,
    executive_summary: "This is a solid application with room for improvement in evaluation.",
    ranked_improvements: [{
      rank: 1,
      section: "Evaluation Plan",
      improvement: "Add specific measurable outcome targets",
      expected_score_impact: 8,
    }],
  };

  it("validates a complete audit output with 6 dimensions", () => {
    expect(AuditOutputSchema.safeParse(validAudit).success).toBe(true);
  });

  it("rejects dimensions array with wrong length (not 6)", () => {
    const invalid = {
      ...validAudit,
      dimensions: validAudit.dimensions.slice(0, 4),  // only 4 dimensions
    };
    expect(AuditOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects top_strengths with more than 5 items", () => {
    const invalid = {
      ...validAudit,
      top_strengths: ["s1", "s2", "s3", "s4", "s5", "s6"],  // max(5) violated
    };
    expect(AuditOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects empty top_strengths array (min 1 violated)", () => {
    const invalid = { ...validAudit, top_strengths: [] };
    expect(AuditOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid grade value", () => {
    const invalid = { ...validAudit, grade: "B+" };
    expect(AuditOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects overall_score above 100", () => {
    const invalid = { ...validAudit, overall_score: 105 };
    expect(AuditOutputSchema.safeParse(invalid).success).toBe(false);
  });
});

// ============================================================
// ReviewSimulationOutputSchema
// ============================================================

describe("ReviewSimulationOutputSchema", () => {
  const makeReviewer = (persona: string) => ({
    persona,
    persona_description: `A ${persona} reviewer`,
    scores: { "Need": 20, "Approach": 18 },
    total_score: 38,
    max_possible_score: 50,
    strengths: ["Strong evidence base"],
    concerns: ["Timeline seems ambitious"],
    narrative_feedback: "This is a well-written application. The needs assessment is strong...",
    recommendation: "fund_with_conditions",
  });

  const validReviewSim = {
    reviewers: [
      makeReviewer("technical_expert"),
      makeReviewer("program_officer"),
      makeReviewer("community_advocate"),
    ],
    consensus_score: 114,
    consensus_max: 150,
    consensus_pct: 76,
    consensus_recommendation: "fund_with_conditions",
    score_variance: 2.5,
    ranked_revisions: [{
      rank: 1,
      section: "Evaluation Plan",
      issue: "Missing baseline data",
      suggested_fix: "Add pre/post survey methodology",
      reviewers_who_flagged: ["technical_expert", "program_officer"],
      expected_score_impact: 5,
    }],
    panel_discussion_summary: "Panel agreed on strong need but differed on evaluation rigor.",
  };

  it("validates a complete review simulation with 3 reviewers", () => {
    expect(ReviewSimulationOutputSchema.safeParse(validReviewSim).success).toBe(true);
  });

  it("rejects reviewers array with wrong length (not 3)", () => {
    const invalid = {
      ...validReviewSim,
      reviewers: validReviewSim.reviewers.slice(0, 2),  // only 2 reviewers
    };
    expect(ReviewSimulationOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid consensus_recommendation enum", () => {
    const invalid = {
      ...validReviewSim,
      consensus_recommendation: "maybe_fund",  // not in enum
    };
    expect(ReviewSimulationOutputSchema.safeParse(invalid).success).toBe(false);
  });
});

// ============================================================
// ComplianceOutputSchema
// ============================================================

describe("ComplianceOutputSchema", () => {
  it("validates a compliance output with mixed results", () => {
    const valid = {
      overall_pass: false,
      submission_ready: false,
      blocker_count: 0,
      critical_count: 1,
      warning_count: 2,
      info_count: 3,
      findings: [{
        check_id: "det_001",
        pass_type: "deterministic",
        category: "word_count",
        passed: false,
        severity: "critical",
        finding: "Project Narrative exceeds 25-page limit by 2 pages",
        details: "Current: 27 pages. Limit: 25 pages.",
        auto_fixable: false,
        fix_suggestion: "Remove 1000 words from the methods section",
      }],
      deterministic_pass: {
        all_passed: false,
        checks_run: 8,
        checks_failed: 1,
      },
      semantic_pass: {
        all_passed: true,
        checks_run: 10,
        checks_failed: 0,
      },
      summary: "Application has one critical issue requiring attention before submission.",
    };
    expect(ComplianceOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("validates a fully passing compliance output", () => {
    const valid = {
      overall_pass: true,
      submission_ready: true,
      blocker_count: 0,
      critical_count: 0,
      warning_count: 0,
      info_count: 2,
      findings: [],
      deterministic_pass: {
        all_passed: true,
        checks_run: 8,
        checks_failed: 0,
      },
      semantic_pass: {
        all_passed: true,
        checks_run: 10,
        checks_failed: 0,
      },
      summary: "Application passes all compliance checks and is ready for submission.",
    };
    expect(ComplianceOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid severity in finding", () => {
    const invalid = {
      overall_pass: false,
      submission_ready: false,
      blocker_count: 1,
      critical_count: 0,
      warning_count: 0,
      info_count: 0,
      findings: [{
        check_id: "det_001",
        pass_type: "deterministic",
        category: "required_section",
        passed: false,
        severity: "fatal",  // not in enum
        finding: "Missing required section",
        details: null,
        auto_fixable: false,
        fix_suggestion: null,
      }],
      deterministic_pass: { all_passed: false, checks_run: 1, checks_failed: 1 },
      semantic_pass: { all_passed: true, checks_run: 0, checks_failed: 0 },
      summary: "Critical issues found.",
    };
    expect(ComplianceOutputSchema.safeParse(invalid).success).toBe(false);
  });
});

// ============================================================
// NarrativeExtractionOutputSchema
// ============================================================

describe("NarrativeExtractionOutputSchema", () => {
  it("validates a narrative extraction with segments", () => {
    const valid = {
      segments: [{
        segment_type: "needs_assessment",
        text: "In our community, 1 in 5 youth experience mental health challenges...",
        quality_score: 8,
        tags: ["youth", "mental_health", "rural", "evidence_based"],
      }],
      grant_outcome: "won",
    };
    expect(NarrativeExtractionOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("validates with null grant_outcome", () => {
    const valid = {
      segments: [],
      grant_outcome: null,
    };
    expect(NarrativeExtractionOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects quality_score below 1", () => {
    const invalid = {
      segments: [{
        segment_type: "mission_statement",
        text: "Some text",
        quality_score: 0,  // min(1) violated
        tags: ["nonprofit"],
      }],
      grant_outcome: "pending",
    };
    expect(NarrativeExtractionOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects quality_score above 10", () => {
    const invalid = {
      segments: [{
        segment_type: "evaluation_plan",
        text: "Some text",
        quality_score: 11,  // max(10) violated
        tags: ["evaluation"],
      }],
      grant_outcome: null,
    };
    expect(NarrativeExtractionOutputSchema.safeParse(invalid).success).toBe(false);
  });
});
