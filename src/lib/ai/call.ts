import * as Sentry from "@sentry/nextjs";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getOpenAIClient,
  getAnthropicClient,
  estimateCostCents,
  estimateAnthropicCostCents,
  MODELS,
} from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { detectPromptInjection, sanitizeInput } from "@/lib/ai/sanitize";
import {
  checkUsageLimit,
  recordUsage,
  UsageLimitError,
  type AiActionType,
} from "@/lib/ai/usage";

export type AiProvider = "openai" | "anthropic";

export interface AiCallOptions {
  /** Provider — defaults to 'openai'. Anthropic path requires `promptId`. */
  provider?: AiProvider;
  /** Model to use — defaults to MODELS.SCORING (gpt-4o-mini) for OpenAI */
  model?: string;
  /** System prompt (not sanitized — internal use only) */
  systemPrompt: string;
  /** Raw user-supplied input — will be sanitized + injection-checked */
  userInput: string;
  /**
   * Optional cacheable context (Anthropic only).
   *
   * Stable-per-session content (org profile, etc.) injected as a separate
   * cached user-message block before `userInput`. Sanitized + injection-checked
   * the same as userInput. Auto-marked with `cache_control: { ttl: '5m' }`
   * by the Anthropic branch — callers never write cache_control headers
   * by hand.
   *
   * For cache-key stability, callers should produce this string via
   * `canonicalStringify` from `@/lib/ai/stringify` so the same logical content
   * always serializes to the same bytes.
   */
  cacheableContext?: string;
  /**
   * Observability tag for ad-hoc SQL aggregation (e.g. cache hit rate per
   * prompt). REQUIRED when `provider === 'anthropic'`. Format convention:
   * `<domain>.<feature>.v<N>` (e.g. 'writing.draft.v1'). Recorded to
   * `ai_generations.prompt_id`.
   */
  promptId?: string;
  /**
   * Optional session id for usage-row dedup. When supplied, recordUsage
   * upserts on (org_id, action_type, session_id) so a multi-call session
   * (e.g. a 6-section drafting run) produces ONE ai_usage row total
   * instead of six. For draft-generator this is `grant_application_id`.
   * The actual upsert plumbing lands in Unit 5 — this param is plumbed
   * through now so call sites can adopt incrementally.
   */
  sessionId?: string;
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
  /** Anthropic-only: tokens written to the prompt cache on this call. */
  cacheCreationTokens?: number;
  /** Anthropic-only: tokens read from the prompt cache on this call. */
  cacheReadTokens?: number;
  /** Anthropic-only: stop_reason from the response (e.g. 'end_turn', 'max_tokens'). */
  stopReason?: string;
}

export class PromptInjectionError extends Error {
  constructor(public pattern: string) {
    super(
      "Input contains a disallowed pattern and cannot be processed. Please revise your input."
    );
    this.name = "PromptInjectionError";
  }
}

export class PromptIdRequiredError extends Error {
  constructor() {
    super("promptId is required when provider === 'anthropic'");
    this.name = "PromptIdRequiredError";
  }
}

export class UnexpectedBlockTypeError extends Error {
  constructor(public blockType: string) {
    super(`Unexpected Anthropic response block type: '${blockType}'. Week-1 scope only handles 'text' blocks.`);
    this.name = "UnexpectedBlockTypeError";
  }
}

// --------------------------------------------------------------------------
// Internal: provider-specific call helpers
// --------------------------------------------------------------------------

interface OpenAICallParams {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  userInput: string;
  responseFormat?: { type: "json_object" | "text" };
}

interface ProviderCallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  stopReason?: string;
}

async function callOpenAI(params: OpenAICallParams): Promise<ProviderCallResult> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userInput },
    ],
    ...(params.responseFormat ? { response_format: params.responseFormat } : {}),
  });

  return {
    content: response.choices[0]?.message?.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

interface AnthropicCallParams {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  cacheableContext?: string;
  userInput: string;
}

/**
 * Single-attempt Anthropic call. Caller wraps with retry semantics.
 *
 * Cache control:
 *   - systemPrompt is auto-marked with `ttl: '1h'` (rarely changes)
 *   - cacheableContext (when present) is auto-marked with `ttl: '5m'`
 *   - userInput is NEVER cached — flows to the message tail
 *
 * Response normalization (R26):
 *   - Concatenates all `type: 'text'` blocks in order
 *   - Throws UnexpectedBlockTypeError on any non-text block (tool_use, etc.)
 *     in week-1 scope; stop_reason is surfaced for max_tokens detection
 */
async function callAnthropicOnce(params: AnthropicCallParams): Promise<ProviderCallResult> {
  const anthropic = getAnthropicClient();

  const userMessages: Anthropic.MessageParam[] = [];
  if (params.cacheableContext) {
    userMessages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: params.cacheableContext,
          cache_control: { type: "ephemeral", ttl: "5m" },
        } as Anthropic.TextBlockParam,
      ],
    });
  }
  userMessages.push({ role: "user", content: params.userInput });

  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    system: [
      {
        type: "text",
        text: params.systemPrompt,
        cache_control: { type: "ephemeral", ttl: "1h" },
      } as Anthropic.TextBlockParam,
    ],
    messages: userMessages,
  });

  // Normalize: concat text blocks, throw on unexpected block types.
  const textParts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text") {
      textParts.push(block.text);
    } else {
      throw new UnexpectedBlockTypeError(block.type);
    }
  }

  return {
    content: textParts.join(""),
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    cacheCreationTokens: response.usage?.cache_creation_input_tokens ?? 0,
    cacheReadTokens: response.usage?.cache_read_input_tokens ?? 0,
    stopReason: response.stop_reason ?? undefined,
  };
}

