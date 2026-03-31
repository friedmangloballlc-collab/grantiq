import { aiCall } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { StrategyOutputSchema, type StrategyOutput } from "@/lib/ai/schemas/strategy";
import { STRATEGY_ENGINE_SYSTEM_PROMPT } from "@/lib/ai/prompts/strategy-system";

interface OrgStrategyInput {
  name: string;
  entity_type: string;
  state: string | null;
  annual_budget: number | null;
  employee_count: number | null;
  has_grant_writer: boolean;
  grant_history_level: string | null;
}

interface ReadinessSummary {
  overall_score: number;
  tier_label: string;
  eligible_grant_types: string[];
  blocked_grant_types: string[];
  top_3_gaps: Array<{
    criterion_name: string;
    gap_description: string;
    fix_action: string;
    estimated_fix_hours: number;
  }>;
  criteria: Array<{
    criterion_id?: string;
    criterion_name?: string;
    score?: number;
  }>;
}

interface MatchedGrant {
  grant_id: string;
  grant_name: string;
  funder_name: string;
  source_type: string;
  match_score: number;
  win_probability: string;
  amount_range: string;
  deadline: string | null;
}

interface PipelineItem {
  grant_name: string;
  stage: string;
  deadline: string | null;
}

interface CallContext {
  orgId: string;
  userId: string;
  tier: string;
}

export function buildStrategyUserMessage(
  org: OrgStrategyInput,
  readiness: ReadinessSummary,
  matchedGrants: MatchedGrant[],
  pipeline: PipelineItem[],
  currentDate: string
): string {
  // Calculate capacity
  const staffCount = org.employee_count ?? 1;
  let annualMax: number;
  let quarterlyMax: number;
  if (staffCount <= 3) {
    annualMax = 4;
    quarterlyMax = 1;
  } else if (staffCount <= 10) {
    annualMax = 8;
    quarterlyMax = 3;
  } else {
    annualMax = 15;
    quarterlyMax = 4;
  }
  if (org.has_grant_writer) {
    annualMax += 2;
    quarterlyMax += 1;
  }

  const grantHistorySection = readiness.criteria
    .filter((c) => c.criterion_id === "e_grant_history")
    .map((c) => `Grant History Score: ${c.score}/10`)
    .join("") || `Grant History Level: ${org.grant_history_level ?? "unknown"}`;

  const grantsSection = matchedGrants
    .map(
      (g, i) =>
        `${i + 1}. ${g.grant_name} (${g.funder_name})
   - ID: ${g.grant_id}
   - Type: ${g.source_type}
   - Amount: ${g.amount_range}
   - Deadline: ${g.deadline ?? "Rolling"}
   - Match Score: ${g.match_score}/100
   - Win Probability: ${g.win_probability}`
    )
    .join("\n");

  const pipelineSection =
    pipeline.length > 0
      ? pipeline
          .map((p) => `- ${p.grant_name} (Stage: ${p.stage}, Deadline: ${p.deadline ?? "None"})`)
          .join("\n")
      : "No grants currently in pipeline.";

  return `## CURRENT DATE: ${currentDate}

## ORGANIZATION PROFILE
Name: ${org.name}
Entity Type: ${org.entity_type}
Location: ${org.state ?? "Not specified"}
Annual Budget: ${org.annual_budget ? `$${org.annual_budget.toLocaleString()}` : "Not specified"}
Staff Count: ${staffCount}
Has Dedicated Grant Writer: ${org.has_grant_writer ? "Yes" : "No"}
${grantHistorySection}

### Capacity Limits (Pre-calculated)
- Annual Max Applications: ${annualMax}
- Quarterly Max Applications: ${quarterlyMax}
- Available Grant Hours/Quarter: ~${staffCount * 20} hours ${org.has_grant_writer ? "(grant writer adds dedicated capacity)" : ""}

## READINESS ASSESSMENT
Readiness Score: ${readiness.overall_score}/100 (${readiness.tier_label})
Eligible Grant Types: ${readiness.eligible_grant_types.join(", ") || "None determined"}
Blocked Grant Types: ${readiness.blocked_grant_types.join(", ") || "None"}

### Top Gaps to Address
${
  readiness.top_3_gaps.length > 0
    ? readiness.top_3_gaps
        .map(
          (g) =>
            `- ${g.criterion_name}: ${g.gap_description}. Fix: ${g.fix_action} (~${g.estimated_fix_hours} hours)`
        )
        .join("\n")
    : "No critical gaps identified."
}

## MATCHED GRANTS (${matchedGrants.length} opportunities, sorted by match score)
${grantsSection || "No matched grants available."}

## CURRENT PIPELINE
${pipelineSection}

---

Generate a 12-month funding roadmap. Return ONLY valid JSON.`;
}

/**
 * Strategy Engine: Generates 12-month funding roadmap with sequencing, diversification, and capacity rules.
 *
 * Cost: ~$0.30 per generation
 * Model: Claude Opus
 */
export async function generateStrategy(
  ctx: CallContext,
  org: OrgStrategyInput,
  readiness: ReadinessSummary,
  matchedGrants: MatchedGrant[],
  pipeline: PipelineItem[],
  currentDate: string
): Promise<StrategyOutput> {
  const userInput = buildStrategyUserMessage(
    org,
    readiness,
    matchedGrants,
    pipeline,
    currentDate
  );

  const response = await aiCall({
    orgId: ctx.orgId,
    userId: ctx.userId,
    actionType: "roadmap",
    tier: ctx.tier,
    model: MODELS.STRATEGY,
    systemPrompt: STRATEGY_ENGINE_SYSTEM_PROMPT,
    userInput,
    maxTokens: 8192,
    temperature: 0.4,
  });

  try {
    const raw = JSON.parse(response.content);
    return StrategyOutputSchema.parse(raw);
  } catch (err) {
    logger.error("Strategy Engine response parsing failed", { err: String(err), rawSnippet: response.content.slice(0, 500) });
    throw new Error("Strategy Engine returned invalid output. Please try again.");
  }
}
