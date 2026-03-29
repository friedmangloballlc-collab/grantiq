import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, estimateCostCents, MODELS } from "@/lib/ai/client";
import { detectPromptInjection, sanitizeInput } from "@/lib/ai/sanitize";
import {
  checkUsageLimit,
  recordUsage,
  UsageLimitError,
} from "@/lib/ai/usage";

export interface AiCallOptions {
  /** Model to use — defaults to MODELS.SCORING */
  model?: string;
  /** System prompt (not sanitized — internal use only) */
  systemPrompt: string;
  /** Raw user-supplied input — will be sanitized + injection-checked */
  userInput: string;
  /** org_id from the orgs table */
  orgId: string;
  /** Subscription tier (free | starter | growth | agency) */
  tier: string;
  /** Which action type this call counts toward (match, draft, chat, etc.) */
  actionType: string;
  /** Max tokens for the response */
  maxTokens?: number;
  /** Skip usage limit check (for internal / cron jobs) */
  skipUsageCheck?: boolean;
  /** Temperature — defaults to 0 for deterministic scoring */
  temperature?: number;
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
 * Core AI call wrapper. Handles:
 * 1. Prompt injection detection
 * 2. Input sanitization
 * 3. Usage limit checking
 * 4. Claude API call
 * 5. Usage recording (ai_usage + ai_generations)
 */
export async function aiCall(options: AiCallOptions): Promise<AiCallResult> {
  const {
    model = MODELS.SCORING,
    systemPrompt,
    userInput,
    orgId,
    tier,
    actionType,
    maxTokens = 2048,
    skipUsageCheck = false,
    temperature = 0,
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

  // 4. Call Claude
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: sanitized }],
  });

  const content =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costCents = estimateCostCents(model, inputTokens, outputTokens);

  // 5. Record usage — fire-and-forget (don't block on errors)
  const usagePromise = recordUsage({
    orgId,
    actionType,
    tokensInput: inputTokens,
    tokensOutput: outputTokens,
    estimatedCostCents: costCents,
  });

  // Also insert into ai_generations for detailed audit trail
  const generationsPromise = (async () => {
    const db = createAdminClient();
    const { error } = await db.from("ai_generations").insert({
      org_id: orgId,
      action_type: actionType,
      model,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      estimated_cost_cents: costCents,
    });
    if (error) {
      console.error("Failed to record ai_generations entry:", error);
    }
  })();

  // Await both but don't throw on failure — usage recording is best-effort
  await Promise.allSettled([usagePromise, generationsPromise]);

  return { content, inputTokens, outputTokens, costCents, model };
}
