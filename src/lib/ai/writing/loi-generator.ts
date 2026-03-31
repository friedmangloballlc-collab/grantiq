// grantiq/src/lib/ai/writing/loi-generator.ts
//
// Generates a Letter of Intent using Claude Sonnet (cheaper / faster than Opus).
// Used by the LOI writing module at /grants/[id]/loi.

import Anthropic from "@anthropic-ai/sdk";
import { LOI_GENERATOR_SYSTEM_PROMPT } from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface OrgProfile {
  name: string;
  mission: string;
  entity_type: string;
  state?: string | null;
  city?: string | null;
  annual_budget?: number | null;
}

export interface GrantDetails {
  name: string;
  funder_name: string;
  source_type?: string | null;
  amount_max?: number | null;
  description?: string | null;
  category?: string | null;
}

export interface LOIOutput {
  loi_text: string;
  word_count: number;
  subject_line: string;
  key_themes: string[];
}

/**
 * Generates a Letter of Intent using Claude Sonnet.
 * Cheaper and faster than Opus — appropriate for a $49 LOI product.
 */
export async function generateLOI(
  orgProfile: OrgProfile,
  grantDetails: GrantDetails,
  projectSummary: string
): Promise<LOIOutput> {
  const userMessage = buildLOIUserMessage(orgProfile, grantDetails, projectSummary);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: LOI_GENERATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawContent = response.content[0];
  if (rawContent.type !== "text") {
    throw new Error("Unexpected response type from LOI generator");
  }

  let parsed: LOIOutput;
  try {
    parsed = JSON.parse(rawContent.text);
  } catch {
    throw new Error("LOI generator returned invalid JSON: " + rawContent.text.slice(0, 200));
  }

  if (!parsed.loi_text || typeof parsed.loi_text !== "string") {
    throw new Error("LOI generator response missing loi_text field");
  }

  return parsed;
}

function buildLOIUserMessage(
  org: OrgProfile,
  grant: GrantDetails,
  projectSummary: string
): string {
  const budgetLine = grant.amount_max
    ? `Funding requested: $${grant.amount_max.toLocaleString()}`
    : "Funding amount: TBD / as appropriate";

  const orgBudget = org.annual_budget
    ? `$${org.annual_budget.toLocaleString()}`
    : "Not specified";

  return `## Organization Profile
Name: ${org.name}
Mission: ${org.mission}
Entity Type: ${org.entity_type}
Location: ${[org.city, org.state].filter(Boolean).join(", ") || "Not specified"}
Annual Budget: ${orgBudget}

## Grant Opportunity
Title: ${grant.name}
Funder: ${grant.funder_name}
Type: ${grant.source_type ?? "Not specified"}
Category: ${grant.category ?? "Not specified"}
${budgetLine}
Funder Description / Priorities:
${grant.description ?? "Not provided — use what is known about this funder type."}

## Project Summary (from applicant)
${projectSummary}

---
Please write a compelling, one-page Letter of Intent as specified. Output only valid JSON.`;
}
