import { z } from "zod";

const ReadinessCriterionSchema = z.object({
  criterion_id: z.string(),
  criterion_name: z.string(),
  score: z.number().min(1).max(10),
  explanation: z.string().min(10).max(300),
  fix_action: z.string().nullable(),
  estimated_fix_hours: z.number().nullable(),
  priority: z.enum(["critical", "important", "nice_to_have"]).nullable(),
});

export const ReadinessOutputSchema = z.object({
  overall_score: z.number().min(0).max(100),
  criteria: z.array(ReadinessCriterionSchema).length(10),
  tier_label: z.enum(["excellent", "good", "moderate", "not_ready"]),
  summary: z.string().min(20).max(500),
  top_3_gaps: z.array(z.object({
    criterion_name: z.string(),
    gap_description: z.string(),
    fix_action: z.string(),
    estimated_fix_hours: z.number(),
  })).max(3),
  eligible_grant_types: z.array(z.string()),
  blocked_grant_types: z.array(z.string()),
});

export type ReadinessOutput = z.infer<typeof ReadinessOutputSchema>;
export type ReadinessCriterion = z.infer<typeof ReadinessCriterionSchema>;
