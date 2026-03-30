import { aiCall } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/client";
import {
  MatchBatchLLMOutputSchema,
  enrichLLMOutput,
  type MatchBatchOutput,
} from "@/lib/ai/schemas/match";
import { MATCH_ENGINE_SYSTEM_PROMPT } from "@/lib/ai/prompts/match-system";
import { buildIndustryContext } from "@/lib/industry/pain-points";

export interface OrgProfile {
  name: string;
  entity_type: string;
  mission_statement: string;
  state: string | null;
  city: string | null;
  annual_budget: number | null;
  employee_count: number | null;
  program_areas: string[];
  population_served: string[];
  grant_history_level: string | null;
  has_501c3: boolean;
  has_sam_registration: boolean;
  has_audit: boolean;
  years_operating: number;
  prior_federal_grants: number;
  prior_foundation_grants: number;
  /** Industry key from onboarding (e.g. "computer_software", "hospital_healthcare") */
  industry?: string | null;
}

export interface GrantForScoring {
  id: string;
  name: string;
  funder_name: string;
  source_type: string;
  amount_min: number | null;
  amount_max: number | null;
  description: string | null;
  deadline: string | null;
  states: string[];
  eligibility_types: string[];
}

export interface CallContext {
  orgId: string;
  userId: string;
  tier: string;
}

export function buildMatchUserMessage(
  org: OrgProfile,
  grants: GrantForScoring[]
): string {
  const industryContext = buildIndustryContext(org.industry);

  const orgSection = [
    "## ORGANIZATION PROFILE",
    `Name: ${org.name}`,
    `Entity Type: ${org.entity_type}`,
    `Mission: ${org.mission_statement}`,
    `Location: ${org.city ?? "Unknown"}, ${org.state ?? "Unknown"}`,
    `Annual Budget: ${org.annual_budget ? `$${org.annual_budget.toLocaleString()}` : "Not specified"}`,
    `Staff Count: ${org.employee_count ?? "Not specified"}`,
    `Years Operating: ${org.years_operating}`,
    `Program Areas: ${org.program_areas.join(", ") || "Not specified"}`,
    `Populations Served: ${org.population_served.join(", ") || "Not specified"}`,
    `Grant History: ${org.grant_history_level ?? "Unknown"}`,
    `Prior Federal Grants: ${org.prior_federal_grants}`,
    `Prior Foundation Grants: ${org.prior_foundation_grants}`,
    "",
    "### Capabilities",
    `- 501(c)(3) Status: ${org.has_501c3 ? "Yes" : "No"}`,
    `- SAM.gov Registration: ${org.has_sam_registration ? "Active" : "Not registered"}`,
    `- Financial Audit: ${org.has_audit ? "Has recent audit" : "No audit on file"}`,
    ...(industryContext ? ["", industryContext] : []),
  ].join("\n");

  const grantsSection = grants
    .map(
      (g, i) =>
        [
          `### Grant ${i + 1}`,
          `ID: ${g.id}`,
          `Name: ${g.name}`,
          `Funder: ${g.funder_name}`,
          `Type: ${g.source_type}`,
          `Amount: ${g.amount_min ? `$${g.amount_min.toLocaleString()}` : "?"} - ${g.amount_max ? `$${g.amount_max.toLocaleString()}` : "?"}`,
          `Deadline: ${g.deadline ?? "Rolling"}`,
          `States: ${g.states.length > 0 ? g.states.join(", ") : "National"}`,
          `Eligibility: ${g.eligibility_types.join(", ") || "Open"}`,
          `Description: ${g.description ?? "No description available"}`,
        ].join("\n")
    )
    .join("\n\n");

  return [
    orgSection,
    "",
    "---",
    "",
    `## GRANT OPPORTUNITIES TO SCORE (${grants.length} grants)`,
    "",
    grantsSection,
    "",
    "---",
    "",
    `Score all ${grants.length} grants above. Return ONLY valid JSON.`,
  ].join("\n");
}

export async function scoreGrantBatch(
  ctx: CallContext,
  org: OrgProfile,
  grants: GrantForScoring[]
): Promise<MatchBatchOutput> {
  const BATCH_SIZE = 20;
  const allScoredGrants: MatchBatchOutput["scored_grants"] = [];

  for (let i = 0; i < grants.length; i += BATCH_SIZE) {
    const batch = grants.slice(i, i + BATCH_SIZE);
    const userInput = buildMatchUserMessage(org, batch);

    const response = await aiCall({
      orgId: ctx.orgId,
      userId: ctx.userId,
      actionType: "match",
      tier: ctx.tier,
      model: MODELS.SCORING,
      systemPrompt: MATCH_ENGINE_SYSTEM_PROMPT,
      userInput,
      maxTokens: 8192,
      temperature: 0.2,
      skipUsageCheck: i > 0,
    });

    const raw = JSON.parse(response.content);
    const validated = MatchBatchLLMOutputSchema.parse(raw);
    const enriched = enrichLLMOutput(validated);
    allScoredGrants.push(...enriched.scored_grants);
  }

  return { scored_grants: allScoredGrants };
}
