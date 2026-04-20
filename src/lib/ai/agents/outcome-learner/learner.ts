// grantiq/src/lib/ai/agents/outcome-learner/learner.ts
//
// Agent #5 — Outcome Learning Agent.
//
// Trigger: pipeline stage transitions to a terminal state
// (awarded | declined | withdrawn).
// Job:
// 1. Insert one org_funder_history row (per-org trail of this funder).
// 2. If we have either submitted-draft content or funder feedback text,
//    run Opus to extract cross-org funder_learnings so the next draft
//    for this funder can prompt on top of these signals.
//
// Design decisions:
// - Sonnet is too lossy for outcome analysis — winners/losers need
//   subtle language-level differentiation. STRATEGY (Opus) only.
// - Fail-open: never blocks the pipeline transition. History row
//   still inserts even if the LLM call fails.
// - Confidence bias: 'awarded-with-feedback' = 0.7, 'awarded-only' = 0.5,
//   'declined-with-feedback' = 0.6, 'declined-only' = 0.4,
//   'withdrawn' = 0.2 (almost no signal — user abandoned).
// - Dedup: upsert per-pipeline history row (unique index). Funder
//   learnings accumulate; we re-use evidence_count to bump confidence.

import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  ExtractedLearning,
  LearnerInput,
  LearnerResult,
  LearningType,
} from "./types";

const VALID_TYPES: LearningType[] = [
  "winning_language",
  "losing_language",
  "budget_sweet_spot",
  "program_preference",
  "common_weakness",
  "common_strength",
  "evaluation_signal",
  "timing_insight",
];

const SYSTEM_PROMPT = `You are a grant-outcome analyst. Your job is to
extract FUNDER-SPECIFIC learnings from a real application outcome, so
future drafts for the same funder can prompt on top of these signals.

You will see:
1. The funder name + grant name
2. The outcome (awarded | declined | withdrawn)
3. The award amount (if awarded)
4. The submitted draft sections (sometimes)
5. Funder feedback text (sometimes, often absent)

EXTRACT learnings of these types:
- winning_language: specific phrases, framings, or rhetorical moves
  that appear in an AWARDED draft and look like they helped
- losing_language: phrases or framings in a DECLINED draft that likely
  hurt (boilerplate, vague claims, jargon-heavy passages)
- budget_sweet_spot: the award_amount that actually got funded —
  describes the funder's typical grant size
- program_preference: types of programs / populations / methods
  this funder favored (or rejected) in this application
- common_weakness: a specific weakness the feedback called out, or
  that's visible in a declined draft (capacity gaps, weak evaluation)
- common_strength: a specific strength the feedback highlighted, or
  visible in an awarded draft
- evaluation_signal: direct funder feedback quotes that should
  influence the next submission
- timing_insight: comments about when in the cycle they reviewed,
  their decision speed, resubmission windows

RULES:
- If there is NO feedback text AND NO draft sections, output an empty
  array. Pure outcome with no content = no extractable signal.
- Prefer quality over quantity. 1-5 strong learnings beats 20 weak ones.
- Each learning should be ACTIONABLE — useful for a future drafter.
- For every learning include example_quote when possible (verbatim
  from feedback or draft). Use null if no source text supports it.
- confidence is 0..1. Anchor:
  * 0.8+ only when funder feedback directly supports it
  * 0.5-0.7 when draft content strongly implies it for a clear win/loss
  * 0.3-0.5 when it's suggestive
  * below 0.3 — don't emit, it's noise

OUTPUT (JSON only, no markdown fences):
{
  "learnings": [
    {
      "learning_type": "winning_language" | "losing_language" | ...,
      "insight": "<1-2 sentence actionable takeaway>",
      "example_quote": "<verbatim from feedback or draft>" | null,
      "confidence": 0.0..1.0
    }
  ]
}`;

interface RawResponse {
  learnings?: Array<{
    learning_type?: string;
    insight?: string;
    example_quote?: string | null;
    confidence?: number;
  }>;
}

function normalizeType(t: string | undefined): LearningType | null {
  if (t && VALID_TYPES.includes(t as LearningType)) return t as LearningType;
  return null;
}

