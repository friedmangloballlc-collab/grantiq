import { z } from "zod";

// --- Raw LLM output schema (what Claude returns) ---

const ReadinessCriterionLLMSchema = z.object({
  criterion_id: z.string(),
  criterion_name: z.string(),
  score: z.number().min(1).max(10),
  evidence_level: z.enum(["direct_evidence", "inferred", "insufficient_data"]),
  explanation: z.string().min(10).max(500),
  fix_action: z.string().nullable(),
  estimated_fix_hours: z.number().nullable(),
  priority: z.enum(["critical", "important", "nice_to_have"]).nullable(),
});

const TopGapLLMSchema = z.object({
  criterion_id: z.string(),
  criterion_name: z.string(),
  gap_description: z.string(),
  fix_action: z.string(),
  estimated_fix_hours: z.number(),
  unlocks: z.string(),
});

export const ReadinessLLMOutputSchema = z.object({
  overall_score: z.number().min(10).max(100),
  criteria: z.array(ReadinessCriterionLLMSchema).length(10),
  summary: z.string().min(20).max(600),
  top_3_gaps: z.array(TopGapLLMSchema).max(3),
  data_completeness_pct: z.number().min(0).max(100),
});

export type ReadinessLLMOutput = z.infer<typeof ReadinessLLMOutputSchema>;

// --- Server-computed fields ---

export type TierLabel = "excellent" | "good" | "moderate" | "not_ready";

export interface ProfileGap {
  field: string;
  action: string;
  points: number;
}

export interface OrgProfileFields {
  sam_registration_status: string | null;
  federal_certifications: string[];
  naics_primary: string | null;
  match_funds_capacity: string | null;
  funding_amount_min: number | null;
  funding_amount_max: number | null;
}

export interface ReadinessOutput {
  overall_score: number;
  criteria: ReadinessCriterion[];
  tier_label: TierLabel;
  summary: string;
  top_3_gaps: TopGap[];
  eligible_grant_types: string[];
  blocked_grant_types: string[];
  data_completeness_pct: number;
  profile_bonus: number;
  profile_gaps: ProfileGap[];
}

export interface ReadinessCriterion {
  criterion_id: string;
  criterion_name: string;
  score: number;
  evidence_level: "direct_evidence" | "inferred" | "insufficient_data";
  explanation: string;
  fix_action: string | null;
  estimated_fix_hours: number | null;
  priority: "critical" | "important" | "nice_to_have" | null;
}

export interface TopGap {
  criterion_id: string;
  criterion_name: string;
  gap_description: string;
  fix_action: string;
  estimated_fix_hours: number;
  unlocks: string;
}

// --- Server-side computation functions ---

export function computeTierLabel(overallScore: number): TierLabel {
  if (overallScore >= 90) return "excellent";
  if (overallScore >= 70) return "good";
  if (overallScore >= 50) return "moderate";
  return "not_ready";
}

export function computeGrantEligibility(
  criteriaScores: Record<string, number>
): { eligible: string[]; blocked: string[] } {
  const eligible: string[] = [];
  const blocked: string[] = [];

  const a = criteriaScores.a_legal_status ?? 0;
  const b = criteriaScores.b_financial_systems ?? 0;
  const c = criteriaScores.c_federal_registration ?? 0;
  const g = criteriaScores.g_mission_narrative ?? 0;

  // Federal: requires SAM >= 7, financial >= 7, legal >= 8
  if (c >= 7 && b >= 7 && a >= 8) {
    eligible.push("federal");
  } else {
    blocked.push("federal");
  }

  // State: requires legal >= 6, financial >= 5
  if (a >= 6 && b >= 5) {
    eligible.push("state");
  } else {
    blocked.push("state");
  }

  // Foundation: requires legal >= 5, narrative >= 5
  if (a >= 5 && g >= 5) {
    eligible.push("foundation");
  } else {
    blocked.push("foundation");
  }

  // Corporate: requires legal >= 5
  if (a >= 5) {
    eligible.push("corporate");
  } else {
    blocked.push("corporate");
  }

  return { eligible, blocked };
}

