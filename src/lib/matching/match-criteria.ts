/**
 * Computes factual match criteria by comparing grant fields against org fields.
 * No AI generation — every line is a verifiable data comparison.
 */

export interface MatchCriterion {
  status: "match" | "partial" | "gap" | "info";
  label: string;
}

interface GrantFields {
  source_type?: string | null;
  states?: string[] | null;
  eligibility_types?: string[] | null;
  amount_min?: number | null;
  amount_max?: number | null;
  eligible_naics?: string[] | null;
  requires_sam?: boolean | null;
  required_certification?: string | null;
  match_required_pct?: number | null;
  cost_sharing_required?: boolean | null;
  category?: string | null;
  target_beneficiaries?: string[] | null;
  estimated_awards_count?: number | null;
  estimated_funding?: number | null;
}

interface OrgFields {
  entity_type?: string | null;
  state?: string | null;
  city?: string | null;
  naics_primary?: string | null;
  sam_registration_status?: string | null;
  federal_certifications?: string[] | null;
  match_funds_capacity?: string | null;
  funding_amount_min?: number | null;
  funding_amount_max?: number | null;
  industry?: string | null;
  annual_budget?: number | null;
  target_beneficiaries?: string[] | null;
}

const MATCH_CAPACITY_TO_PCT: Record<string, number> = {
  none: 0, up_to_10: 10, up_to_25: 25, up_to_50: 50, over_50: 100,
};

