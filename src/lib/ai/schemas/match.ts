import { z } from "zod";

// --- Raw LLM output schema (what Claude returns) ---

const ScoresSchema = z.object({
  mission_alignment: z.number().min(1).max(10),
  capacity_fit: z.number().min(1).max(10),
  geographic_match: z.number().min(1).max(10),
  budget_fit: z.number().min(1).max(10),
  competitive_advantage: z.number().min(1).max(10),
  funder_history_fit: z.number().min(1).max(10),
});

export const MatchLLMOutputSchema = z.object({
  grant_id: z.string(),
  scores: ScoresSchema,
  match_rationale: z.string().min(10).max(500),
  missing_requirements: z.array(z.string()),
  has_hard_eligibility_barrier: z.boolean(),
});

export const MatchBatchLLMOutputSchema = z.object({
  scored_grants: z.array(MatchLLMOutputSchema),
});

export type MatchLLMOutput = z.infer<typeof MatchLLMOutputSchema>;
export type MatchBatchLLMOutput = z.infer<typeof MatchBatchLLMOutputSchema>;
export type Scores = z.infer<typeof ScoresSchema>;

// --- Server-computed fields (added after LLM call) ---

export type WinProbability = "low" | "moderate" | "high" | "very_high";
export type RecommendedAction = "apply" | "prepare_then_apply" | "research_more" | "skip";

export interface MatchScoreOutput {
  grant_id: string;
  match_score: number;
  scores: Scores;
  match_rationale: string;
  missing_requirements: string[];
  has_hard_eligibility_barrier: boolean;
  win_probability: WinProbability;
  recommended_action: RecommendedAction;
}

export interface MatchBatchOutput {
  scored_grants: MatchScoreOutput[];
}

// --- Server-side computation functions ---

export function computeMatchScore(scores: Scores): number {
  return Math.round(
    (scores.mission_alignment * 0.25 +
     scores.capacity_fit * 0.20 +
     scores.geographic_match * 0.15 +
     scores.budget_fit * 0.15 +
     scores.competitive_advantage * 0.15 +
     scores.funder_history_fit * 0.10) * 10
  );
}

export function deriveWinProbability(
  matchScore: number,
  hasHardBarrier: boolean,
  missingRequirements: string[]
): WinProbability {
  if (hasHardBarrier || matchScore < 50) return "low";
  if (matchScore >= 85 && missingRequirements.length === 0) return "very_high";
  if (matchScore >= 70 && missingRequirements.length <= 1) return "high";
  return "moderate";
}

export function deriveRecommendedAction(
  winProbability: WinProbability,
  hasHardBarrier: boolean,
  matchScore: number,
  missingCount: number
): RecommendedAction {
  if (hasHardBarrier || matchScore < 50) return "skip";
  if ((winProbability === "high" || winProbability === "very_high") && missingCount === 0) return "apply";
  if ((winProbability === "high" || winProbability === "moderate") && missingCount > 0) return "prepare_then_apply";
  return "research_more";
}

/**
 * Transform raw LLM output into fully computed match scores.
 * All arithmetic and categorical derivations happen here, not in the LLM.
 */
export function enrichLLMOutput(raw: MatchBatchLLMOutput): MatchBatchOutput {
  return {
    scored_grants: raw.scored_grants.map((grant) => {
      const matchScore = computeMatchScore(grant.scores);
      const winProbability = deriveWinProbability(
        matchScore,
        grant.has_hard_eligibility_barrier,
        grant.missing_requirements
      );
      const recommendedAction = deriveRecommendedAction(
        winProbability,
        grant.has_hard_eligibility_barrier,
        matchScore,
        grant.missing_requirements.length
      );

      return {
        grant_id: grant.grant_id,
        match_score: matchScore,
        scores: grant.scores,
        match_rationale: grant.match_rationale,
        missing_requirements: grant.missing_requirements,
        has_hard_eligibility_barrier: grant.has_hard_eligibility_barrier,
        win_probability: winProbability,
        recommended_action: recommendedAction,
      };
    }),
  };
}

// --- Legacy aliases for backward compatibility ---
// TODO: Remove these after updating all consumers
/** @deprecated Use MatchBatchLLMOutputSchema for LLM validation, then enrichLLMOutput() */
export const MatchBatchOutputSchema = MatchBatchLLMOutputSchema;
/** @deprecated Use Scores instead */
export type ScoreBreakdown = Scores;
