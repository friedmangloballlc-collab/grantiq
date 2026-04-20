import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ── Anthropic Client (kept for writing modules that need Opus quality) ─────

let anthropicInstance: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    anthropicInstance = new Anthropic({ apiKey });
  }
  return anthropicInstance;
}

// ── OpenAI Client (primary — used for scoring, readiness, chat) ────────────

let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

// ── Model Constants ────────────────────────────────────────────────────────

export const MODELS = {
  /** Primary model for scoring, readiness, chat — GPT-4o-mini (fast + cheap) */
  SCORING: "gpt-4o-mini" as const,
  /** Strategy/complex reasoning — GPT-4o (more capable) */
  STRATEGY: "gpt-4o" as const,
  /** Classification/simple tasks — GPT-4o-mini */
  CLASSIFY: "gpt-4o-mini" as const,
} as const;

// Anthropic models — these IDs must match Anthropic's live catalog.
// Only update CLASSIFY — the old haiku-4-20250414 ID appears stale and
// causes silent 404s in the match critic (no insert, no error surfaced).
// SCORING + STRATEGY left alone because the writing pipeline has been
// using them successfully.
export const ANTHROPIC_MODELS = {
  SCORING: "claude-sonnet-4-20250514" as const,
  STRATEGY: "claude-opus-4-20250514" as const,
  CLASSIFY: "claude-haiku-4-5-20251001" as const,
} as const;

export const COST_PER_1K_TOKENS = {
  // OpenAI models
  "gpt-4o-mini": { input: 0.015, output: 0.06 },
  "gpt-4o": { input: 0.25, output: 1.0 },
  // Anthropic models (kept for reference)
  "claude-sonnet-4-20250514": { input: 0.3, output: 1.5 },
  "claude-opus-4-20250514": { input: 1.5, output: 7.5 },
  "claude-haiku-4-20250414": { input: 0.025, output: 0.125 },
} as const;

export function estimateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS];
  if (!rates) return 0;
  return Math.ceil(
    ((inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output) * 100
  );
}

/**
 * Anthropic-aware cost estimator (Unit 4 / R16).
 *
 * Anthropic prompt caching has tiered pricing:
 *   - Non-cached input:        1.0x base input rate
 *   - Cache write (5-min TTL): 1.25x base input rate
 *   - Cache write (1-hour TTL): 2.0x base input rate
 *   - Cache read:              0.1x base input rate
 *
 * `inputTokens` here is the NON-CACHED input portion only. Cache write/read
 * tokens are passed separately. The `systemTtl` arg determines which write
 * multiplier applies — auto-marked systemPrompts use '1h', cacheableContext
 * uses '5m'. When both breakpoints coexist (Unit 4 default), pass the more
 * expensive '1h' as a conservative estimate; the fine-grained per-breakpoint
 * apportionment is a future optimization.
 *
 * Returns cents. Output tokens always priced at the model's base output rate.
 */
export function estimateAnthropicCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0,
  systemTtl: "5m" | "1h" = "1h"
): number {
  const rates = COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS];
  if (!rates) return 0;

  const writeMultiplier = systemTtl === "1h" ? 2.0 : 1.25;
  const readMultiplier = 0.1;

  const inputCost = (inputTokens / 1000) * rates.input;
  const cacheWriteCost = (cacheCreationTokens / 1000) * rates.input * writeMultiplier;
  const cacheReadCost = (cacheReadTokens / 1000) * rates.input * readMultiplier;
  const outputCost = (outputTokens / 1000) * rates.output;

  return Math.ceil((inputCost + cacheWriteCost + cacheReadCost + outputCost) * 100);
}
