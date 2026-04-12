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
  technology_readiness_level: number | null;
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
  [key: string]: unknown;
}

const MATCH_CAPACITY_TO_PCT: Record<string, number> = {
  none: 0,
  up_to_10: 10,
  up_to_25: 25,
  up_to_50: 50,
  over_50: 100,
  unsure: 0,
};

export function applyHardFilters(candidates: GrantCandidate[], org: HardFilterInput): GrantCandidate[] {
  const now = new Date();
  return candidates.filter((grant) => {
    // ── Existing filters ────────────────────────────────────────────────
    if (grant.eligibility_types.length > 0 && !grant.eligibility_types.includes(org.entity_type) && !grant.eligibility_types.includes("any")) return false;
    if (grant.states.length > 0 && org.state) {
      const hasMatch = grant.states.includes(org.state) || grant.states.includes("national") || grant.states.includes("all");
      if (!hasMatch) return false;
    }
    if (grant.status !== "open" && grant.status !== "forecasted") return false;
    if (grant.deadline) {
      if (new Date(grant.deadline) < now) return false;
    }
    if (grant.amount_min && org.annual_budget && grant.amount_min > org.annual_budget * 10) return false;

    // ── New hard filters (only filter on definitive mismatches) ─────────

    // NAICS: if grant specifies eligible NAICS codes AND org has a NAICS, require match
    if (grant.eligible_naics?.length && org.naics_primary) {
      if (!grant.eligible_naics.includes(org.naics_primary)) return false;
    }

    // Funding range: if grant has min_award, org's max must be >= it (don't filter if org didn't answer)
    if (grant.amount_min != null && org.funding_amount_max != null) {
      if (grant.amount_min > org.funding_amount_max) return false;
    }

    // Funding range: if grant has max_award, org's min must be <= it
    if (grant.amount_max != null && org.funding_amount_min != null) {
      if (grant.amount_max < org.funding_amount_min) return false;
    }

    // SAM.gov: if grant requires SAM registration, org must be registered
    if (grant.requires_sam === true && org.sam_registration_status != null) {
      if (org.sam_registration_status !== "registered") return false;
    }

    // Federal certification: if grant requires a specific cert, org must have it
    if (grant.required_certification && org.federal_certifications.length > 0) {
      if (!org.federal_certifications.includes(grant.required_certification)) return false;
    }

    // Match funds: if grant requires matching funds, org must meet the threshold
    if (grant.match_required_pct != null && grant.match_required_pct > 0 && org.match_funds_capacity != null) {
      const orgCapacity = MATCH_CAPACITY_TO_PCT[org.match_funds_capacity] ?? 0;
      if (orgCapacity < grant.match_required_pct) return false;
    }

    // TRL: if grant requires minimum TRL, org must meet it (when org has answered)
    if (grant.required_trl_min != null && org.technology_readiness_level != null) {
      if (org.technology_readiness_level < grant.required_trl_min) return false;
    }

    // Audited financials: if grant requires them, org must have them
    if (grant.requires_audited_financials === true && org.audited_financials) {
      // org.audited_financials is true/false — only filter if org said no
    }
    if (grant.requires_audited_financials === true && org.audited_financials === false) {
      return false;
    }

    // Federal experience: if grant requires prior federal funding at a level, check org meets it
    if (grant.required_federal_experience && org.past_federal_funding_level != null) {
      const FED_LEVEL_ORDER: Record<string, number> = {
        none: 0, under_100k: 1, "100k_500k": 2, "500k_1m": 3, over_1m: 4,
      };
      const required = FED_LEVEL_ORDER[grant.required_federal_experience] ?? 0;
      const orgLevel = FED_LEVEL_ORDER[org.past_federal_funding_level] ?? 0;
      if (orgLevel < required) return false;
    }

    return true;
  });
}
