/**
 * Multi-facet embedding — generates separate text for different matching dimensions.
 *
 * Facet 1 (Purpose): What does the org want to do / what does the grant fund?
 *   - Org side: project_description, funding_use, mission goals, impact metrics
 *   - Grant side: description of funded activities, allowable costs, outcomes
 *
 * Facet 2 (Profile): What kind of org is this / what kind of org should apply?
 *   - Org side: entity_type, industry, NAICS, certifications, SAM, location, size
 *   - Grant side: eligibility types, required certs, states, NAICS codes, category
 *
 * The existing mission_embedding is a blend of both. Multi-facet separates them
 * so that a "what you want to do" match and a "who you are" match are scored independently.
 */

interface OrgData {
  name: string;
  entity_type: string;
  mission_statement: string | null;
  state: string | null;
  city: string | null;
  annual_budget: number | null;
  employee_count: number | null;
  industry: string | null;
  naics_primary: string | null;
  funding_use: string | null;
  project_description: string | null;
  target_beneficiaries: string[];
  impact_metrics: string[];
  program_areas: string[];
  business_stage: string | null;
  federal_certifications: string[];
  sam_registration_status: string | null;
  match_funds_capacity: string | null;
  past_federal_funding_level: string | null;
  technology_readiness_level: number | null;
  ownership_demographics: string;
}

interface GrantData {
  name: string;
  funder_name: string;
  description: string | null;
  category: string | null;
  eligibility_types: string[];
  states: string[];
  source_type: string;
  eligible_naics: string[];
  requires_sam: boolean;
  required_certification: string | null;
  cost_sharing_required: boolean;
  target_beneficiaries: string[];
  project_keywords: string[];
  amount_min: number | null;
  amount_max: number | null;
}

/**
 * Generate PURPOSE-focused text for an org (what they want to do with the money).
 */
export function buildOrgPurposeText(org: OrgData): string {
  return [
    org.project_description ? `Project: ${org.project_description}` : "",
    org.mission_statement ? `Mission: ${org.mission_statement}` : "",
    org.funding_use ? `Funding needs: ${org.funding_use.replace(/,/g, ", ")}` : "",
    org.target_beneficiaries.length > 0
      ? `Serves: ${org.target_beneficiaries.map((b) => b.replace(/_/g, " ")).join(", ")}`
      : "",
    org.impact_metrics.length > 0
      ? `Outcomes: ${org.impact_metrics.map((m) => m.replace(/_/g, " ")).join(", ")}`
      : "",
    org.program_areas.length > 0
      ? `Programs: ${org.program_areas.join(", ")}`
      : "",
  ].filter(Boolean).join(". ");
}

/**
 * Generate PROFILE-focused text for an org (what kind of org they are).
 */
export function buildOrgProfileText(org: OrgData): string {
  return [
    org.entity_type ? `Organization type: ${org.entity_type.replace(/_/g, " ")}` : "",
    org.industry ? `Industry: ${org.industry.replace(/_/g, " ")}` : "",
    org.naics_primary ? `NAICS: ${org.naics_primary}` : "",
    org.state ? `Located in ${org.city ? org.city + ", " : ""}${org.state}` : "",
    org.business_stage ? `Stage: ${org.business_stage.replace(/_/g, " ")}` : "",
    org.annual_budget ? `Budget: $${org.annual_budget.toLocaleString()}` : "",
    org.employee_count ? `Employees: ${org.employee_count}` : "",
    org.federal_certifications.length > 0
      ? `Certifications: ${org.federal_certifications.join(", ")}`
      : "",
    org.sam_registration_status ? `SAM.gov: ${org.sam_registration_status}` : "",
    org.past_federal_funding_level && org.past_federal_funding_level !== "none"
      ? `Federal funding history: ${org.past_federal_funding_level.replace(/_/g, " ")}`
      : "",
    org.technology_readiness_level ? `TRL: ${org.technology_readiness_level}` : "",
    org.ownership_demographics ? `Ownership: ${org.ownership_demographics}` : "",
    org.match_funds_capacity ? `Match funds: ${org.match_funds_capacity.replace(/_/g, " ")}` : "",
  ].filter(Boolean).join(". ");
}

/**
 * Generate PURPOSE-focused text for a grant (what it funds).
 */
export function buildGrantPurposeText(grant: GrantData): string {
  return [
    grant.name,
    grant.description ? grant.description.slice(0, 1000) : "",
    grant.project_keywords.length > 0
      ? `Funds: ${grant.project_keywords.join(", ")}`
      : "",
    grant.target_beneficiaries.length > 0
      ? `For: ${grant.target_beneficiaries.map((b) => b.replace(/_/g, " ")).join(", ")}`
      : "",
    grant.category ? `Sector: ${grant.category.replace(/_/g, " ")}` : "",
    grant.amount_min || grant.amount_max
      ? `Award: ${grant.amount_min ? "$" + grant.amount_min.toLocaleString() : ""}-${grant.amount_max ? "$" + grant.amount_max.toLocaleString() : "varies"}`
      : "",
  ].filter(Boolean).join(". ");
}

/**
 * Generate PROFILE-focused text for a grant (what kind of org should apply).
 */
export function buildGrantProfileText(grant: GrantData): string {
  return [
    `Funder: ${grant.funder_name}`,
    `Type: ${grant.source_type} grant`,
    grant.eligibility_types.length > 0
      ? `Eligible: ${grant.eligibility_types.map((t) => t.replace(/_/g, " ")).join(", ")}`
      : "Open to various org types",
    grant.states.length > 0
      ? `Geography: ${grant.states.join(", ")}`
      : "National",
    grant.eligible_naics.length > 0
      ? `NAICS: ${grant.eligible_naics.join(", ")}`
      : "",
    grant.requires_sam ? "Requires SAM.gov registration" : "",
    grant.required_certification ? `Requires: ${grant.required_certification}` : "",
    grant.cost_sharing_required ? "Cost sharing required" : "",
  ].filter(Boolean).join(". ");
}
