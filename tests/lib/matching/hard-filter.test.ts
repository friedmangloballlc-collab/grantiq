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
    naics_primary: null as string | null, funding_amount_min: null as number | null,
    funding_amount_max: null as number | null, sam_registration_status: null as string | null,
    federal_certifications: [] as string[], match_funds_capacity: null as string | null,
    past_federal_funding_level: null as string | null,
    audited_financials: false,
    technology_readiness_level: null as number | null,
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

  // ── New grant matching field filters ────────────────────────────────

  it("filters NAICS mismatch when both grant and org have NAICS", () => {
    const grant = { ...baseCandidate, eligible_naics: ["541511", "541512"] };
    const org = { ...baseOrg, naics_primary: "111111" };
    expect(applyHardFilters([grant], org)).toHaveLength(0);
  });
  it("passes NAICS match", () => {
    const grant = { ...baseCandidate, eligible_naics: ["541511", "541512"] };
    const org = { ...baseOrg, naics_primary: "541511" };
    expect(applyHardFilters([grant], org)).toHaveLength(1);
  });
  it("passes when org has no NAICS (unknown — don't filter)", () => {
    const grant = { ...baseCandidate, eligible_naics: ["541511"] };
    expect(applyHardFilters([grant], baseOrg)).toHaveLength(1);
  });

  it("filters when grant min_award exceeds org funding_amount_max", () => {
    const grant = { ...baseCandidate, amount_min: 500000 };
    const org = { ...baseOrg, funding_amount_max: 100000 };
    expect(applyHardFilters([grant], org)).toHaveLength(0);
  });
  it("filters when grant max_award is below org funding_amount_min", () => {
    const grant = { ...baseCandidate, amount_max: 10000 };
    const org = { ...baseOrg, funding_amount_min: 50000 };
    expect(applyHardFilters([grant], org)).toHaveLength(0);
  });
  it("passes funding range when org hasn't answered", () => {
    const grant = { ...baseCandidate, amount_min: 500000 };
    expect(applyHardFilters([grant], baseOrg)).toHaveLength(1);
  });

  it("filters SAM-required grant when org is not registered", () => {
    const grant = { ...baseCandidate, requires_sam: true };
    const org = { ...baseOrg, sam_registration_status: "not_started" };
    expect(applyHardFilters([grant], org)).toHaveLength(0);
  });
  it("passes SAM-required grant when org is registered", () => {
    const grant = { ...baseCandidate, requires_sam: true };
    const org = { ...baseOrg, sam_registration_status: "registered" };
    expect(applyHardFilters([grant], org)).toHaveLength(1);
  });
  it("passes SAM-required grant when org hasn't answered", () => {
    const grant = { ...baseCandidate, requires_sam: true };
    expect(applyHardFilters([grant], baseOrg)).toHaveLength(1);
  });

  it("filters certification mismatch", () => {
    const grant = { ...baseCandidate, required_certification: "wosb" };
    const org = { ...baseOrg, federal_certifications: ["sba_8a", "hubzone"] };
    expect(applyHardFilters([grant], org)).toHaveLength(0);
  });
  it("passes certification match", () => {
    const grant = { ...baseCandidate, required_certification: "wosb" };
    const org = { ...baseOrg, federal_certifications: ["wosb", "mbe"] };
    expect(applyHardFilters([grant], org)).toHaveLength(1);
  });
  it("passes certification-required grant when org has no certs (unknown)", () => {
    const grant = { ...baseCandidate, required_certification: "wosb" };
    expect(applyHardFilters([grant], baseOrg)).toHaveLength(1);
  });

  it("filters match funds capacity below requirement", () => {
    const grant = { ...baseCandidate, match_required_pct: 25 };
    const org = { ...baseOrg, match_funds_capacity: "up_to_10" };
    expect(applyHardFilters([grant], org)).toHaveLength(0);
  });
  it("passes match funds capacity meeting requirement", () => {
    const grant = { ...baseCandidate, match_required_pct: 25 };
    const org = { ...baseOrg, match_funds_capacity: "up_to_50" };
    expect(applyHardFilters([grant], org)).toHaveLength(1);
  });
  it("passes match funds when org hasn't answered", () => {
    const grant = { ...baseCandidate, match_required_pct: 25 };
    expect(applyHardFilters([grant], baseOrg)).toHaveLength(1);
  });

  // ── TRL filters ─────────────────────────────────────────────────────

  it("filters TRL below minimum requirement", () => {
    const grant = { ...baseCandidate, required_trl_min: 6 };
    const org = { ...baseOrg, technology_readiness_level: 4 };
    expect(applyHardFilters([grant], org)).toHaveLength(0);
  });
  it("passes TRL meeting requirement", () => {
    const grant = { ...baseCandidate, required_trl_min: 6 };
    const org = { ...baseOrg, technology_readiness_level: 7 };
    expect(applyHardFilters([grant], org)).toHaveLength(1);
  });
  it("passes TRL when org hasn't answered", () => {
    const grant = { ...baseCandidate, required_trl_min: 6 };
    expect(applyHardFilters([grant], baseOrg)).toHaveLength(1);
  });

  // ── Audited financials filters ──────────────────────────────────────

  it("filters when grant requires audit but org doesn't have one", () => {
    const grant = { ...baseCandidate, requires_audited_financials: true };
    const org = { ...baseOrg, audited_financials: false };
    expect(applyHardFilters([grant], org)).toHaveLength(0);
  });
  it("passes when grant requires audit and org has one", () => {
    const grant = { ...baseCandidate, requires_audited_financials: true };
    const org = { ...baseOrg, audited_financials: true };
    expect(applyHardFilters([grant], org)).toHaveLength(1);
  });

  // ── Federal experience filters ──────────────────────────────────────

  it("filters when grant requires federal experience org doesn't have", () => {
    const grant = { ...baseCandidate, required_federal_experience: "100k_500k" };
    const org = { ...baseOrg, past_federal_funding_level: "none" };
    expect(applyHardFilters([grant], org)).toHaveLength(0);
  });
  it("passes when org meets federal experience requirement", () => {
    const grant = { ...baseCandidate, required_federal_experience: "100k_500k" };
    const org = { ...baseOrg, past_federal_funding_level: "500k_1m" };
    expect(applyHardFilters([grant], org)).toHaveLength(1);
  });
  it("passes federal experience when org hasn't answered", () => {
    const grant = { ...baseCandidate, required_federal_experience: "100k_500k" };
    expect(applyHardFilters([grant], baseOrg)).toHaveLength(1);
  });
});
