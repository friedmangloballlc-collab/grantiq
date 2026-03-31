import { aiCall } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { ReadinessLLMOutputSchema, enrichReadinessOutput, type ReadinessOutput } from "@/lib/ai/schemas/readiness";
import { READINESS_ENGINE_SYSTEM_PROMPT } from "@/lib/ai/prompts/readiness-system";

interface OrgReadinessInput {
  name: string;
  entity_type: string;
  mission_statement: string;
  state: string | null;
  annual_budget: number | null;
  employee_count: number | null;
  years_operating: number;
  has_501c3: boolean;
  has_ein: boolean;
  has_sam_registration: boolean;
  has_grants_gov: boolean;
  has_audit: boolean;
  has_fiscal_sponsor: boolean;
  has_grant_writer: boolean;
  prior_federal_grants: number;
  prior_foundation_grants: number;
  sam_gov_status: string;
  grants_gov_status: string;
  program_areas: string[];
  population_served: string[];
  grant_history_level: string | null;
  outcomes_tracking: boolean;
}

interface CallContext {
  orgId: string;
  userId: string;
  tier: string;
}

export function buildReadinessUserMessage(org: OrgReadinessInput): string {
  return `## ORGANIZATION DATA FOR READINESS ASSESSMENT

### Basic Information
Name: ${org.name}
Entity Type: ${org.entity_type}
Mission: ${org.mission_statement}
Location: ${org.state ?? "Not specified"}
Annual Budget: ${org.annual_budget ? `$${org.annual_budget.toLocaleString()}` : "Not specified"}
Staff Count: ${org.employee_count ?? "Not specified"}
Years Operating: ${org.years_operating}

### Legal & Registration
- 501(c)(3) Status: ${org.has_501c3 ? "Active" : "No"}
- EIN: ${org.has_ein ? "Has EIN" : "No EIN"}
- SAM.gov: ${org.has_sam_registration ? `Registered (Status: ${org.sam_gov_status})` : "Not registered"}
- Grants.gov: ${org.grants_gov_status === "registered" ? "Registered" : "Not registered"}
- Fiscal Sponsor: ${org.has_fiscal_sponsor ? "Yes" : "No"}

### Financial
- Annual Budget: ${org.annual_budget ? `$${org.annual_budget.toLocaleString()}` : "Not provided"}
- Has Independent Audit: ${org.has_audit ? "Yes" : "No"}

### Grant Experience
- Grant History Level: ${org.grant_history_level ?? "Not specified"}
- Prior Federal Grants: ${org.prior_federal_grants}
- Prior Foundation Grants: ${org.prior_foundation_grants}
- Has Dedicated Grant Writer: ${org.has_grant_writer ? "Yes" : "No"}

### Programs & Impact
- Program Areas: ${org.program_areas.join(", ") || "Not specified"}
- Populations Served: ${org.population_served.join(", ") || "Not specified"}
- Outcomes Tracking: ${org.outcomes_tracking ? "Yes" : "No formal system"}

---

Assess this organization's grant readiness across all 10 criteria (A-J). Return ONLY valid JSON.`;
}

/**
 * Readiness Engine: Scores org across 10 criteria (A-J), generates gap analysis.
 *
 * Cost: ~$0.03 per assessment
 * Model: Claude Sonnet
 */
export async function assessReadiness(
  ctx: CallContext,
  org: OrgReadinessInput
): Promise<ReadinessOutput> {
  const userInput = buildReadinessUserMessage(org);

  const response = await aiCall({
    orgId: ctx.orgId,
    userId: ctx.userId,
    actionType: "readiness_score",
    tier: ctx.tier,
    model: MODELS.SCORING,
    systemPrompt: READINESS_ENGINE_SYSTEM_PROMPT,
    userInput,
    maxTokens: 4096,
    temperature: 0.2,
  });

  try {
    const raw = JSON.parse(response.content);
    const validated = ReadinessLLMOutputSchema.parse(raw);
    return enrichReadinessOutput(validated);
  } catch (err) {
    logger.error("Readiness Engine response parsing failed", { err: String(err), rawSnippet: response.content.slice(0, 500) });
    throw new Error("Readiness Engine returned invalid output. Please try again.");
  }
}
