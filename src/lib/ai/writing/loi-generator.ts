// grantaq/src/lib/ai/writing/loi-generator.ts
//
// Generates a Letter of Intent using Claude Sonnet through aiCall.
//
// Pre-existing bug fixed here: the old direct-SDK version used
// MODELS.SCORING (an OpenAI model name) but called anthropic.messages.create.
// That path would have errored at runtime if ever exercised. Migrating to
// aiCall with ANTHROPIC_MODELS.SCORING fixes the model reference.

import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";

export interface OrgProfile {
  name: string;
  mission_statement: string;
  entity_type: string;
  state: string | null;
  city: string | null;
  annual_budget: number | null;
  employee_count: number | null;
  program_areas: string[];
  population_served: string[];
}

export interface GrantDetails {
  name: string;
  funder_name: string;
  description: string | null;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  focus_areas: string | null;
}

const LOI_SYSTEM_PROMPT = `You are an expert grant writer creating a Letter of Intent (LOI) for a nonprofit or small business applying for grant funding.

Write a professional, compelling 1-page LOI that includes:
1. Opening paragraph: Introduce the organization and state the purpose of the letter
2. Organization background: Brief history, mission, and credibility (2-3 sentences)
3. Project description: What you plan to do, who it serves, where, and expected outcomes (3-4 sentences)
4. Alignment: How this project aligns with the funder's priorities (2-3 sentences)
5. Budget summary: Brief mention of the requested amount and how funds will be used (1-2 sentences)
6. Closing: Express enthusiasm and willingness to submit a full proposal

Keep it under 500 words. Professional but warm tone. Do not use placeholder brackets — write complete sentences using the provided data.`;

export interface LoiContext {
  org_id: string;
  user_id: string;
  subscription_tier: string;
}

export async function generateLOI(
  org: OrgProfile,
  grant: GrantDetails,
  ctx: LoiContext,
  projectSummary?: string
): Promise<string> {
  const userMessage = `Generate a Letter of Intent for:

ORGANIZATION:
Name: ${org.name}
Mission: ${org.mission_statement}
Type: ${org.entity_type}
Location: ${org.city ?? "Unknown"}, ${org.state ?? "Unknown"}
Annual Budget: ${org.annual_budget ? `$${org.annual_budget.toLocaleString()}` : "Not specified"}
Staff: ${org.employee_count ?? "Not specified"}
Programs: ${org.program_areas.join(", ") || "Not specified"}
Populations Served: ${org.population_served.join(", ") || "Not specified"}

GRANT OPPORTUNITY:
Name: ${grant.name}
Funder: ${grant.funder_name}
Description: ${grant.description ?? "Not specified"}
Award Range: ${grant.amount_min ? `$${grant.amount_min.toLocaleString()}` : "?"} - ${grant.amount_max ? `$${grant.amount_max.toLocaleString()}` : "?"}
Deadline: ${grant.deadline ?? "Rolling"}
Focus Areas: ${grant.focus_areas ?? "Not specified"}

${projectSummary ? `PROJECT SUMMARY:\n${projectSummary}` : ""}

Write the LOI now.`;

  const response = await aiCall({
    provider: "anthropic",
    model: ANTHROPIC_MODELS.SCORING,
    systemPrompt: LOI_SYSTEM_PROMPT,
    userInput: userMessage,
    promptId: "writing.loi.v1",
    orgId: ctx.org_id,
    userId: ctx.user_id,
    tier: ctx.subscription_tier,
    actionType: "loi",
    maxTokens: 2048,
    temperature: 0.4,
  });

  return response.content || "Unable to generate LOI. Please try again.";
}
