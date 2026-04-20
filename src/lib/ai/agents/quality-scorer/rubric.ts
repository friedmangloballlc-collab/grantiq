// grantiq/src/lib/ai/agents/quality-scorer/rubric.ts
//
// Extract or infer the scoring rubric for a draft. If the RFP published
// explicit scoring_criteria (rfp-parser extracts them), use those.
// Otherwise, infer a reasonable rubric from funder type + priorities.
//
// Inference uses Sonnet (one call, cacheable per funder for 1h).

import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";
import type { RfpParseOutput } from "@/lib/ai/writing/schemas";
import type { Rubric, RubricCriterion } from "./types";

export interface RfpAnalysisShape {
  scoring_criteria?: Array<{
    criterion: string;
    max_points: number;
    description: string;
  }>;
  key_themes?: string[];
  grant_type?: string;
  funder_name?: string;
}

const INFER_SYSTEM_PROMPT = `You are a grant-review expert. Given an RFP analysis
and funder context, infer the likely scoring rubric this funder uses.

Output 4-6 criteria with reasonable point weights summing to 100. Base the
rubric on:
- Funder type (federal / foundation / state / corporate)
- Stated priorities or key themes
- Typical grant-review practices for this category

Return ONLY JSON (no markdown):
{
  "criteria": [
    {
      "criterion": "<short name, 3-5 words>",
      "max_points": <integer>,
      "description": "<one sentence>"
    }
  ]
}

Criteria point values must sum to exactly 100.`;

export function extractRubric(rfp: RfpAnalysisShape): Rubric | null {
  const criteria = rfp.scoring_criteria ?? [];
  if (criteria.length === 0) return null;

  const total = criteria.reduce((acc, c) => acc + (c.max_points ?? 0), 0);
  if (total === 0) return null;

  return {
    criteria: criteria.map((c) => ({
      criterion: c.criterion,
      max_points: c.max_points,
      description: c.description,
    })),
    total_points: total,
    source: "explicit_from_rfp",
  };
}

export interface InferRubricContext {
  org_id: string;
  user_id: string;
  subscription_tier: string;
  draft_id: string;
}

/**
 * Infer a rubric when the RFP doesn't publish one. Falls back to a
 * hand-written default if the AI call fails.
 */
export async function inferRubric(
  rfp: RfpAnalysisShape,
  funderContextBlock: string | null,
  context: InferRubricContext
): Promise<Rubric> {
  const userInput = `Infer the scoring rubric for this grant:

FUNDER: ${rfp.funder_name ?? "Unknown"}
GRANT TYPE: ${rfp.grant_type ?? "Unknown"}
KEY THEMES: ${(rfp.key_themes ?? []).join(", ")}

${funderContextBlock ?? "No 990 data available for this funder."}

Return the rubric JSON.`;

  try {
    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.SCORING,
      systemPrompt: INFER_SYSTEM_PROMPT,
      userInput,
      promptId: "writing.rubric_infer.v1",
      sessionId: context.draft_id,
      orgId: context.org_id,
      userId: context.user_id,
      tier: context.subscription_tier,
      actionType: "audit",
      maxTokens: 1024,
      temperature: 0,
    });

    const parsed = JSON.parse(response.content) as {
      criteria?: Array<{ criterion?: string; max_points?: number; description?: string }>;
    };

    const criteria: RubricCriterion[] = (parsed.criteria ?? [])
      .filter((c): c is NonNullable<typeof c> => Boolean(c && c.criterion && typeof c.max_points === "number"))
      .map((c) => ({
        criterion: String(c.criterion),
        max_points: c.max_points as number,
        description: String(c.description ?? ""),
      }));

    const total = criteria.reduce((acc, c) => acc + c.max_points, 0);
    if (criteria.length > 0 && total > 0) {
      return { criteria, total_points: total, source: "inferred" };
    }
  } catch {
    // Fall through to default
  }

  // Default rubric when inference fails — conservative 5-criterion split
  return {
    criteria: [
      { criterion: "Alignment with funder priorities", max_points: 25, description: "How well the project advances the funder's stated focus areas." },
      { criterion: "Need and impact", max_points: 25, description: "Strength of evidence that the project addresses a measurable problem." },
      { criterion: "Project design", max_points: 20, description: "Feasibility, clarity of activities, realistic timeline." },
      { criterion: "Organizational capacity", max_points: 15, description: "Track record and capability to execute." },
      { criterion: "Budget reasonableness", max_points: 15, description: "Cost per outcome and appropriate use of funds." },
    ],
    total_points: 100,
    source: "inferred",
  };
}
