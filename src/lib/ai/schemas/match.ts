import { z } from "zod";

const ScoreBreakdownSchema = z.object({
  mission_alignment: z.number().min(1).max(10),
  capacity_fit: z.number().min(1).max(10),
  geographic_match: z.number().min(1).max(10),
  budget_fit: z.number().min(1).max(10),
  competition_level: z.number().min(1).max(10),
  funder_history_fit: z.number().min(1).max(10),
});

export const MatchScoreOutputSchema = z.object({
  grant_id: z.string(),
  match_score: z.number().min(0).max(100),
  score_breakdown: ScoreBreakdownSchema,
  why_it_matches: z.string().min(10).max(500),
  missing_requirements: z.array(z.string()),
  win_probability: z.enum(["low", "moderate", "high", "very_high"]),
  recommended_action: z.enum(["apply", "prepare_then_apply", "research_more", "skip"]),
});

export const MatchBatchOutputSchema = z.object({
  scored_grants: z.array(MatchScoreOutputSchema),
});

export type MatchScoreOutput = z.infer<typeof MatchScoreOutputSchema>;
export type MatchBatchOutput = z.infer<typeof MatchBatchOutputSchema>;
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;
