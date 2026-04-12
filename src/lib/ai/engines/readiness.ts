import { aiCall } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { ReadinessLLMOutputSchema, enrichReadinessOutput, type ReadinessOutput, type OrgProfileFields } from "@/lib/ai/schemas/readiness";
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
  // New profile fields for bonus scoring
  naics_primary?: string | null;
  federal_certifications?: string[];
  sam_registration_status?: string | null;
  match_funds_capacity?: string | null;
  funding_amount_min?: number | null;
  funding_amount_max?: number | null;
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

### Federal Readiness Profile
- NAICS Code: ${org.naics_primary ?? "Not specified"}
- Federal Certifications: ${org.federal_certifications?.length ? org.federal_certifications.join(", ") : "None"}
- SAM.gov Registration: ${org.sam_registration_status ?? "Not specified"}
- Matching Funds Capacity: ${org.match_funds_capacity ?? "Not specified"}
- Target Funding Range: ${org.funding_amount_min != null || org.funding_amount_max != null ? `$${org.funding_amount_min?.toLocaleString() ?? "0"} - $${org.funding_amount_max?.toLocaleString() ?? "open"}` : "Not specified"}

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
  org: OrgReadinessInput,
  profileFields?: OrgProfileFields
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
    return enrichReadinessOutput(validated, profileFields);
  } catch (err) {
    logger.error("Readiness Engine response parsing failed", { err: String(err), rawSnippet: response.content.slice(0, 500) });
    throw new Error("Readiness Engine returned invalid output. Please try again.");
  }
}
