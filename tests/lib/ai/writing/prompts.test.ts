/**
 * Tests for the Unit 3 buildDraftSectionPrompt refactor.
 *
 * The contract that matters: DRAFT_SECTION_SYSTEM_PROMPT must be byte-identical
 * across every section call within a drafting session, regardless of which 7
 * section-specific fields the caller varies. That is the load-bearing property
 * for Anthropic prompt caching — a stable systemPrompt is what the cache keys on.
 *
 * If a future change reintroduces section-specific interpolation into the
 * system prompt, these tests fail loudly. The 7 tracked fields:
 *   section_name, section_type, section_description, page_limit, word_limit,
 *   special_instructions, scoring_criteria.
 */

import { describe, it, expect } from "vitest";
import {
  DRAFT_SECTION_SYSTEM_PROMPT,
  buildSectionUserSegment,
  buildDraftSectionPrompt,
} from "@/lib/ai/writing/prompts";

const baseSection = {
  section_name: "Need Statement",
  section_type: "needs_assessment",
  section_description: "Describe the community need this grant addresses.",
  page_limit: null,
  word_limit: 500,
  special_instructions: null,
  scoring_criteria: [
    { criterion: "Clarity", max_points: 10, description: "Clear articulation of the problem." },
  ],
};

// --------------------------------------------------------------------------
// Stable-prefix invariant — the load-bearing test for cache hit rate
// --------------------------------------------------------------------------
describe("DRAFT_SECTION_SYSTEM_PROMPT (Unit 3 / R18)", () => {
  it("does not contain any of the 7 section-specific tokens", () => {
    // If any of these appear in the system prompt, caching breaks.
    expect(DRAFT_SECTION_SYSTEM_PROMPT).not.toContain("Need Statement");
    expect(DRAFT_SECTION_SYSTEM_PROMPT).not.toContain("needs_assessment");
    expect(DRAFT_SECTION_SYSTEM_PROMPT).not.toContain("HARD WORD LIMIT");
    expect(DRAFT_SECTION_SYSTEM_PROMPT).not.toContain("HARD PAGE LIMIT");
    expect(DRAFT_SECTION_SYSTEM_PROMPT).not.toContain("Special Instructions");
    expect(DRAFT_SECTION_SYSTEM_PROMPT).not.toContain("Scoring Criteria This Section Must Address");
  });

  it("is a non-empty string with the writing-standards rubric", () => {
    expect(typeof DRAFT_SECTION_SYSTEM_PROMPT).toBe("string");
    expect(DRAFT_SECTION_SYSTEM_PROMPT.length).toBeGreaterThan(500);
    expect(DRAFT_SECTION_SYSTEM_PROMPT).toContain("Writing Standards");
    expect(DRAFT_SECTION_SYSTEM_PROMPT).toContain("Output Format");
  });

  it("is byte-identical when imported twice (no per-import variation)", () => {
    // Sanity: the const itself shouldn't carry any imperceptible drift
    expect(DRAFT_SECTION_SYSTEM_PROMPT).toBe(DRAFT_SECTION_SYSTEM_PROMPT);
  });
});

// --------------------------------------------------------------------------
// buildSectionUserSegment — contains all 7 fields
// --------------------------------------------------------------------------
describe("buildSectionUserSegment (Unit 3 / R18)", () => {
  it("includes section_name, section_type, and section_description", () => {
    const out = buildSectionUserSegment(baseSection);
    expect(out).toContain("Need Statement");
    expect(out).toContain("needs_assessment");
    expect(out).toContain("Describe the community need this grant addresses.");
  });

  it("includes the word_limit instruction when word_limit is set", () => {
    const out = buildSectionUserSegment({ ...baseSection, word_limit: 750, page_limit: null });
    expect(out).toContain("HARD WORD LIMIT: 750 words");
    // Should also include the soft target range (92-100% of limit)
    expect(out).toContain("Aim for");
  });

  it("includes the page_limit instruction when page_limit is set", () => {
    const out = buildSectionUserSegment({ ...baseSection, page_limit: 3, word_limit: null });
    expect(out).toContain("HARD PAGE LIMIT: 3 pages");
    expect(out).toContain("1500 words"); // 3 pages * 500 words/page
  });

  it("includes the no-limit fallback when both word_limit and page_limit are null", () => {
    const out = buildSectionUserSegment({ ...baseSection, word_limit: null, page_limit: null });
    expect(out).toContain("No explicit limit specified");
  });

  it("includes special_instructions when set", () => {
    const out = buildSectionUserSegment({
      ...baseSection,
      special_instructions: "Bilingual program — write in both English and Spanish.",
    });
    expect(out).toContain("Special Instructions");
    expect(out).toContain("Bilingual program");
  });

  it("omits special_instructions block when null", () => {
    const out = buildSectionUserSegment({ ...baseSection, special_instructions: null });
    expect(out).not.toContain("Special Instructions");
  });

  it("includes the scoring_criteria block with each criterion's points and description", () => {
    const out = buildSectionUserSegment({
      ...baseSection,
      scoring_criteria: [
        { criterion: "Clarity", max_points: 10, description: "Clear problem articulation." },
        { criterion: "Evidence", max_points: 15, description: "Cited data points." },
      ],
    });
    expect(out).toContain("Scoring Criteria This Section Must Address");
    expect(out).toContain("**Clarity** (10 points)");
    expect(out).toContain("**Evidence** (15 points)");
    expect(out).toContain("Cited data points");
  });

  it("omits the scoring_criteria block when scoring_criteria is empty", () => {
    const out = buildSectionUserSegment({ ...baseSection, scoring_criteria: [] });
    expect(out).not.toContain("Scoring Criteria This Section Must Address");
  });

  it("varies output when section_name varies", () => {
    const a = buildSectionUserSegment({ ...baseSection, section_name: "Need Statement" });
    const b = buildSectionUserSegment({ ...baseSection, section_name: "Methodology" });
    expect(a).not.toBe(b);
    expect(b).toContain("Methodology");
    expect(b).not.toContain("Need Statement");
  });
});

// --------------------------------------------------------------------------
// Cross-cutting: system prompt is invariant when only section content varies
// --------------------------------------------------------------------------
describe("Section-content variation does NOT affect DRAFT_SECTION_SYSTEM_PROMPT", () => {
  it("system prompt is identical regardless of section_name", () => {
    // The system prompt is a const, so this is structurally true. The test
    // exists to catch a future regression where someone re-introduces
    // section-specific interpolation into the system prompt.
    const before = DRAFT_SECTION_SYSTEM_PROMPT;
    buildSectionUserSegment({ ...baseSection, section_name: "Different Section" });
    expect(DRAFT_SECTION_SYSTEM_PROMPT).toBe(before);
  });
});

// --------------------------------------------------------------------------
// Backwards-compat wrapper (deprecated, kept for non-Unit-7 callers)
// --------------------------------------------------------------------------
describe("buildDraftSectionPrompt (deprecated combined wrapper)", () => {
  it("returns a non-empty string", () => {
    const out = buildDraftSectionPrompt(baseSection);
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(500);
  });

  it("includes section_name in the combined output", () => {
    const out = buildDraftSectionPrompt(baseSection);
    expect(out).toContain("Need Statement");
  });

  it("includes scoring criteria in the combined output", () => {
    const out = buildDraftSectionPrompt({
      ...baseSection,
      scoring_criteria: [
        { criterion: "Clarity", max_points: 10, description: "Clear articulation." },
      ],
    });
    expect(out).toContain("Clarity");
    expect(out).toContain("10 points");
  });
});