/**
 * Retry wrapper for Anthropic calls (R27).
 *
 * Strict whitelist: only `5xx` and `529 overloaded` HTTP errors retry.
 * Local exceptions (UnexpectedBlockTypeError, JSON parse failures, etc.)
 * propagate immediately on attempt 1 — no point retrying a deterministic
 * client-side failure.
 *
 * Up to 2 attempts total with exponential backoff (1s, 3s).
 * Recording happens once on final success only — never partial.
 */
async function callAnthropicWithRetry(params: AnthropicCallParams): Promise<ProviderCallResult> {
  const RETRY_DELAYS_MS = [1000, 3000];
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callAnthropicOnce(params);
    } catch (err) {
      lastError = err;
      const isRetryable = isRetryableAnthropicError(err);
      const isLastAttempt = attempt === 1;
      if (!isRetryable || isLastAttempt) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  // Unreachable; the loop either returns or throws. TypeScript needs this for narrowing.
  throw lastError;
}

function isRetryableAnthropicError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (typeof status !== "number") return false;
  return status === 529 || (status >= 500 && status < 600);
}

// --------------------------------------------------------------------------
// Public: aiCall
// --------------------------------------------------------------------------

/**
 * Core AI call wrapper. Handles:
 * 1. Prompt injection detection (userInput AND cacheableContext)
 * 2. Input sanitization (userInput AND cacheableContext)
 * 3. Usage limit checking
 * 4. Provider dispatch (openai | anthropic)
 *    - Anthropic branch: auto cache_control on systemPrompt + cacheableContext;
 *      response normalization; retry on 5xx/529 only
 * 5. Usage recording (ai_usage + ai_generations) — best-effort, observable
 *    failures via Sentry + logger.error("ai_recording_failed").
 */
export async function aiCall(options: AiCallOptions): Promise<AiCallResult> {
  const {
    provider = "openai",
    model = MODELS.SCORING,
    systemPrompt,
    userInput,
    cacheableContext,
    promptId,
    sessionId,
    orgId,
    userId,
    tier,
    actionType,
    maxTokens = 2048,
    skipUsageCheck = false,
    temperature = 0,
    responseFormat,
  } = options;

  // 0. Anthropic-specific validation
  if (provider === "anthropic" && !promptId) {
    throw new PromptIdRequiredError();
  }

  // 1. Prompt injection detection — userInput AND cacheableContext (R12)
  const userInjection = detectPromptInjection(userInput);
  if (userInjection.detected) {
    throw new PromptInjectionError(userInjection.pattern ?? "unknown");
  }
  if (cacheableContext) {
    const ctxInjection = detectPromptInjection(cacheableContext);
    if (ctxInjection.detected) {
      throw new PromptInjectionError(ctxInjection.pattern ?? "unknown");
    }
  }

  // 2. Sanitize both inputs
  const sanitizedUserInput = sanitizeInput(userInput);
  const sanitizedCacheableContext = cacheableContext
    ? sanitizeInput(cacheableContext)
    : undefined;

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

  // 4. Provider dispatch
  let providerResult: ProviderCallResult;
  if (provider === "anthropic") {
    providerResult = await callAnthropicWithRetry({
      model,
      maxTokens,
      temperature,
      systemPrompt,
      cacheableContext: sanitizedCacheableContext,
      userInput: sanitizedUserInput,
    });
  } else {
    providerResult = await callOpenAI({
      model,
      maxTokens,
      temperature,
      systemPrompt,
      userInput: sanitizedUserInput,
      responseFormat,
    });
  }

  const {
    content,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    stopReason,
  } = providerResult;

  // 5. Cost estimation — provider-aware
  const costCents =
    provider === "anthropic"
      ? estimateAnthropicCostCents(
          model,
          inputTokens,
          outputTokens,
          cacheCreationTokens ?? 0,
          cacheReadTokens ?? 0,
          "1h"
        )
      : estimateCostCents(model, inputTokens, outputTokens);

  // 6. Record usage — fire-and-forget (don't block on errors)
  // sessionId routes through the RPC upsert (Unit 5 / migration 00053) so a
  // multi-call drafting session counts as ONE ai_usage row instead of N.
  const usagePromise = recordUsage({
    orgId,
    actionType,
    tokensInput: inputTokens,
    tokensOutput: outputTokens,
    estimatedCostCents: costCents,
    sessionId,
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
  //
  // Anthropic columns (Unit 4): prompt_id, cache_creation_tokens, cache_read_tokens
  // are nullable on the schema and only populated for provider === 'anthropic'.
  const generationsPromise = (async () => {
    if (!userId) {
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
      prompt_id: promptId ?? null,
      cache_creation_tokens: cacheCreationTokens ?? null,
      cache_read_tokens: cacheReadTokens ?? null,
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
        extra: { org_id: orgId, action_type: actionType, model, prompt_id: promptId },
      });
    }
  })();

  // Await both but don't throw on failure — usage recording is best-effort
  await Promise.allSettled([usagePromise, generationsPromise]);

  return {
    content,
    inputTokens,
    outputTokens,
    costCents,
    model,
    ...(cacheCreationTokens !== undefined ? { cacheCreationTokens } : {}),
    ...(cacheReadTokens !== undefined ? { cacheReadTokens } : {}),
    ...(stopReason !== undefined ? { stopReason } : {}),
  };
}
