import Anthropic from "@anthropic-ai/sdk";

let clientInstance: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

export const MODELS = {
  SCORING: "claude-sonnet-4-20250514" as const,
  STRATEGY: "claude-opus-4-20250514" as const,
  CLASSIFY: "claude-haiku-4-20250414" as const,
} as const;

export const COST_PER_1K_TOKENS = {
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
    (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output
  );
}
