// grantiq/tests/lib/ai/writing/draft-generator.test.ts

import { describe, it, expect } from "vitest";
import { DraftSectionOutputSchema, BudgetTableOutputSchema } from "@/lib/ai/writing/schemas";
import { classifySectionType } from "@/lib/ai/writing/draft-generator";

// ============================================================
// classifySectionType
// ============================================================

describe("classifySectionType", () => {
  it("maps 'Project Narrative' to project_narrative", () => {
    expect(classifySectionType("Project Narrative")).toBe("project_narrative");
  });

  it("maps 'Needs Assessment' to needs_assessment", () => {
    expect(classifySectionType("Needs Assessment")).toBe("needs_assessment");
  });

  it("maps 'Statement of Need' to needs_assessment", () => {
    expect(classifySectionType("Statement of Need")).toBe("needs_assessment");
  });

  it("maps 'Goals and Objectives' to goals_objectives", () => {
    expect(classifySectionType("Goals and Objectives")).toBe("goals_objectives");
  });

  it("maps 'Evaluation Plan' to evaluation_plan", () => {
    expect(classifySectionType("Evaluation Plan")).toBe("evaluation_plan");
  });

  it("maps 'Budget Narrative' to budget_narrative", () => {
    expect(classifySectionType("Budget Narrative")).toBe("budget_narrative");
  });

  it("maps 'Budget' to budget_table", () => {
    expect(classifySectionType("Budget")).toBe("budget_table");
  });

  it("maps 'Project Abstract' to abstract", () => {
    expect(classifySectionType("Project Abstract")).toBe("abstract");
  });

  it("maps 'Sustainability Plan' to sustainability_plan", () => {
    expect(classifySectionType("Sustainability Plan")).toBe("sustainability_plan");
  });

  it("maps unknown section name to other", () => {
    expect(classifySectionType("Certifications and Assurances")).toBe("other");
  });

  it("is case-insensitive", () => {
    expect(classifySectionType("PROJECT NARRATIVE")).toBe("project_narrative");
    expect(classifySectionType("evaluation")).toBe("evaluation_plan");
  });
});

// ============================================================
// DraftSectionOutputSchema (Claude response validation)
// ============================================================

