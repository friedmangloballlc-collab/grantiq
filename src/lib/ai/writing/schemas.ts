// grantiq/src/lib/ai/writing/schemas.ts

import { z } from "zod";

// ============================================================
// RFP Parser Output Schema
// ============================================================

export const RfpSectionSchema = z.object({
  section_name: z.string().describe("Name of the required section (e.g., 'Project Narrative')"),
  description: z.string().describe("What this section should contain"),
  page_limit: z.number().nullable().describe("Page limit for this section, null if none specified"),
  word_limit: z.number().nullable().describe("Word limit for this section, null if none specified"),
  is_required: z.boolean().describe("Whether this section is mandatory"),
  weight_pct: z.number().nullable().describe("Scoring weight percentage if specified"),
  special_instructions: z.string().nullable().describe("Any special formatting or content requirements"),
});

export const ScoringCriterionSchema = z.object({
  criterion: z.string().describe("Name of the scoring criterion"),
  max_points: z.number().describe("Maximum points for this criterion"),
  description: z.string().describe("What reviewers look for"),
  weight_pct: z.number().nullable().describe("Percentage weight if different from points"),
});

export const EligibilityRequirementSchema = z.object({
  requirement: z.string().describe("The eligibility requirement"),
  type: z.enum([
    "entity_type", "geographic", "budget", "years_operating",
    "registration", "matching_funds", "prior_experience", "other"
  ]),
  is_hard_requirement: z.boolean().describe("true = disqualifying if not met"),
  details: z.string().nullable(),
});

export const RfpParseOutputSchema = z.object({
  grant_title: z.string(),
  funder_name: z.string(),
  opportunity_number: z.string().nullable(),
  deadline: z.string().nullable().describe("ISO date string or null"),
  total_funding_available: z.number().nullable(),
  award_range_min: z.number().nullable(),
  award_range_max: z.number().nullable(),
  estimated_awards: z.number().nullable(),
  cost_sharing_required: z.boolean(),
  cost_sharing_pct: z.number().nullable(),
  grant_type: z.enum(["federal", "state", "foundation", "corporate", "other"]),
  required_sections: z.array(RfpSectionSchema).min(1),
  scoring_criteria: z.array(ScoringCriterionSchema),
  eligibility_requirements: z.array(EligibilityRequirementSchema),
  key_themes: z.array(z.string()).describe("Top 5-10 priority themes/keywords from the RFP"),
  submission_format: z.object({
    method: z.enum(["grants_gov", "email", "portal", "mail", "other"]),
    details: z.string().nullable(),
  }),
  important_dates: z.array(z.object({
    event: z.string(),
    date: z.string(),
  })),
  summary: z.string().describe("2-3 sentence plain-English summary of the opportunity"),
});

export type RfpParseOutput = z.infer<typeof RfpParseOutputSchema>;

// ============================================================
// Funder Analyzer Output Schema
// ============================================================