const KNOWN_CERTS = new Set(["sba_8a", "wosb", "vosb", "sdvosb", "hubzone", "mbe"]);
const HIGH_MATCH_CAPACITY = new Set(["up_to_25", "up_to_50", "over_50"]);

/**
 * Compute bonus points from the 5 new org_profiles fields.
 * Returns the bonus total and an array of gaps (actions that would earn more points).
 */
export function computeProfileBonus(
  profile: OrgProfileFields
): { bonus: number; gaps: ProfileGap[] } {
  let bonus = 0;
  const gaps: ProfileGap[] = [];

  // SAM registration: +20 if registered, +10 if in progress
  if (profile.sam_registration_status === "registered") {
    bonus += 20;
  } else if (profile.sam_registration_status === "in_progress") {
    bonus += 10;
    gaps.push({ field: "sam_registration_status", action: "Complete your SAM.gov registration", points: 10 });
  } else {
    gaps.push({ field: "sam_registration_status", action: "Register on SAM.gov", points: 20 });
  }

  // Federal certifications: +15 if any recognized cert
  const hasCert = profile.federal_certifications.some((c) => KNOWN_CERTS.has(c));
  if (hasCert) {
    bonus += 15;
  } else {
    gaps.push({ field: "federal_certifications", action: "Obtain a federal certification (8(a), WOSB, HUBZone, etc.)", points: 15 });
  }

  // NAICS code: +10 if set
  if (profile.naics_primary) {
    bonus += 10;
  } else {
    gaps.push({ field: "naics_primary", action: "Identify your NAICS code", points: 10 });
  }

  // Match funds capacity: +10 if high, +5 if low
  if (profile.match_funds_capacity && HIGH_MATCH_CAPACITY.has(profile.match_funds_capacity)) {
    bonus += 10;
  } else if (profile.match_funds_capacity === "up_to_10") {
    bonus += 5;
    gaps.push({ field: "match_funds_capacity", action: "Identify matching funds sources", points: 5 });
  } else {
    gaps.push({ field: "match_funds_capacity", action: "Identify matching funds sources", points: 10 });
  }

  // Funding amount: +5 if either min or max is set
  if (profile.funding_amount_min != null || profile.funding_amount_max != null) {
    bonus += 5;
  } else {
    gaps.push({ field: "funding_amount", action: "Specify your target funding range", points: 5 });
  }

  return { bonus, gaps };
}

/**
 * Transform raw LLM output into fully computed readiness output.
 * Tier label, grant eligibility, and profile bonus are computed server-side.
 */
export function enrichReadinessOutput(
  raw: ReadinessLLMOutput,
  profile?: OrgProfileFields
): ReadinessOutput {
  const criteriaScores: Record<string, number> = {};
  for (const criterion of raw.criteria) {
    criteriaScores[criterion.criterion_id] = criterion.score;
  }

  const { eligible, blocked } = computeGrantEligibility(criteriaScores);

  const { bonus, gaps } = profile
    ? computeProfileBonus(profile)
    : { bonus: 0, gaps: [] };

  const finalScore = Math.min(100, raw.overall_score + bonus);

  return {
    overall_score: finalScore,
    criteria: raw.criteria,
    tier_label: computeTierLabel(finalScore),
    summary: raw.summary,
    top_3_gaps: raw.top_3_gaps,
    eligible_grant_types: eligible,
    blocked_grant_types: blocked,
    data_completeness_pct: raw.data_completeness_pct,
    profile_bonus: bonus,
    profile_gaps: gaps,
  };
}

// --- Legacy alias for backward compatibility ---
/** @deprecated Use ReadinessLLMOutputSchema for validation, then enrichReadinessOutput() */
export const ReadinessOutputSchema = ReadinessLLMOutputSchema;
