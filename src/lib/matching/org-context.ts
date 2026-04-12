import { createAdminClient } from "@/lib/supabase/admin";
import type { HardFilterInput } from "./hard-filter";

/**
 * Load full org context for matching — single query with joins.
 * Returns a merged object ready for hard filters and AI scoring.
 */
export async function loadOrgContext(orgId: string): Promise<HardFilterInput & { name: string; mission_statement: string | null; city: string | null; mission_embedding: number[] | null; industry: string | null; program_areas: string[]; population_served: string[]; grant_history_level: string | null; project_description: string | null; target_beneficiaries: string[]; impact_metrics: string[]; funding_use: string | null; business_stage: string | null; employee_count: number | null }> {
  const db = createAdminClient();

  const { data: org, error } = await db
    .from("organizations")
    .select("*, org_profiles(*), org_capabilities(*)")
    .eq("id", orgId)
    .single();

  if (error || !org) {
    throw new Error(`Organization ${orgId} not found`);
  }

  const profile = org.org_profiles?.[0] ?? org.org_profiles ?? {};
  const capabilities = org.org_capabilities?.[0] ?? org.org_capabilities ?? {};

  return {
    // Identity
    name: org.name ?? "Organization",
    mission_statement: org.mission_statement ?? null,
    city: org.city ?? null,
    mission_embedding: org.mission_embedding ?? null,

    // Hard filter fields
    entity_type: org.entity_type ?? "other",
    state: org.state ?? null,
    annual_budget: org.annual_budget ?? null,
    has_501c3: capabilities.has_501c3 ?? false,
    has_sam_registration: capabilities.has_sam_registration ?? false,
    has_audit: capabilities.has_audit ?? false,
    years_operating: capabilities.years_operating ?? 0,
    naics_primary: profile.naics_primary ?? null,
    funding_amount_min: profile.funding_amount_min ?? null,
    funding_amount_max: profile.funding_amount_max ?? null,
    sam_registration_status: profile.sam_registration_status ?? null,
    federal_certifications: Array.isArray(profile.federal_certifications) ? profile.federal_certifications as string[] : [],
    match_funds_capacity: profile.match_funds_capacity ?? null,
    past_federal_funding_level: profile.past_federal_funding_level ?? null,
    audited_financials: capabilities.audit_status === "has",
    audit_status: (capabilities.audit_status as "has" | "could_obtain" | "cannot" | null) ?? null,
    technology_readiness_level: profile.technology_readiness_level ?? null,

    // Profile fields for scoring/embedding
    industry: profile.industry ?? null,
    program_areas: profile.program_areas ?? [],
    population_served: profile.population_served ?? [],
    grant_history_level: profile.grant_history_level ?? null,
    project_description: profile.project_description ?? null,
    target_beneficiaries: Array.isArray(profile.target_beneficiaries) ? profile.target_beneficiaries as string[] : [],
    impact_metrics: Array.isArray(profile.impact_metrics) ? profile.impact_metrics as string[] : [],
    funding_use: profile.funding_use ?? null,
    business_stage: profile.business_stage ?? null,
    employee_count: org.employee_count ?? null,
  };
}