describe("Draft Generator — DraftSectionOutput schema", () => {
  it("validates a realistic Claude section output", () => {
    const mockSection = {
      section_name: "Project Narrative",
      section_type: "project_narrative",
      content: `## Need for the Project

Rural Georgia faces a critical shortage of primary care providers, with [CITE: HRSA MUA designation data showing X% of counties lacking adequate provider ratios]. The lack of access to preventive care has resulted in disproportionately high rates of chronic disease, with diabetes prevalence 28% above the national average.

## Project Goals and Objectives

**Goal 1**: Train and deploy 25 Community Health Workers (CHWs) in medically underserved communities by project year 2.

*Objective 1.1*: Recruit and enroll 30 CHW trainees (allowing for 17% attrition) by Month 6 of Year 1.
*Objective 1.2*: Complete HRSA-aligned CHW Core Competency training for all enrolled trainees by Month 12.

## Methods and Approach

Our evidence-based CHW training program is modeled after the [CITE: name of evidence-based curriculum] curriculum, which has demonstrated a 40% improvement in chronic disease self-management outcomes in similar rural settings.`,
      word_count: 1850,
      page_estimate: 3.7,
      within_limits: true,
      key_themes_addressed: ["health equity", "community health workers", "workforce development", "underserved populations"],
      scoring_criteria_addressed: ["Need", "Response", "Evaluative Measures", "Organizational Capacity"],
      confidence_score: 7,
      notes: "Organization should insert actual HRSA MUA designation statistics and cite the specific CHW training curriculum name",
    };

    const result = DraftSectionOutputSchema.safeParse(mockSection);
    expect(result.success).toBe(true);
  });

  it("validates an abstract section output", () => {
    const abstract = {
      section_name: "Project Abstract",
      section_type: "abstract",
      content: "Healthy Communities Initiative (HCI) requests $350,000 from HRSA to train and deploy 25 Community Health Workers in rural Georgia's medically underserved areas. Over 36 months, HCI will establish a CHW training program, place workers in 8 rural counties, and serve 2,500 underserved residents with preventive care coordination. Expected outcomes include a 25% reduction in emergency department utilization and improved chronic disease management for enrolled participants.",
      word_count: 67,
      page_estimate: 0.2,
      within_limits: true,
      key_themes_addressed: ["community health workers", "workforce development", "underserved populations"],
      scoring_criteria_addressed: ["Need", "Response"],
      confidence_score: 9,
      notes: null,
    };

    const result = DraftSectionOutputSchema.safeParse(abstract);
    expect(result.success).toBe(true);
  });

  it("rejects section with confidence_score above 10", () => {
    const invalid = {
      section_name: "Test Section",
      section_type: "abstract",
      content: "Some content",
      word_count: 100,
      page_estimate: 0.2,
      within_limits: true,
      key_themes_addressed: [],
      scoring_criteria_addressed: [],
      confidence_score: 11,  // max(10) violated
      notes: null,
    };

    const result = DraftSectionOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects section with invalid section_type", () => {
    const invalid = {
      section_name: "Introduction",
      section_type: "introduction",  // not in enum
      content: "Content here",
      word_count: 200,
      page_estimate: 0.4,
      within_limits: true,
      key_themes_addressed: [],
      scoring_criteria_addressed: [],
      confidence_score: 7,
      notes: null,
    };

    const result = DraftSectionOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// BudgetTableOutputSchema (Claude budget response validation)
// ============================================================

describe("Draft Generator — BudgetTableOutput schema", () => {
  it("validates a realistic Claude budget output", () => {
    const mockBudget = {
      line_items: [
        {
          category: "personnel",
          description: "Project Director (1.0 FTE @ $65,000/year)",
          quantity: 1,
          unit_cost: 65000,
          grant_funded: 48750,
          cost_share: 16250,
          total: 65000,
          justification: "The Project Director will oversee all program activities, manage CHW recruitment and training, coordinate with community partners, and ensure reporting requirements are met. 0.75 FTE charged to grant; 0.25 FTE as organizational cost share.",
        },
        {
          category: "personnel",
          description: "CHW Training Coordinator (1.0 FTE @ $48,000/year)",
          quantity: 1,
          unit_cost: 48000,
          grant_funded: 48000,
          cost_share: 0,
          total: 48000,
          justification: "The Training Coordinator will develop and deliver the HRSA-aligned CHW Core Competency curriculum, assess trainee progress, and provide ongoing mentorship to deployed CHWs.",
        },
        {
          category: "fringe_benefits",
          description: "Fringe benefits @ 28% of personnel",
          quantity: null,
          unit_cost: null,
          grant_funded: 26810,
          cost_share: 4550,
          total: 31360,
          justification: "Fringe benefits include health insurance, retirement contributions (5% employer match), FICA, and workers compensation calculated at the organization's negotiated rate of 28%.",
        },
        {
          category: "travel",
          description: "Local mileage for CHW site visits (5 CHWs x 200 miles/month x 12 months @ $0.67/mile)",
          quantity: 12000,
          unit_cost: 0.67,
          grant_funded: 8040,
          cost_share: 0,
          total: 8040,
          justification: "CHWs require transportation to conduct home visits and accompany clients to medical appointments across rural service area counties. GSA reimbursement rate applied.",
        },
        {
          category: "supplies",
          description: "Training materials, laptops, and program supplies",
          quantity: null,
          unit_cost: null,
          grant_funded: 15000,
          cost_share: 0,
          total: 15000,
          justification: "Includes training manuals, curriculum materials, 5 laptops for CHW documentation, and office supplies for the training center. One-time costs in Year 1.",
        },
        {
          category: "indirect_costs",
          description: "Indirect costs @ 10% de minimis rate on modified total direct costs",
          quantity: null,
          unit_cost: null,
          grant_funded: 14660,
          cost_share: 0,
          total: 14660,
          justification: "Organization applies the 10% de minimis indirect cost rate per 2 CFR 200.414(f), as the organization does not have a negotiated indirect cost rate agreement.",
        },
      ],
      total_grant_request: 161260,
      total_cost_share: 20800,
      total_project_cost: 182060,
      indirect_cost_rate: 10,
      budget_period: "Year 1: October 1, 2026 - September 30, 2027",
      math_valid: true,
    };

    const result = BudgetTableOutputSchema.safeParse(mockBudget);
    expect(result.success).toBe(true);
  });

  it("rejects a budget with empty line_items array", () => {
    const invalid = {
      line_items: [],
      total_grant_request: 0,
      total_cost_share: 0,
      total_project_cost: 0,
      indirect_cost_rate: null,
      budget_period: "12 months",
      math_valid: true,
    };

    const result = BudgetTableOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a budget line with invalid category", () => {
    const invalid = {
      line_items: [{
        category: "administrative",  // not in enum
        description: "Admin costs",
        quantity: null,
        unit_cost: null,
        grant_funded: 5000,
        cost_share: 0,
        total: 5000,
        justification: "Admin overhead",
      }],
      total_grant_request: 5000,
      total_cost_share: 0,
      total_project_cost: 5000,
      indirect_cost_rate: null,
      budget_period: "12 months",
      math_valid: true,
    };

    const result = BudgetTableOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
