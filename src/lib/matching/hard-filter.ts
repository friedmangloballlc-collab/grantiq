export interface HardFilterInput {
  entity_type: string;
  state: string | null;
  annual_budget: number | null;
  has_501c3: boolean;
  has_sam_registration: boolean;
  has_audit: boolean;
  years_operating: number;
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
  [key: string]: unknown;
}

export function applyHardFilters(candidates: GrantCandidate[], org: HardFilterInput): GrantCandidate[] {
  const now = new Date();
  return candidates.filter((grant) => {
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
    return true;
  });
}
