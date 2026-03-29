import { z } from "zod";

const QuarterGrantSchema = z.object({
  grant_id: z.string(),
  grant_name: z.string(),
  funder_name: z.string(),
  amount_range: z.string(),
  action: z.enum(["apply", "prepare", "research", "loi"]),
  deadline: z.string().nullable(),
  estimated_hours: z.number().min(1).max(200),
  prerequisites: z.array(z.string()),
  rationale: z.string().min(10).max(300),
  source_type: z.enum(["federal", "state", "foundation", "corporate"]),
  difficulty: z.enum(["easy", "moderate", "hard", "very_hard"]),
});

const QuarterPlanSchema = z.object({
  quarter: z.string(),
  year: z.number(),
  grants: z.array(QuarterGrantSchema),
  capacity_hours_total: z.number(),
  strategy_notes: z.string(),
  risk_assessment: z.string(),
});

export const StrategyOutputSchema = z.object({
  quarters: z.array(QuarterPlanSchema).min(1).max(4),
  annual_summary: z.object({
    total_potential_funding: z.number(),
    total_applications: z.number(),
    total_hours_estimated: z.number(),
    diversification_score: z.number().min(0).max(100),
    diversification_notes: z.string(),
  }),
  sequencing_rationale: z.string().min(20).max(500),
  readiness_gates: z.array(z.object({
    gate_name: z.string(),
    status: z.enum(["met", "not_met", "in_progress"]),
    blocks: z.array(z.string()),
    fix_action: z.string().nullable(),
  })),
  key_dates: z.array(z.object({
    date: z.string(),
    event: z.string(),
    action_required: z.string(),
  })),
});

export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;
export type QuarterPlan = z.infer<typeof QuarterPlanSchema>;
export type QuarterGrant = z.infer<typeof QuarterGrantSchema>;
