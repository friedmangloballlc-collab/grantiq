/**
 * Weighted match scoring — combines vector similarity with factual criteria
 * for more accurate match rankings.
 *
 * Score breakdown:
 *   70% — Vector similarity (semantic match between org profile and grant description)
 *   15% — Eligibility overlap (entity type, certifications, SAM status)
 *   15% — Location/state match
 *
 * All scores are 0-100.
 */

interface GrantFields {
  similarity: number;
  eligibility_types: string[];
  states: string[];
  source_type: string;
  category?: string | null;
  requires_sam?: boolean | null;
  amount_min?: number | null;
  amount_max?: number | null;
  eligible_naics?: string[] | null;
  required_certification?: string | null;
  target_beneficiaries?: string[] | null;
  deadline?: string | null;
}

interface OrgFields {
  entity_type: string;
  state: string | null;
  industry: string | null;
  sam_registration_status: string | null;
  funding_amount_min: number | null;
  funding_amount_max: number | null;
  naics_primary: string | null;
  federal_certifications: string[];
  target_beneficiaries: string[];
}

export interface WeightedScoreResult {
  total: number;
  similarity_score: number;
  eligibility_score: number;
  location_score: number;
  fit_score: number;
  timing_score: number;
}

// Map org industries to related grant sectors
const INDUSTRY_SECTOR_MAP: Record<string, string[]> = {
  // Tech industries
  it_services: ["technology", "science_research", "economic_development"],
  computer_software: ["technology", "science_research"],
  computer_security: ["technology"],
  biotechnology: ["technology", "health", "science_research"],
  nanotechnology: ["technology", "science_research"],

  // Health industries
  hospital_healthcare: ["health", "social_services"],
  medical_practice: ["health"],
  medical_devices: ["health", "technology"],
  mental_health: ["health", "social_services"],
  health_wellness: ["health"],
  pharmaceuticals: ["health", "science_research"],

  // Education
  higher_education: ["education", "science_research"],
  k12_education: ["education"],
  education_management: ["education"],
  elearning: ["education", "technology"],

  // Food/Agriculture
  farming: ["agriculture", "food_nutrition"],
  food_beverages: ["food_nutrition", "agriculture"],
  food_production: ["food_nutrition", "agriculture"],
  restaurants: ["food_nutrition"],

  // Arts
  performing_arts: ["arts_culture"],
  fine_art: ["arts_culture"],
  music: ["arts_culture"],
  film: ["arts_culture"],
  broadcast_media: ["arts_culture", "technology"],

  // Environment/Energy
  renewables: ["energy", "environment"],
  environmental_services: ["environment"],
  oil_energy: ["energy"],

  // Construction/Housing
  construction: ["housing", "community_development"],
  real_estate: ["housing"],
  architecture_planning: ["housing", "community_development"],

  // Social services
  civic_social: ["social_services", "community_development"],
  family_services: ["social_services"],
  nonprofit_management: ["social_services", "community_development"],
};

