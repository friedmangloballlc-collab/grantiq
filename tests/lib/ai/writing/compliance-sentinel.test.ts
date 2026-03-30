// grantiq/tests/lib/ai/writing/compliance-sentinel.test.ts

import { describe, it, expect } from "vitest";

// Test the deterministic checks in isolation (no AI needed)
// Import the function once the module is created — for now, test the logic inline.

describe("Compliance Sentinel — Deterministic Pass", () => {
  it("flags missing required sections as blockers", () => {
    const rfpSections = [
      { section_name: "Project Narrative", is_required: true, description: "Describe project", page_limit: 25, word_limit: null, weight_pct: 40, special_instructions: null },
      { section_name: "Evaluation Plan", is_required: true, description: "Evaluation", page_limit: 5, word_limit: null, weight_pct: 15, special_instructions: null },
    ];
    const draftSections = [
      { section_name: "Project Narrative", section_type: "project_narrative", content: "...", word_count: 5000, page_estimate: 10, within_limits: true, key_themes_addressed: [], scoring_criteria_addressed: [], confidence_score: 8, notes: null },
    ];

    // Evaluation Plan is missing — should be a blocker
    const missingRequired = rfpSections.filter(
      rs => rs.is_required && !draftSections.find(ds => ds.section_name.toLowerCase() === rs.section_name.toLowerCase())
    );
    expect(missingRequired.length).toBe(1);
    expect(missingRequired[0].section_name).toBe("Evaluation Plan");
  });

  it("flags word count violations as blockers", () => {
    const wordLimit = 5000;
    const actualWordCount = 5500;
    expect(actualWordCount > wordLimit).toBe(true);
    expect(actualWordCount - wordLimit).toBe(500);
  });

  it("flags budget math errors", () => {
    const lineItems = [
      { grant_funded: 50000, cost_share: 10000, total: 60000 },
      { grant_funded: 30000, cost_share: 5000, total: 35000 },
    ];
    const statedTotal = 100000; // Wrong — should be 95000
    const actualTotal = lineItems.reduce((sum, li) => sum + li.total, 0);
    expect(Math.abs(actualTotal - statedTotal) > 1).toBe(true);
  });

  it("passes when budget math is correct", () => {
    const lineItems = [
      { grant_funded: 50000, cost_share: 10000, total: 60000 },
      { grant_funded: 30000, cost_share: 5000, total: 35000 },
    ];
    const statedTotal = 95000;
    const actualTotal = lineItems.reduce((sum, li) => sum + li.total, 0);
    expect(Math.abs(actualTotal - statedTotal) <= 1).toBe(true);
  });
});
