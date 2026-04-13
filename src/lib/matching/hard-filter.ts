export interface HardFilterInput {
  entity_type: string;
  state: string | null;
  annual_budget: number | null;
  has_501c3: boolean;
  has_sam_registration: boolean;
  has_audit: boolean;
  years_operating: number;
  // New grant-matching fields
  naics_primary: string | null;
  funding_amount_min: number | null;
  funding_amount_max: number | null;
  sam_registration_status: string | null;
  federal_certifications: string[];
  match_funds_capacity: string | null;
  // Project fit fields
  past_federal_funding_level: string | null;
  audited_financials: boolean;
  audit_status: "has" | "could_obtain" | "cannot" | null;
  technology_readiness_level: number | null;
  // Industry/sector for relevance filtering
  industry: string | null;
}

interface GrantCandidate {
  id: string;
  name: string;
  funder_name: string;
  source_type: string;
  eligibility_types: string[];
  states: string[];
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  status: string;
  similarity: number;
  // New grant-side fields (optional — not all grants have these)
  eligible_naics?: string[] | null;
  requires_sam?: boolean | null;
  required_certification?: string | null;
  match_required_pct?: number | null;
  // Project fit fields
  required_trl_min?: number | null;
  requires_audited_financials?: boolean | null;
  required_federal_experience?: string | null;
  project_keywords?: string[] | null;
  category?: string | null;
  [key: string]: unknown;
}

export interface FilterResult {
  pass: boolean;
  reason?: string;
  detail?: string;
}

export interface FilterStats {
  passed: number;
  excluded: number;
  reasons: Record<string, number>;
}

const MATCH_CAPACITY_TO_PCT: Record<string, number> = {
  none: 0,
  up_to_10: 10,
  up_to_25: 25,
  up_to_50: 50,
  over_50: 100,
  unsure: 0,
};

const FED_LEVEL_ORDER: Record<string, number> = {
  none: 0, under_100k: 1, "100k_500k": 2, "500k_1m": 3, over_1m: 4,
};

