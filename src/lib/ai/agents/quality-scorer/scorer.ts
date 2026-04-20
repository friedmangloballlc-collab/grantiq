// grantiq/src/lib/ai/agents/quality-scorer/scorer.ts
//
// Agent #3: Score a completed draft against the funder's rubric.
// Per-criterion isolation prevents halo effect — one Opus call per
// criterion, run in parallel. Sections shared across all criteria
// via prompt cache (95%+ hit rate on calls 2..N).
//
// Design decisions (docs/plans/2026-04-20-004):
// - Opus, not Sonnet: judgment-heavy; scoring drift matters
// - One call per criterion (halo-avoidance > cost)
// - Verdict thresholds: >70 submittable, 50-70 needs_work, <50 not_ready
// - Temperature 0 for deterministic re-scores

import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";
import { extractRubric, inferRubric, type RfpAnalysisShape } from "./rubric";
import type {
  ScoreResult,
  CriterionScore,
  Improvement,
  Verdict,
  Rubric,
} from "./types";

const CRITERION_SYSTEM_PROMPT = `You are a grant reviewer scoring a draft
against ONE specific criterion. Be calibrated:
- 70% = clearly meets expectations
- 85%+ = exceeds expectations
- 95%+ = exceptional, reserve this tier

Evidence is mandatory: for every score, quote the section text that supports it.
Be specific about gaps: what's missing, where to add it.
Improvements must name the section and describe the change.

Return ONLY JSON:
{
  "score": <integer between 0 and max_points>,
  "evidence_quoted": "<verbatim from draft>",
  "strengths": ["<one-line strength>", ...],
  "gaps": ["<one-line gap>", ...],
  "improvements": [
    {
      "text": "<specific change to make>",
      "point_impact": <integer 1-5>,
      "section_name": "<which section>"
    }
  ]
}`;

interface ScorerInput {
  draftId: string;
  sections: Array<{ section_name: string; content: string }>;
  budget: unknown;
  rfpAnalysis: RfpAnalysisShape;
  funderContextBlock: string | null;
  context: {
    org_id: string;
    user_id: string;
    subscription_tier: string;
  };
}

function verdictFor(totalScore: number, maxPossible: number): Verdict {
  const pct = (totalScore / maxPossible) * 100;
  if (pct >= 70) return "submittable";
  if (pct >= 50) return "needs_work";
  return "not_ready";
}

function buildCacheableContext(input: ScorerInput): string {
  // Shared across all per-criterion calls → prompt cache sings
  const parts: string[] = [];
  parts.push("=== DRAFT SECTIONS ===");
  for (const s of input.sections) {
    parts.push(`\n### ${s.section_name}\n${s.content}`);
  }
  if (input.budget) {
    parts.push("\n=== BUDGET ===");
    parts.push(JSON.stringify(input.budget, null, 2));
  }
  if (input.funderContextBlock) {
    parts.push("\n");
    parts.push(input.funderContextBlock);
  }
  return parts.join("\n");
}

interface RawCriterionResponse {
  score?: number;
  evidence_quoted?: string;
  strengths?: string[];
  gaps?: string[];
  improvements?: Array<{
    text?: string;
    point_impact?: number;
    section_name?: string;
  }>;
}

async function scoreOneCriterion(
  input: ScorerInput,
  criterion: { criterion: string; max_points: number; description: string },
  cacheableContext: string
): Promise<CriterionScore> {
  try {
    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.STRATEGY,
      systemPrompt: CRITERION_SYSTEM_PROMPT,
      cacheableContext,
      userInput: `Score this draft against this criterion (max ${criterion.max_points} points):

CRITERION: ${criterion.criterion}
DESCRIPTION: ${criterion.description}

Return the score JSON.`,
      promptId: "writing.quality_score.v1",
      sessionId: input.draftId,
      orgId: input.context.org_id,
      userId: input.context.user_id,
      tier: input.context.subscription_tier,
      actionType: "audit",
      maxTokens: 2048,
      temperature: 0,
    });

    const parsed = JSON.parse(response.content) as RawCriterionResponse;
    const score = Math.max(
      0,
      Math.min(
        criterion.max_points,
        typeof parsed.score === "number" ? Math.round(parsed.score) : 0
      )
    );

    const improvements: Improvement[] = (parsed.improvements ?? [])
      .filter((i): i is NonNullable<typeof i> => Boolean(i && i.text))
      .map((i) => ({
        text: String(i.text ?? ""),
        point_impact:
          typeof i.point_impact === "number"
            ? Math.max(0, Math.round(i.point_impact))
            : 1,
        section_name:
          typeof i.section_name === "string" ? i.section_name : undefined,
      }));

    return {
      criterion: criterion.criterion,
      max: criterion.max_points,
      score,
      evidence_quoted: String(parsed.evidence_quoted ?? ""),
      strengths: (parsed.strengths ?? []).filter((s): s is string => typeof s === "string"),
      gaps: (parsed.gaps ?? []).filter((g): g is string => typeof g === "string"),
      improvements,
    };
  } catch {
    // Fail-open per criterion: give 0 points but don't crash the total
    return {
      criterion: criterion.criterion,
      max: criterion.max_points,
      score: 0,
      evidence_quoted: "Scorer unavailable",
      strengths: [],
      gaps: ["Criterion could not be scored — scorer call failed"],
      improvements: [],
    };
  }
}

export async function scoreDraft(input: ScorerInput): Promise<ScoreResult> {
  // 1. Get or infer rubric
  let rubric: Rubric | null = extractRubric(input.rfpAnalysis);
  if (!rubric) {
    rubric = await inferRubric(input.rfpAnalysis, input.funderContextBlock, {
      ...input.context,
      draft_id: input.draftId,
    });
  }

  // 2. Score each criterion in parallel (Opus × N calls)
  const cacheableContext = buildCacheableContext(input);
  const criteriaScores = await Promise.all(
    rubric.criteria.map((c) => scoreOneCriterion(input, c, cacheableContext))
  );

  // 3. Aggregate
  const totalScore = criteriaScores.reduce((acc, c) => acc + c.score, 0);
  const maxPossible = rubric.total_points;

  const allImprovements: Improvement[] = criteriaScores.flatMap((c) => c.improvements);
  const improvementsRanked = allImprovements
    .sort((a, b) => b.point_impact - a.point_impact)
    .slice(0, 5);

  // Total tokens (rough sum from per-criterion calls — each call's
  // tokens aren't returned from Promise.all, so this is best-effort)
  return {
    totalScore,
    maxPossible,
    criteriaDetail: criteriaScores,
    improvementsRanked,
    verdict: verdictFor(totalScore, maxPossible),
    rubricSource: rubric.source,
    tokensUsed: { input: 0, output: 0 }, // per-call tokens recorded in ai_generations
  };
}