function clampConfidence(c: unknown): number {
  const n = typeof c === "number" ? c : 0;
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export async function learnFromOutcome(
  input: LearnerInput
): Promise<LearnerResult> {
  const admin = createAdminClient();
  let tokensUsed = { input: 0, output: 0, cached: 0 };

  // 1. Always attempt to insert the org_funder_history row first.
  //    The unique index on pipeline_id makes re-runs idempotent.
  let historyInserted = false;
  try {
    const { error } = await admin.from("org_funder_history").upsert(
      {
        org_id: input.orgId,
        funder_id: input.funderId,
        funder_name: input.funderName,
        pipeline_id: input.pipelineId,
        outcome: input.outcome,
        award_amount: input.awardAmount,
        decision_date: input.decisionDate,
        submitted_draft_id: input.draftId,
        funder_feedback_text: input.funderFeedbackText,
      },
      { onConflict: "pipeline_id" }
    );
    if (error) {
      logger.warn("outcome_learner history_insert_failed", {
        pipelineId: input.pipelineId,
        err: error.message,
      });
    } else {
      historyInserted = true;
    }
  } catch (err) {
    logger.error("outcome_learner history_insert_exception", {
      pipelineId: input.pipelineId,
      err: String(err),
    });
  }

  // 2. Decide whether we have enough signal for the LLM call.
  const hasDraft =
    input.draftSections &&
    Object.values(input.draftSections).some(
      (v) => typeof v === "string" && v.trim().length > 100
    );
  const hasFeedback =
    input.funderFeedbackText && input.funderFeedbackText.trim().length > 20;

  if (input.outcome === "withdrawn" && !hasFeedback) {
    // Withdrawn without feedback = org changed plans, zero signal.
    return {
      learnings: [],
      historyInserted,
      funderLearningsInserted: 0,
      verdict: "no_signal",
      tokensUsed,
    };
  }

  if (!hasDraft && !hasFeedback) {
    return {
      learnings: [],
      historyInserted,
      funderLearningsInserted: 0,
      verdict: "insufficient_data",
      tokensUsed,
    };
  }

  // 3. Build the analysis prompt.
  const draftSummary =
    hasDraft && input.draftSections
      ? Object.entries(input.draftSections)
          .map(
            ([section, text]) =>
              `--- ${section.toUpperCase()} ---\n${(text ?? "").slice(0, 3000)}`
          )
          .join("\n\n")
      : "(not available)";

  const userInput = `Analyze this grant outcome and extract funder learnings.

FUNDER: ${input.funderName}
GRANT: ${input.grantName}
OUTCOME: ${input.outcome}
${input.awardAmount ? `AWARD AMOUNT: $${input.awardAmount}` : ""}
DECISION DATE: ${input.decisionDate}

FUNDER FEEDBACK TEXT:
${input.funderFeedbackText ?? "(no feedback captured)"}

SUBMITTED DRAFT:
${draftSummary}`;

  let learnings: ExtractedLearning[] = [];
  let sourceGenerationId: string | null = null;
  try {
    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.STRATEGY,
      systemPrompt: SYSTEM_PROMPT,
      userInput,
      promptId: "learning.outcome_learner.v1",
      sessionId: input.pipelineId,
      orgId: input.orgId,
      userId: input.userId,
      tier: input.subscriptionTier,
      actionType: "audit",
      maxTokens: 2500,
      temperature: 0.2,
    });

    tokensUsed = {
      input: response.inputTokens,
      output: response.outputTokens,
      cached: response.cacheReadTokens ?? 0,
    };

    let parsed: RawResponse;
    try {
      parsed = JSON.parse(response.content) as RawResponse;
    } catch {
      logger.warn("outcome_learner parse_failed", {
        pipelineId: input.pipelineId,
      });
      return {
        learnings: [],
        historyInserted,
        funderLearningsInserted: 0,
        verdict: "unavailable",
        tokensUsed,
      };
    }

    const raw = Array.isArray(parsed.learnings) ? parsed.learnings : [];
    learnings = raw
      .map((l) => {
        const type = normalizeType(l?.learning_type);
        if (!type) return null;
        const insight = typeof l?.insight === "string" ? l.insight.trim() : "";
        if (insight.length < 10) return null;
        return {
          learning_type: type,
          insight,
          example_quote:
            typeof l?.example_quote === "string" ? l.example_quote : null,
          confidence: clampConfidence(l?.confidence),
        } as ExtractedLearning;
      })
      .filter((x): x is ExtractedLearning => x !== null && x.confidence >= 0.3);
  } catch (err) {
    logger.error("outcome_learner ai_call_failed", {
      pipelineId: input.pipelineId,
      err: String(err),
    });
    return {
      learnings: [],
      historyInserted,
      funderLearningsInserted: 0,
      verdict: "unavailable",
      tokensUsed,
    };
  }

  if (learnings.length === 0) {
    return {
      learnings: [],
      historyInserted,
      funderLearningsInserted: 0,
      verdict: "no_signal",
      tokensUsed,
    };
  }

  // 4. Insert funder_learnings. No upsert — each outcome-analysis gets
  //    its own rows; evidence aggregation happens in analytics SQL.
  const rows = learnings.map((l) => ({
    funder_id: input.funderId,
    funder_name: input.funderName,
    learning_type: l.learning_type,
    insight: l.insight,
    example_quote: l.example_quote,
    confidence: l.confidence,
    source_generation_id: sourceGenerationId,
  }));

  let funderLearningsInserted = 0;
  const { error: insertErr, count } = await admin
    .from("funder_learnings")
    .insert(rows, { count: "exact" });

  if (insertErr) {
    logger.error("outcome_learner learnings_insert_failed", {
      pipelineId: input.pipelineId,
      err: insertErr.message,
    });
  } else {
    funderLearningsInserted = count ?? rows.length;
  }

  // Update the org_funder_history analysis_summary with the top insight.
  if (historyInserted && learnings.length > 0) {
    const topInsight = learnings
      .sort((a, b) => b.confidence - a.confidence)[0]!.insight.slice(0, 500);
    await admin
      .from("org_funder_history")
      .update({ analysis_summary: topInsight })
      .eq("pipeline_id", input.pipelineId)
      .then(({ error: updErr }) => {
        if (updErr) {
          logger.warn("outcome_learner history_update_failed", {
            pipelineId: input.pipelineId,
            err: updErr.message,
          });
        }
      });
  }

  return {
    learnings,
    historyInserted,
    funderLearningsInserted,
    verdict: "extracted",
    tokensUsed,
  };
}
