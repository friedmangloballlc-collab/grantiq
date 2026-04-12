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

// Anthropic models kept for reference / writing modules
export const ANTHROPIC_MODELS = {
  SCORING: "claude-sonnet-4-20250514" as const,
  STRATEGY: "claude-opus-4-20250514" as const,
  CLASSIFY: "claude-haiku-4-20250414" as const,
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
