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

export interface ReadinessOutput {
  overall_score: number;
  criteria: ReadinessCriterion[];
  tier_label: TierLabel;
  summary: string;
  top_3_gaps: TopGap[];
  eligible_grant_types: string[];
  blocked_grant_types: string[];
  data_completeness_pct: number;
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

/**
 * Transform raw LLM output into fully computed readiness output.
 * Tier label and grant eligibility are computed server-side.
 */
export function enrichReadinessOutput(raw: ReadinessLLMOutput): ReadinessOutput {
  const criteriaScores: Record<string, number> = {};
  for (const criterion of raw.criteria) {
    criteriaScores[criterion.criterion_id] = criterion.score;
  }

  const { eligible, blocked } = computeGrantEligibility(criteriaScores);

  return {
    overall_score: raw.overall_score,
    criteria: raw.criteria,
    tier_label: computeTierLabel(raw.overall_score),
    summary: raw.summary,
    top_3_gaps: raw.top_3_gaps,
    eligible_grant_types: eligible,
    blocked_grant_types: blocked,
    data_completeness_pct: raw.data_completeness_pct,
  };
}

// --- Legacy alias for backward compatibility ---
/** @deprecated Use ReadinessLLMOutputSchema for validation, then enrichReadinessOutput() */
export const ReadinessOutputSchema = ReadinessLLMOutputSchema;