export function computeWeightedScore(grant: GrantFields, org: OrgFields): WeightedScoreResult {
  // ── Similarity score (0-100) ─────────────────────────────────────────
  const similarity_score = Math.round(grant.similarity * 100);

  // ── Eligibility score (0-100) ────────────────────────────────────────
  let eligibility_score = 50; // Default: neutral (no info)

  if (grant.eligibility_types.length > 0) {
    const forProfitTypes = new Set(["llc", "corporation", "s_corp", "c_corp", "sole_prop", "sole_proprietorship", "partnership"]);
    const isForProfit = forProfitTypes.has(org.entity_type);

    if (grant.eligibility_types.includes("any")) {
      eligibility_score = 80;
    } else if (grant.eligibility_types.includes(org.entity_type)) {
      eligibility_score = 100;
    } else if (isForProfit && grant.eligibility_types.includes("for_profit")) {
      eligibility_score = 100;
    } else if (org.entity_type.startsWith("nonprofit") &&
      (grant.eligibility_types.includes("nonprofit_501c3") || grant.eligibility_types.includes("nonprofit_other"))) {
      eligibility_score = 100;
    } else {
      eligibility_score = 0; // Not eligible
    }
  }

  // Sector bonus: if grant category matches org industry
  if (grant.category && org.industry) {
    const relatedSectors = INDUSTRY_SECTOR_MAP[org.industry] ?? [];
    if (relatedSectors.includes(grant.category)) {
      eligibility_score = Math.min(100, eligibility_score + 20);
    }
  }

  // SAM bonus: if grant requires SAM and org is registered
  if (grant.requires_sam && org.sam_registration_status === "registered") {
    eligibility_score = Math.min(100, eligibility_score + 10);
  }

  // Funding range overlap bonus
  if (grant.amount_min != null || grant.amount_max != null) {
    if (org.funding_amount_min != null || org.funding_amount_max != null) {
      const overlap =
        (grant.amount_min == null || org.funding_amount_max == null || grant.amount_min <= org.funding_amount_max) &&
        (grant.amount_max == null || org.funding_amount_min == null || grant.amount_max >= org.funding_amount_min);
      if (overlap) {
        eligibility_score = Math.min(100, eligibility_score + 10);
      }
    }
  }

  // ── Location score (0-100) ───────────────────────────────────────────
  let location_score = 70; // Default: neutral (national grants get decent score)

  if (grant.states.length > 0) {
    if (grant.states.includes("national") || grant.states.includes("all")) {
      location_score = 70; // National = good but not as targeted
    } else if (org.state && grant.states.includes(org.state)) {
      location_score = 100; // Direct state match = best
    } else if (org.state) {
      location_score = 10; // Wrong state = very low
    }
  }

  // ── Fit score (0-100) — NAICS, certifications, beneficiaries ────────
  let fit_score = 50; // Default: neutral
  let fitSignals = 0;

  // NAICS match: if grant specifies eligible NAICS and org has one
  if (grant.eligible_naics?.length && org.naics_primary) {
    fitSignals++;
    if (grant.eligible_naics.includes(org.naics_primary)) {
      fit_score += 30; // Strong signal — exact industry match
    } else {
      fit_score -= 20; // Wrong industry
    }
  }

  // Certification match: if grant requires a cert org has
  if (grant.required_certification && org.federal_certifications.length > 0) {
    fitSignals++;
    if (org.federal_certifications.includes(grant.required_certification)) {
      fit_score += 25; // Set-aside match — very high value
    }
  }

  // Beneficiary match: if grant targets populations the org serves
  if (grant.target_beneficiaries?.length && org.target_beneficiaries.length > 0) {
    fitSignals++;
    const overlap = grant.target_beneficiaries.filter((b: string) =>
      org.target_beneficiaries.includes(b)
    ).length;
    if (overlap > 0) {
      fit_score += Math.min(25, overlap * 10); // Each matching population = +10, cap at 25
    }
  }

  fit_score = Math.min(100, Math.max(0, fit_score));

  // ── Timing score (0-100) — urgency bonus for closing-soon grants ────
  let timing_score = 50; // Default: neutral (no deadline or far out)

  if (grant.deadline) {
    const now = new Date();
    const deadline = new Date(grant.deadline);
    const daysUntil = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0) {
      timing_score = 0; // Expired — should be filtered, but just in case
    } else if (daysUntil <= 14) {
      timing_score = 100; // Closing in 2 weeks — highest urgency
    } else if (daysUntil <= 30) {
      timing_score = 90; // Closing in 1 month — high urgency
    } else if (daysUntil <= 60) {
      timing_score = 75; // Closing in 2 months — moderate urgency
    } else if (daysUntil <= 90) {
      timing_score = 60; // Closing in 3 months — plan ahead
    } else if (daysUntil <= 180) {
      timing_score = 45; // 3-6 months — low urgency
    } else {
      timing_score = 30; // 6+ months — distant
    }
  }
  // Rolling deadlines (null) get 50 — neutral, always available

  // ── Weighted total ───────────────────────────────────────────────────
  // Balanced: 50% similarity + 15% eligibility + 12% location + 13% fit + 10% timing
  const total = Math.round(
    similarity_score * 0.50 +
    eligibility_score * 0.15 +
    location_score * 0.12 +
    fit_score * 0.13 +
    timing_score * 0.10
  );

  return {
    total: Math.min(100, Math.max(0, total)),
    similarity_score,
    eligibility_score,
    location_score,
    fit_score,
    timing_score,
  };
}