export function computeMatchCriteria(grant: GrantFields, org: OrgFields): MatchCriterion[] {
  const criteria: MatchCriterion[] = [];

  // Location
  if (grant.states?.length) {
    const hasNational = grant.states.includes("national") || grant.states.includes("all");
    if (hasNational) {
      criteria.push({ status: "match", label: "Available nationwide" });
    } else if (org.state && grant.states.includes(org.state)) {
      criteria.push({ status: "match", label: `Available in ${org.state}${org.city ? ` — you're in ${org.city}` : ""}` });
    } else if (org.state) {
      criteria.push({ status: "gap", label: `Limited to ${grant.states.join(", ")} — you're in ${org.state}` });
    }
  }

  // Entity type
  if (grant.eligibility_types?.length) {
    if (grant.eligibility_types.includes("any") || grant.eligibility_types.includes(org.entity_type ?? "")) {
      criteria.push({ status: "match", label: `Open to ${org.entity_type?.replace(/_/g, " ") ?? "your org type"}` });
    } else {
      criteria.push({ status: "gap", label: `Requires ${grant.eligibility_types.join(" or ")}` });
    }
  }

  // Funding range
  if (grant.amount_max || grant.amount_min) {
    const grantRange = grant.amount_min && grant.amount_max
      ? `$${(grant.amount_min / 1000).toFixed(0)}K – $${(grant.amount_max / 1000).toFixed(0)}K`
      : grant.amount_max
        ? `Up to $${(grant.amount_max / 1000).toFixed(0)}K`
        : `From $${((grant.amount_min ?? 0) / 1000).toFixed(0)}K`;

    if (org.funding_amount_min != null || org.funding_amount_max != null) {
      const overlap =
        (grant.amount_min == null || org.funding_amount_max == null || grant.amount_min <= org.funding_amount_max) &&
        (grant.amount_max == null || org.funding_amount_min == null || grant.amount_max >= org.funding_amount_min);
      if (overlap) {
        criteria.push({ status: "match", label: `Funding: ${grantRange} — overlaps your target range` });
      } else {
        criteria.push({ status: "gap", label: `Funding: ${grantRange} — outside your target range` });
      }
    } else {
      criteria.push({ status: "info", label: `Funding: ${grantRange}` });
    }
  }

  // Grant type
  if (grant.source_type) {
    criteria.push({ status: "info", label: `${grant.source_type.charAt(0).toUpperCase() + grant.source_type.slice(1)} grant` });
  }

  // Category
  if (grant.category) {
    criteria.push({ status: "info", label: `Category: ${grant.category}` });
  }

  // NAICS
  if (grant.eligible_naics?.length && org.naics_primary) {
    if (grant.eligible_naics.includes(org.naics_primary)) {
      criteria.push({ status: "match", label: `NAICS ${org.naics_primary} is eligible` });
    } else {
      criteria.push({ status: "gap", label: `Requires NAICS: ${grant.eligible_naics.join(", ")}` });
    }
  }

  // SAM.gov
  if (grant.requires_sam) {
    if (org.sam_registration_status === "registered") {
      criteria.push({ status: "match", label: "SAM.gov registered ✓" });
    } else if (org.sam_registration_status === "in_progress") {
      criteria.push({ status: "partial", label: "SAM.gov required — yours is in progress" });
    } else {
      criteria.push({ status: "gap", label: "SAM.gov registration required" });
    }
  }

  // Certification
  if (grant.required_certification) {
    const orgCerts = org.federal_certifications ?? [];
    if (orgCerts.includes(grant.required_certification)) {
      criteria.push({ status: "match", label: `${grant.required_certification.toUpperCase()} certification ✓` });
    } else {
      criteria.push({ status: "gap", label: `Requires ${grant.required_certification.toUpperCase()} certification` });
    }
  }

  // Match funds
  if (grant.match_required_pct && grant.match_required_pct > 0) {
    if (org.match_funds_capacity) {
      const orgPct = MATCH_CAPACITY_TO_PCT[org.match_funds_capacity] ?? 0;
      if (orgPct >= grant.match_required_pct) {
        criteria.push({ status: "match", label: `${grant.match_required_pct}% match required — you can cover it` });
      } else {
        criteria.push({ status: "gap", label: `Requires ${grant.match_required_pct}% matching funds — you have ${orgPct}%` });
      }
    } else {
      criteria.push({ status: "info", label: `Requires ${grant.match_required_pct}% matching funds` });
    }
  }

  // Cost sharing
  if (grant.cost_sharing_required) {
    criteria.push({ status: "info", label: "Cost sharing required" });
  }

  // Beneficiary population match
  if (grant.target_beneficiaries?.length && org.target_beneficiaries?.length) {
    const BENEFICIARY_LABELS: Record<string, string> = {
      children_youth: "Children & Youth", veterans: "Veterans", low_income: "Low-Income",
      minorities: "Minorities", women_girls: "Women & Girls", rural: "Rural Communities",
      immigrants: "Immigrants", disabilities: "People with Disabilities", seniors: "Seniors",
      small_businesses: "Small Businesses", students: "Students", general_public: "General Public",
    };
    const overlap = (grant.target_beneficiaries as string[]).filter((b) =>
      (org.target_beneficiaries as string[]).includes(b)
    );
    if (overlap.length > 0) {
      const names = overlap.map((b) => BENEFICIARY_LABELS[b] ?? b.replace(/_/g, " ")).join(", ");
      criteria.push({ status: "match", label: `Serves ${names} — matches your beneficiaries` });
    }
  }

  // Sector alignment
  if (grant.category && org.industry) {
    criteria.push({ status: "info", label: `Sector: ${grant.category.replace(/_/g, " ")}` });
  }

  // Competitiveness (from USAspending.gov data)
  if (grant.estimated_awards_count != null && grant.estimated_awards_count > 0) {
    if (grant.estimated_awards_count <= 20) {
      criteria.push({ status: "gap", label: `Highly competitive — only ${grant.estimated_awards_count} awards last year` });
    } else if (grant.estimated_awards_count <= 100) {
      criteria.push({ status: "partial", label: `Competitive — ${grant.estimated_awards_count} awards last year` });
    } else {
      criteria.push({ status: "match", label: `Accessible — ${grant.estimated_awards_count} awards last year` });
    }
  }

  return criteria;
}
