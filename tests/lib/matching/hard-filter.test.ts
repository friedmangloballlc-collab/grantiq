import { describe, it, expect } from "vitest";
import { applyHardFilters } from "@/lib/matching/hard-filter";

describe("applyHardFilters", () => {
  const baseCandidate = {
    id: "grant-1", name: "Youth Education Grant", funder_name: "Ford Foundation",
    source_type: "foundation", eligibility_types: ["nonprofit_501c3"],
    states: ["GA", "national"], amount_min: 10000, amount_max: 50000,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "open", similarity: 0.85,
  };
  const baseOrg = {
    entity_type: "nonprofit_501c3", state: "GA", annual_budget: 500000,
    has_501c3: true, has_sam_registration: false, has_audit: true, years_operating: 5,
  };

  it("passes grants matching all criteria", () => {
    expect(applyHardFilters([baseCandidate], baseOrg)).toHaveLength(1);
  });
  it("filters wrong entity type", () => {
    expect(applyHardFilters([{ ...baseCandidate, eligibility_types: ["llc"] }], baseOrg)).toHaveLength(0);
  });
  it("filters wrong geography", () => {
    expect(applyHardFilters([{ ...baseCandidate, states: ["CA", "NY"] }], baseOrg)).toHaveLength(0);
  });
  it("passes empty geography (national)", () => {
    expect(applyHardFilters([{ ...baseCandidate, states: [] }], baseOrg)).toHaveLength(1);
  });
  it("filters past deadline", () => {
    expect(applyHardFilters([{ ...baseCandidate, deadline: new Date(Date.now() - 86400000).toISOString() }], baseOrg)).toHaveLength(0);
  });
  it("passes null deadline (rolling)", () => {
    expect(applyHardFilters([{ ...baseCandidate, deadline: null }], baseOrg)).toHaveLength(1);
  });
  it("filters closed grants", () => {
    expect(applyHardFilters([{ ...baseCandidate, status: "closed" }], baseOrg)).toHaveLength(0);
  });
});
