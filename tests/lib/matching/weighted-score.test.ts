import { describe, it, expect } from "vitest";
import { computeWeightedScore } from "@/lib/matching/weighted-score";

const baseGrant = {
  similarity: 0.7,
  eligibility_types: ["any"],
  states: [],
  source_type: "federal",
  category: null,
  requires_sam: false,
  amount_min: null,
  amount_max: null,
  eligible_naics: null,
  required_certification: null,
  target_beneficiaries: null,
  deadline: null,
  project_keywords: null,
};

const baseOrg = {
  entity_type: "llc",
  state: "FL",
  industry: "it_services",
  sam_registration_status: null as string | null,
  funding_amount_min: null as number | null,
  funding_amount_max: null as number | null,
  naics_primary: null as string | null,
  federal_certifications: [] as string[],
  target_beneficiaries: [] as string[],
  geographic_areas_served: [] as string[],
  ownership_demographics: [] as string[],
  project_description: null as string | null,
};

describe("computeWeightedScore", () => {
  it("returns a score between 0 and 100", () => {
    const result = computeWeightedScore(baseGrant, baseOrg);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("includes all 5 score components", () => {
    const result = computeWeightedScore(baseGrant, baseOrg);
    expect(result).toHaveProperty("similarity_score");
    expect(result).toHaveProperty("eligibility_score");
    expect(result).toHaveProperty("location_score");
    expect(result).toHaveProperty("fit_score");
    expect(result).toHaveProperty("timing_score");
  });

  it("similarity_score is similarity * 100", () => {
    const result = computeWeightedScore({ ...baseGrant, similarity: 0.85 }, baseOrg);
    expect(result.similarity_score).toBe(85);
  });

  it("boosts eligibility when entity type matches", () => {
    const withMatch = computeWeightedScore(
      { ...baseGrant, eligibility_types: ["for_profit"] },
      { ...baseOrg, entity_type: "llc" }
    );
    const withMismatch = computeWeightedScore(
      { ...baseGrant, eligibility_types: ["nonprofit_501c3"] },
      { ...baseOrg, entity_type: "llc" }
    );
    expect(withMatch.eligibility_score).toBeGreaterThan(withMismatch.eligibility_score);
  });

  it("location_score is 100 for state match", () => {
    const result = computeWeightedScore(
      { ...baseGrant, states: ["FL", "GA"] },
      { ...baseOrg, state: "FL" }
    );
    expect(result.location_score).toBe(100);
  });

  it("location_score is 10 for state mismatch", () => {
    const result = computeWeightedScore(
      { ...baseGrant, states: ["CA", "NY"] },
      { ...baseOrg, state: "FL" }
    );
    expect(result.location_score).toBe(10);
  });

  it("location_score is 70 for national grants", () => {
    const result = computeWeightedScore(
      { ...baseGrant, states: ["national"] },
      baseOrg
    );
    expect(result.location_score).toBe(70);
  });

  it("boosts fit_score for NAICS match", () => {
    const withNaics = computeWeightedScore(
      { ...baseGrant, eligible_naics: ["541511"] },
      { ...baseOrg, naics_primary: "541511" }
    );
    const withoutNaics = computeWeightedScore(baseGrant, baseOrg);
    expect(withNaics.fit_score).toBeGreaterThan(withoutNaics.fit_score);
  });

  it("boosts fit_score for certification match", () => {
    const result = computeWeightedScore(
      { ...baseGrant, required_certification: "wosb" },
      { ...baseOrg, federal_certifications: ["wosb", "mbe"] }
    );
    expect(result.fit_score).toBeGreaterThan(50);
  });

  it("boosts fit_score for beneficiary overlap", () => {
    const result = computeWeightedScore(
      { ...baseGrant, target_beneficiaries: ["veterans", "low_income"] },
      { ...baseOrg, target_beneficiaries: ["veterans"] }
    );
    expect(result.fit_score).toBeGreaterThan(50);
  });

  it("timing_score is 100 for deadline in 7 days", () => {
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = computeWeightedScore(
      { ...baseGrant, deadline: soon },
      baseOrg
    );
    expect(result.timing_score).toBe(100);
  });

  it("timing_score is 30 for deadline in 200 days", () => {
    const far = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString();
    const result = computeWeightedScore(
      { ...baseGrant, deadline: far },
      baseOrg
    );
    expect(result.timing_score).toBe(30);
  });

  it("timing_score is 50 for no deadline (rolling)", () => {
    const result = computeWeightedScore(
      { ...baseGrant, deadline: null },
      baseOrg
    );
    expect(result.timing_score).toBe(50);
  });

  it("boosts eligibility for ownership demographics match", () => {
    // "any" gives base eligibility of 80; demographics bonus adds +15 = 95
    const withDemo = computeWeightedScore(
      { ...baseGrant, eligibility_types: ["any", "wosb"] },
      { ...baseOrg, ownership_demographics: ["woman_owned"] }
    );
    const withoutDemo = computeWeightedScore(
      { ...baseGrant, eligibility_types: ["any"] },
      { ...baseOrg, ownership_demographics: [] }
    );
    expect(withDemo.eligibility_score).toBeGreaterThan(withoutDemo.eligibility_score);
  });

  it("keyword match boosts fit_score", () => {
    const result = computeWeightedScore(
      { ...baseGrant, project_keywords: ["workforce training", "job placement"] },
      { ...baseOrg, project_description: "We provide workforce training and job placement services" }
    );
    expect(result.fit_score).toBeGreaterThan(50);
  });

  it("weights sum to approximately 100%", () => {
    // 50 + 15 + 12 + 13 + 10 = 100
    const result = computeWeightedScore(
      { ...baseGrant, similarity: 1.0 },
      baseOrg
    );
    // With all max scores, total should be close to but not exceed 100
    expect(result.total).toBeLessThanOrEqual(100);
  });
});