/** Check a single grant against org context. Returns pass/fail with reason. */
export function checkGrant(grant: GrantCandidate, org: HardFilterInput): FilterResult {
  const now = new Date();

  // Entity type eligibility — check if org type is allowed
  if (grant.eligibility_types.length > 0 && !grant.eligibility_types.includes("any")) {
    // Check direct match first
    if (!grant.eligibility_types.includes(org.entity_type)) {
      // For-profit orgs (llc, corporation, sole_prop, partnership) can match "for_profit"
      const forProfitTypes = new Set(["llc", "corporation", "s_corp", "c_corp", "sole_prop", "sole_proprietorship", "partnership", "other"]);
      const isForProfit = forProfitTypes.has(org.entity_type);
      const grantAllowsForProfit = grant.eligibility_types.includes("for_profit");

      // Nonprofit orgs can match "nonprofit_other" or "nonprofit_501c3"
      const isNonprofit = org.entity_type.startsWith("nonprofit");
      const grantAllowsNonprofit = grant.eligibility_types.includes("nonprofit_501c3") || grant.eligibility_types.includes("nonprofit_other");

      if (isForProfit && !grantAllowsForProfit) {
        return { pass: false, reason: "not_for_profit_eligible", detail: "Grant is not open to for-profit businesses" };
      }
      if (isNonprofit && !grantAllowsNonprofit && !grant.eligibility_types.includes(org.entity_type)) {
        return { pass: false, reason: "entity_type_mismatch", detail: `Requires ${grant.eligibility_types.join("/")}` };
      }
      if (!isForProfit && !isNonprofit) {
        return { pass: false, reason: "entity_type_mismatch", detail: `Requires ${grant.eligibility_types.join("/")}` };
      }
    }
  }

  if (grant.states.length > 0 && org.state) {
    if (!grant.states.includes(org.state) && !grant.states.includes("national") && !grant.states.includes("all"))
      return { pass: false, reason: "state_mismatch", detail: `Grant: ${grant.states.join(",")}, org: ${org.state}` };
  }

  if (grant.status !== "open" && grant.status !== "forecasted")
    return { pass: false, reason: "not_open", detail: `Status: ${grant.status}` };

  if (grant.deadline && new Date(grant.deadline) < now)
    return { pass: false, reason: "expired", detail: `Deadline: ${grant.deadline}` };

  if (grant.amount_min && org.annual_budget && grant.amount_min > org.annual_budget * 5)
    return { pass: false, reason: "budget_mismatch", detail: `Min award $${grant.amount_min} vs budget $${org.annual_budget}` };

  // 501(c)(3) requirement: many foundation grants require it
  if (grant.eligibility_types.includes("nonprofit_501c3") && !org.has_501c3) {
    return { pass: false, reason: "no_501c3", detail: "Grant requires 501(c)(3) status" };
  }

  // Years operating: some grants require established orgs (3+ years)
  if (org.years_operating > 0 && org.years_operating < 1 && grant.source_type === "federal") {
    // Very new orgs (<1 year) are unlikely to win federal grants — soft signal, not hard block
    // Only block if grant explicitly requires experience (handled by federal_experience filter)
  }

  if (grant.eligible_naics?.length && org.naics_primary) {
    if (!grant.eligible_naics.includes(org.naics_primary))
      return { pass: false, reason: "naics_mismatch", detail: `Grant: ${grant.eligible_naics.join(",")}, org: ${org.naics_primary}` };
  }

  if (grant.amount_min != null && org.funding_amount_max != null) {
    if (grant.amount_min > org.funding_amount_max)
      return { pass: false, reason: "funding_range_mismatch", detail: `Min award $${grant.amount_min} > org max $${org.funding_amount_max}` };
  }

  if (grant.amount_max != null && org.funding_amount_min != null) {
    if (grant.amount_max < org.funding_amount_min)
      return { pass: false, reason: "funding_range_mismatch", detail: `Max award $${grant.amount_max} < org min $${org.funding_amount_min}` };
  }

  if (grant.requires_sam === true && org.sam_registration_status != null) {
    if (org.sam_registration_status !== "registered")
      return { pass: false, reason: "sam_not_registered", detail: `SAM status: ${org.sam_registration_status}` };
  }

  if (grant.required_certification && org.federal_certifications.length > 0) {
    if (!org.federal_certifications.includes(grant.required_certification))
      return { pass: false, reason: "missing_certification", detail: `Requires: ${grant.required_certification}` };
  }

  if (grant.match_required_pct != null && grant.match_required_pct > 0 && org.match_funds_capacity != null) {
    const orgCapacity = MATCH_CAPACITY_TO_PCT[org.match_funds_capacity] ?? 0;
    if (orgCapacity < grant.match_required_pct)
      return { pass: false, reason: "match_funds_insufficient", detail: `Requires ${grant.match_required_pct}%, org: ${orgCapacity}%` };
  }

  if (grant.required_trl_min != null && org.technology_readiness_level != null) {
    if (org.technology_readiness_level < grant.required_trl_min)
      return { pass: false, reason: "trl_too_low", detail: `Requires TRL ${grant.required_trl_min}+, org is ${org.technology_readiness_level}` };
  }

  if (grant.requires_audited_financials === true) {
    if (org.audit_status === "cannot")
      return { pass: false, reason: "cannot_audit", detail: "Grant requires audited financials, org has no audit capacity" };
    // 'has', 'could_obtain', and null all pass
  }

  if (grant.required_federal_experience && org.past_federal_funding_level != null) {
    const required = FED_LEVEL_ORDER[grant.required_federal_experience] ?? 0;
    const orgLevel = FED_LEVEL_ORDER[org.past_federal_funding_level] ?? 0;
    if (orgLevel < required)
      return { pass: false, reason: "insufficient_federal_experience", detail: `Requires ${grant.required_federal_experience}, org has ${org.past_federal_funding_level}` };
  }

  // Sector mismatch: exclude when grant has a specific sector AND org has an industry
  // that clearly doesn't match. Only for strong mismatches — if either is null/general, pass.
  if (grant.category && org.industry && grant.category !== "general") {
    const SECTOR_EXCLUSIONS: Record<string, Set<string>> = {
      agriculture: new Set(["computer_software", "computer_security", "it_services", "financial_services", "legal_services", "entertainment", "film", "music"]),
      health: new Set(["construction", "mining_metals", "oil_energy", "defense_space", "shipbuilding"]),
      arts_culture: new Set(["mining_metals", "oil_energy", "chemicals", "defense_space", "semiconductors"]),
      transportation: new Set(["performing_arts", "fine_art", "music", "film", "animation"]),
      energy: new Set(["performing_arts", "fine_art", "music", "film", "entertainment", "hospitality", "restaurants"]),
      veterans: new Set([]), // Veterans grants can apply to any industry
      education: new Set(["mining_metals", "oil_energy", "chemicals"]),
    };
    const excluded = SECTOR_EXCLUSIONS[grant.category];
    if (excluded?.has(org.industry)) {
      return { pass: false, reason: "sector_mismatch", detail: `Grant sector: ${grant.category}, org industry: ${org.industry}` };
    }
  }

  return { pass: true };
}

/** Apply hard filters to a list of candidates. Returns passing candidates + stats. */
export function applyHardFilters(
  candidates: GrantCandidate[],
  org: HardFilterInput
): GrantCandidate[] {
  return candidates.filter((grant) => checkGrant(grant, org).pass);
}

/** Apply hard filters with detailed stats for analytics. */
export function applyHardFiltersWithStats(
  candidates: GrantCandidate[],
  org: HardFilterInput
): { passed: GrantCandidate[]; stats: FilterStats } {
  const passed: GrantCandidate[] = [];
  const stats: FilterStats = { passed: 0, excluded: 0, reasons: {} };

  for (const grant of candidates) {
    const result = checkGrant(grant, org);
    if (result.pass) {
      passed.push(grant);
      stats.passed++;
    } else {
      stats.excluded++;
      if (result.reason) {
        stats.reasons[result.reason] = (stats.reasons[result.reason] ?? 0) + 1;
      }
    }
  }

  return { passed, stats };
}
