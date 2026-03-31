// grantiq/src/lib/ai/writing/budget-narrative.ts

import { getAnthropicClient, MODELS } from "@/lib/ai/client";
import type { BudgetLineItem } from "@/components/budget/budget-builder";

export interface BudgetNarrativeResult {
  narratives: Record<string, string>; // keyed by line item id
  categoryJustifications: Record<string, string>; // keyed by category key
  overallNarrative: string;
  totalWords: number;
}

export interface BudgetNarrativeContext {
  grantName: string;
  funderName: string;
  sourceType: string;
  amountMax: number | null;
  orgName?: string;
  projectDescription?: string;
}

const SYSTEM_PROMPT = `You are a professional grant writer specializing in budget justifications.
Your task is to write clear, specific, and defensible budget narrative text that directly connects
each budget line item to project activities and grant requirements.

Guidelines:
- Be specific: reference quantities, rates, and timeframes from the budget
- Connect costs to project outcomes and deliverables
- Use professional grant writing language
- Avoid filler phrases like "this cost is necessary" — instead explain WHY
- For personnel: explain the role's contribution to project goals
- For indirect costs: explain the rate basis and what overhead covers
- Keep each line item justification to 2-4 sentences
- Category summaries should be 1-2 sentences contextualizing all items in that category`;

export async function generateBudgetNarrative(
  lineItems: BudgetLineItem[],
  grantDetails: BudgetNarrativeContext
): Promise<BudgetNarrativeResult> {
  const client = getAnthropicClient();

  const budgetSummary = lineItems
    .map(
      (item) =>
        `- [${item.category}] ${item.description}: ${item.quantity} x $${item.unitCost.toLocaleString()} = $${item.total.toLocaleString()}`
    )
    .join("\n");

  const totalBudget = lineItems.reduce((sum, i) => sum + i.total, 0);

  const prompt = `Generate a budget narrative for the following grant application:

Grant: ${grantDetails.grantName}
Funder: ${grantDetails.funderName}
Grant Type: ${grantDetails.sourceType}
Total Budget Requested: $${totalBudget.toLocaleString()}
${grantDetails.orgName ? `Organization: ${grantDetails.orgName}` : ""}
${grantDetails.projectDescription ? `Project Description: ${grantDetails.projectDescription}` : ""}

Budget Line Items:
${budgetSummary}

Return a JSON object with this exact structure:
{
  "narratives": {
    "<line_item_id>": "<2-4 sentence justification for this specific line item>"
  },
  "categoryJustifications": {
    "<category_key>": "<1-2 sentence overview of why this category is needed>"
  },
  "overallNarrative": "<3-5 sentence overall budget narrative introduction>"
}

The line item IDs to use are: ${lineItems.map((i) => i.id).join(", ")}
The category keys to use are: ${[...new Set(lineItems.map((i) => i.category))].join(", ")}`;

  const response = await client.messages.create({
    model: MODELS.SCORING, // claude-sonnet — cost-effective for structured content
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  // Extract JSON from response (handle markdown code fences)
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    narratives: Record<string, string>;
    categoryJustifications: Record<string, string>;
    overallNarrative: string;
  };

  const allText = [
    parsed.overallNarrative,
    ...Object.values(parsed.narratives),
    ...Object.values(parsed.categoryJustifications),
  ].join(" ");

  const totalWords = allText.split(/\s+/).filter(Boolean).length;

  return {
    narratives: parsed.narratives,
    categoryJustifications: parsed.categoryJustifications,
    overallNarrative: parsed.overallNarrative,
    totalWords,
  };
}
