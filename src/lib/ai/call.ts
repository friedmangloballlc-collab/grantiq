import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient, estimateCostCents, MODELS } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { detectPromptInjection, sanitizeInput } from "@/lib/ai/sanitize";
import {
  checkUsageLimit,
  recordUsage,
  UsageLimitError,
  type AiActionType,
} from "@/lib/ai/usage";

export interface AiCallOptions {
  /** Model to use — defaults to MODELS.SCORING (gpt-4o-mini) */
  model?: string;
  /** System prompt (not sanitized — internal use only) */
  systemPrompt: string;
  /** Raw user-supplied input — will be sanitized + injection-checked */
  userInput: string;
  /** org_id from the orgs table */
  orgId: string;
  /** user_id for audit logging */
  userId?: string;
  /** Subscription tier (free | starter | growth | agency) */
  tier: string;
  /** Which action type this call counts toward (match, draft, chat, etc.) */
  actionType: AiActionType;
  /** Max tokens for the response */
  maxTokens?: number;
  /** Skip usage limit check (for internal / cron jobs) */
  skipUsageCheck?: boolean;
  /** Temperature — defaults to 0 for deterministic scoring */
  temperature?: number;
  /** Response format — use { type: "json_object" } for guaranteed valid JSON */
  responseFormat?: { type: "json_object" | "text" };
}

export interface AiCallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  model: string;
}

export class PromptInjectionError extends Error {
  constructor(public pattern: string) {
    super(
      "Input contains a disallowed pattern and cannot be processed. Please revise your input."
    );
    this.name = "PromptInjectionError";
  }
}

/**
 * Core AI call wrapper using OpenAI. Handles:
 * 1. Prompt injection detection
 * 2. Input sanitization
 * 3. Usage limit checking
 * 4. OpenAI API call
 * 5. Usage recording (ai_usage + ai_generations)
 */
export async function aiCall(options: AiCallOptions): Promise<AiCallResult> {
  const {
    model = MODELS.SCORING,
    systemPrompt,
    userInput,
    orgId,
    userId,
    tier,
    actionType,
    maxTokens = 2048,
    skipUsageCheck = false,
    temperature = 0,
    responseFormat,
  } = options;

  // 1. Prompt injection detection (on raw input before sanitization)
  const injectionResult = detectPromptInjection(userInput);
  if (injectionResult.detected) {
    throw new PromptInjectionError(injectionResult.pattern ?? "unknown");
  }

  // 2. Sanitize user input
  const sanitized = sanitizeInput(userInput);

  // 3. Check usage limits
  if (!skipUsageCheck) {
    const usageCheck = await checkUsageLimit(orgId, actionType, tier);
    if (!usageCheck.allowed) {
      throw new UsageLimitError(
        usageCheck.used,
        usageCheck.limit ?? 0,
        actionType,
        tier
      );
    }
  }

  // 4. Call OpenAI
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: sanitized },
    ],
    ...(responseFormat ? { response_format: responseFormat } : {}),
  });

  const content = response.choices[0]?.message?.content ?? "";
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const costCents = estimateCostCents(model, inputTokens, outputTokens);

  // 5. Record usage — fire-and-forget (don't block on errors)
  const usagePromise = recordUsage({
    orgId,
    actionType,
    tokensInput: inputTokens,
    tokensOutput: outputTokens,
    estimatedCostCents: costCents,
  });

  // Also insert into ai_generations for detailed audit trail.
  //
  // History note (BD-1, 2026-04-19): this insert previously used wrong column names
  // (`action_type` instead of `generation_type`, `model` instead of `model_used`) and
  // omitted the NOT NULL `user_id` column. Every insert silently failed for over a
  // year — the error was caught by Promise.allSettled below and logged with a generic
  // message that no alerting hook keyed on. Migration 00049 widens the CHECK constraints
  // and this insert now matches the schema. Recording failures emit a distinct
  // `ai_recording_failed` tag to BOTH logger.error AND Sentry so future regressions
  // surface immediately instead of disappearing.
  const generationsPromise = (async () => {
    if (!userId) {
      // user_id is NOT NULL in the ai_generations schema. Skip the insert rather than
      // crash; surface to Sentry so missing-userId call sites are caught.
      const err = new Error("ai_generations insert skipped: userId required but missing");
      logger.error("ai_recording_failed", {
        table: "ai_generations",
        org_id: orgId,
        action_type: actionType,
        reason: "missing_user_id",
      });
      Sentry.captureException(err, {
        tags: { tag: "ai_recording_failed", table: "ai_generations", reason: "missing_user_id" },
        extra: { org_id: orgId, action_type: actionType },
      });
      return;
    }
    const db = createAdminClient();
    const { error } = await db.from("ai_generations").insert({
      org_id: orgId,
      user_id: userId,
      generation_type: actionType,
      model_used: model,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      estimated_cost_cents: costCents,
    });
    if (error) {
      logger.error("ai_recording_failed", {
        table: "ai_generations",
        org_id: orgId,
        action_type: actionType,
        err: String(error),
      });
      Sentry.captureException(error, {
        tags: { tag: "ai_recording_failed", table: "ai_generations" },
        extra: { org_id: orgId, action_type: actionType, model },
      });
    }
  })();

  // Await both but don't throw on failure — usage recording is best-effort
  await Promise.allSettled([usagePromise, generationsPromise]);

  return { content, inputTokens, outputTokens, costCents, model };
}