export const FunderAnalysisOutputSchema = z.object({
  funder_name: z.string(),
  funder_type: z.enum(["federal", "state", "foundation", "corporate", "community"]),
  mission_alignment_notes: z.string().describe("How the funder's priorities align with the applicant org"),
  giving_trends: z.object({
    direction: z.enum(["increasing", "stable", "decreasing", "unknown"]),
    total_annual_giving: z.number().nullable(),
    avg_award_size: z.number().nullable(),
    typical_range: z.object({
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
  }),
  stated_priorities: z.array(z.string()).describe("Current stated funding priorities"),
  geographic_focus: z.array(z.string()).describe("Geographic areas the funder prioritizes"),
  past_award_patterns: z.object({
    favors_new_applicants: z.boolean().nullable(),
    typical_org_size: z.enum(["small", "medium", "large", "any"]).nullable(),
    repeat_funding_common: z.boolean().nullable(),
    avg_grant_duration_years: z.number().nullable(),
  }),
  language_preferences: z.array(z.string()).describe("Key phrases/language the funder uses repeatedly"),
  red_flags: z.array(z.string()).describe("Things this funder does NOT fund or dislikes"),
  writing_recommendations: z.array(z.string()).describe("Specific writing tips based on funder analysis"),
  alignment_score: z.number().min(1).max(100).describe("1-100 alignment between org and funder"),
});

export type FunderAnalysisOutput = z.infer<typeof FunderAnalysisOutputSchema>;

// ============================================================
// Draft Section Schema (per-section output)
// ============================================================

export const DraftSectionOutputSchema = z.object({
  section_name: z.string(),
  section_type: z.enum([
    "project_narrative", "needs_assessment", "goals_objectives",
    "methods_approach", "evaluation_plan", "organizational_capacity",
    "budget_narrative", "budget_table", "logic_model",
    "timeline", "sustainability_plan", "abstract",
    "dei_statement", "letters_of_support_guidance", "other"
  ]),
  content: z.string().describe("The full section text"),
  word_count: z.number(),
  page_estimate: z.number().describe("Estimated pages at 12pt, 1-inch margins, single-spaced"),
  within_limits: z.boolean().describe("Whether this section is within the RFP's stated limits"),
  key_themes_addressed: z.array(z.string()).describe("Which RFP themes this section addresses"),
  scoring_criteria_addressed: z.array(z.string()).describe("Which scoring criteria this section targets"),
  confidence_score: z.number().min(1).max(10).describe("AI self-assessed quality 1-10"),
  notes: z.string().nullable().describe("Any caveats or areas needing human input"),
});

export type DraftSectionOutput = z.infer<typeof DraftSectionOutputSchema>;

// ============================================================
// Budget Table Schema
// ============================================================

export const BudgetLineItemSchema = z.object({
  category: z.enum([
    "personnel", "fringe_benefits", "travel", "equipment",
    "supplies", "contractual", "construction", "other",
    "indirect_costs"
  ]),
  description: z.string(),
  quantity: z.number().nullable(),
  unit_cost: z.number().nullable(),
  grant_funded: z.number().describe("Amount requested from this grant"),
  cost_share: z.number().describe("Cost share / match amount"),
  total: z.number().describe("grant_funded + cost_share"),
  justification: z.string().describe("1-2 sentence justification for this line"),
});

export const BudgetTableOutputSchema = z.object({
  line_items: z.array(BudgetLineItemSchema).min(1),
  total_grant_request: z.number(),
  total_cost_share: z.number(),
  total_project_cost: z.number(),
  indirect_cost_rate: z.number().nullable().describe("Indirect cost rate percentage if applicable"),
  budget_period: z.string().describe("e.g., '12 months' or 'Year 1: Oct 2026 - Sep 2027'"),
  math_valid: z.boolean().describe("Whether all totals add up correctly"),
});

export type BudgetTableOutput = z.infer<typeof BudgetTableOutputSchema>;

// ============================================================
// Coherence Check Output Schema
// ============================================================

export const CoherenceCheckOutputSchema = z.object({
  overall_coherent: z.boolean(),
  overall_score: z.number().min(1).max(10),
  checks: z.array(z.object({
    check_type: z.enum([
      "budget_narrative_alignment", "goals_methods_alignment",
      "goals_evaluation_alignment", "timeline_feasibility",
      "internal_consistency", "rfp_requirement_coverage",
      "scoring_criteria_coverage", "page_limit_compliance",
      "word_limit_compliance", "theme_coverage"
    ]),
    passed: z.boolean(),
    severity: z.enum(["critical", "major", "minor", "info"]),
    finding: z.string().describe("What was found"),
    recommendation: z.string().describe("How to fix it"),
    affected_sections: z.array(z.string()),
  })),
  rfp_coverage: z.object({
    required_sections_present: z.array(z.string()),
    required_sections_missing: z.array(z.string()),
    scoring_criteria_addressed: z.array(z.string()),
    scoring_criteria_weak: z.array(z.string()),
    scoring_criteria_missing: z.array(z.string()),
  }),
  summary: z.string().describe("2-3 sentence overall assessment"),
});

export type CoherenceCheckOutput = z.infer<typeof CoherenceCheckOutputSchema>;

// ============================================================
// AI Auditor Output Schema
// ============================================================

export const AuditDimensionSchema = z.object({
  dimension: z.enum([
    "need_statement", "goals_objectives", "methods_approach",
    "evaluation_plan", "budget_justification", "organizational_capacity"
  ]),
  score: z.number().min(1).max(10),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  improvements: z.array(z.object({
    section: z.string(),
    issue: z.string(),
    before_text: z.string().describe("Current problematic text (exact quote)"),
    after_text: z.string().describe("Suggested replacement text"),
    impact: z.enum(["high", "medium", "low"]),
    rationale: z.string(),
  })),
});

export const AuditOutputSchema = z.object({
  overall_score: z.number().min(1).max(100).describe("Weighted sum across 6 dimensions"),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  dimensions: z.array(AuditDimensionSchema).length(6),
  top_strengths: z.array(z.string()).min(1).max(5),
  critical_weaknesses: z.array(z.string()).max(5),
  win_probability_estimate: z.number().min(0).max(100),
  executive_summary: z.string().describe("3-5 sentence summary a grant manager would understand"),
  ranked_improvements: z.array(z.object({
    rank: z.number(),
    section: z.string(),
    improvement: z.string(),
    expected_score_impact: z.number().describe("Estimated points gained"),
  })).describe("All improvements ranked by expected score impact, highest first"),
});

export type AuditOutput = z.infer<typeof AuditOutputSchema>;

// ============================================================
// Review Simulation Output Schema
// ============================================================

export const ReviewerPersonaSchema = z.object({
  persona: z.enum(["technical_expert", "program_officer", "community_advocate"]),
  persona_description: z.string(),
  scores: z.record(z.string(), z.number()).describe("Criterion name -> score using funder's criteria"),
  total_score: z.number(),
  max_possible_score: z.number(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  narrative_feedback: z.string().describe("2-3 paragraph written review as this persona would write it"),
  recommendation: z.enum(["fund", "fund_with_conditions", "do_not_fund"]),
});

export const ReviewSimulationOutputSchema = z.object({
  reviewers: z.array(ReviewerPersonaSchema).length(3),
  consensus_score: z.number(),
  consensus_max: z.number(),
  consensus_pct: z.number().describe("consensus_score / consensus_max * 100"),
  consensus_recommendation: z.enum(["fund", "fund_with_conditions", "do_not_fund"]),
  score_variance: z.number().describe("Standard deviation across reviewer total scores"),
  ranked_revisions: z.array(z.object({
    rank: z.number(),
    section: z.string(),
    issue: z.string(),
    suggested_fix: z.string(),
    reviewers_who_flagged: z.array(z.string()),
    expected_score_impact: z.number(),
  })).describe("Revisions ranked by expected score impact"),
  panel_discussion_summary: z.string().describe("Simulated discussion summary highlighting disagreements"),
});

export type ReviewSimulationOutput = z.infer<typeof ReviewSimulationOutputSchema>;

// ============================================================
// Compliance Sentinel Output Schema
// ============================================================

export const ComplianceFindingSchema = z.object({
  check_id: z.string(),
  pass_type: z.enum(["deterministic", "semantic"]),
  category: z.enum([
    "word_count", "page_count", "required_section", "budget_math",
    "certification", "formatting", "eligibility", "content_quality",
    "data_recency", "measurable_outcomes", "logic_model_consistency",
    "timeline_completeness"
  ]),
  passed: z.boolean(),
  severity: z.enum(["blocker", "critical", "warning", "info"]),
  finding: z.string(),
  details: z.string().nullable(),
  auto_fixable: z.boolean(),
  fix_suggestion: z.string().nullable(),
});

export const ComplianceOutputSchema = z.object({
  overall_pass: z.boolean().describe("true only if zero blockers and zero criticals"),
  submission_ready: z.boolean().describe("true only if overall_pass AND zero warnings"),
  blocker_count: z.number(),
  critical_count: z.number(),
  warning_count: z.number(),
  info_count: z.number(),
  findings: z.array(ComplianceFindingSchema),
  deterministic_pass: z.object({
    all_passed: z.boolean(),
    checks_run: z.number(),
    checks_failed: z.number(),
  }),
  semantic_pass: z.object({
    all_passed: z.boolean(),
    checks_run: z.number(),
    checks_failed: z.number(),
  }),
  summary: z.string(),
});

export type ComplianceOutput = z.infer<typeof ComplianceOutputSchema>;

// ============================================================
// Narrative Memory — Segment Extraction Schema
// ============================================================

export const ExtractedSegmentSchema = z.object({
  segment_type: z.enum([
    "mission_statement", "needs_assessment", "methodology",
    "evaluation_plan", "organizational_capacity",
    "budget_justification", "dei_statement"
  ]),
  text: z.string(),
  quality_score: z.number().min(1).max(10).describe("AI-assessed quality of this segment"),
  tags: z.array(z.string()).describe("Topic tags for retrieval (e.g., 'youth', 'mental_health', 'rural')"),
});

export const NarrativeExtractionOutputSchema = z.object({
  segments: z.array(ExtractedSegmentSchema),
  grant_outcome: z.enum(["pending", "won", "lost"]).nullable(),
});

export type NarrativeExtractionOutput = z.infer<typeof NarrativeExtractionOutputSchema>;
