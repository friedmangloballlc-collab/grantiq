// grantiq/src/lib/ai/agents/match-critic/llm-check.ts
//
// Stage 2 of the Funder Match Critic. Runs ONLY for matches that
// passed Stage 1 hard checks (geography, size, entity type). Uses
// Claude Haiku to detect mission mismatches — cases where the grant
// funds areas the org doesn't work in, with no plausible
// interpretation connecting them.
//
// Design principles (from docs/plans/2026-04-20-003):
// - KEEP when in doubt. False positives (user ignores) are recoverable.
//   False negatives (killing a real match) lose trust permanently.
// - Single-call: extract mission alignment verdict in one JSON response.
// - Fail-open: any error → KEEP. Never starve the user of matches.

import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";
import type {
  CriticOrgProfile,
  CriticGrantMatch,
  CriticVerdict,
  KillReason,
} from "./types";

const SYSTEM_PROMPT = `You are a grant-matching precision filter.

Given an organization profile and a candidate grant, decide KEEP or KILL.

KILL only for CLEAR mission mismatches:
- The grant explicitly funds areas the org does NOT work in
- AND there's no plausible interpretation that connects them
- Use org.program_areas and org.population_served as authoritative about what the org does
- Use grant.category and grant.description to understand what the grant funds

KEEP when:
- Mission alignment is possible, even if not obvious
- The grant and org serve overlapping populations OR program areas
- You're unsure — when in doubt, KEEP
- The org's mission statement mentions the grant's focus area
- The grant is broad enough that this org could credibly apply

Be strict about only killing on clear mismatches. False positives
(irrelevant matches shown to the user) are recoverable — the user
just ignores them. False negatives (killing real matches) lose
trust permanently.

Return ONLY a JSON object with this exact shape (no markdown, no prose):
{
  "verdict": "KEEP" | "KILL",
  "kill_reason": "mission_mismatch" | null,
  "confidence": number between 0 and 1,
  "notes": "one sentence explanation (max 140 chars)"
}`;

function buildUserMessage(
  org: CriticOrgProfile,
  grant: CriticGrantMatch
): string {
  const orgParts = [
    `Name: ${org.name}`,
    org.mission_statement ? `Mission: ${org.mission_statement}` : null,
    org.program_areas.length > 0
      ? `Program areas: ${org.program_areas.join(", ")}`
      : null,
    org.population_served.length > 0
      ? `Populations served: ${org.population_served.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const grantParts = [
    `Name: ${grant.name}`,
    `Funder: ${grant.funder_name}`,
    grant.category ? `Category: ${grant.category}` : null,
    grant.description ? `Description: ${grant.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `ORGANIZATION:
${orgParts}

CANDIDATE GRANT:
${grantParts}

Decide KEEP or KILL. Return JSON only.`;
}

interface LlmRawVerdict {
  verdict?: string;
  kill_reason?: string | null;
  confidence?: number;
  notes?: string;
}

export interface LlmCheckContext {
  org_id: string;
  user_id: string;
  subscription_tier: string;
}

/**
 * Stage 2: LLM semantic mission-mismatch check.
 *
 * Returns a full CriticVerdict — KEEP when in doubt, KILL only for
 * clear mission mismatches. Fail-open on any error.
 */
export async function runLlmCheck(
  org: CriticOrgProfile,
  grant: CriticGrantMatch,
  context: LlmCheckContext
): Promise<CriticVerdict> {
  try {
    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.CLASSIFY,
      systemPrompt: SYSTEM_PROMPT,
      userInput: buildUserMessage(org, grant),
      promptId: "match.critic.v1",
      orgId: context.org_id,
      userId: context.user_id,
      tier: context.subscription_tier,
      actionType: "match",
      maxTokens: 256,
      temperature: 0,
    });

    let parsed: LlmRawVerdict;
    try {
      parsed = JSON.parse(response.content) as LlmRawVerdict;
    } catch {
      // Model returned non-JSON — fail-open
      return {
        verdict: "KEEP",
        killReason: null,
        confidence: 0,
        notes: "critic returned non-JSON — defaulting to KEEP",
        stage: "fail_open",
      };
    }

    // Validate the response shape. If malformed, fail-open.
    if (parsed.verdict !== "KEEP" && parsed.verdict !== "KILL") {
      return {
        verdict: "KEEP",
        killReason: null,
        confidence: 0,
        notes: "critic returned invalid verdict — defaulting to KEEP",
        stage: "fail_open",
      };
    }

    const confidence =
      typeof parsed.confidence === "number" &&
      parsed.confidence >= 0 &&
      parsed.confidence <= 1
        ? parsed.confidence
        : 0.5;

    // Only trust KILL verdicts at high confidence. Low-confidence KILL
    // reverts to KEEP — bias toward recall, per plan's design principle.
    if (parsed.verdict === "KILL" && confidence < 0.7) {
      return {
        verdict: "KEEP",
        killReason: null,
        confidence,
        notes: `critic wanted KILL at ${confidence.toFixed(2)} — below threshold, KEEPing`,
        stage: "llm",
      };
    }

    const killReason: KillReason | null =
      parsed.verdict === "KILL"
        ? parsed.kill_reason === "mission_mismatch"
          ? "mission_mismatch"
          : "other"
        : null;

    return {
      verdict: parsed.verdict,
      killReason,
      confidence,
      notes: (parsed.notes ?? "").slice(0, 200),
      stage: "llm",
    };
  } catch {
    // aiCall failure (Anthropic down, timeout, usage limit): fail-open.
    // Better to show all matches than starve the user.
    return {
      verdict: "KEEP",
      killReason: null,
      confidence: 0,
      notes: "critic unavailable — defaulting to KEEP",
      stage: "fail_open",
    };
  }
}
