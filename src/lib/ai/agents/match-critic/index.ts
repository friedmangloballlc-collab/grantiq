// grantiq/src/lib/ai/agents/match-critic/index.ts
//
// Orchestrator: runs Stage 1 (hard checks) then Stage 2 (LLM) in
// sequence. Returns a CriticVerdict the caller (usually
// /api/matches) uses to KEEP or KILL a match.
//
// Timing target (docs/plans/2026-04-20-003): <200ms added latency
// per match. Stage 1 is ~1ms. Stage 2 is Haiku ~600-1000ms.
// Caller uses Promise.all with timeout to enforce latency budget.

import { runHardChecks } from "./hard-checks";
import { runLlmCheck, type LlmCheckContext } from "./llm-check";
import type {
  CriticOrgProfile,
  CriticGrantMatch,
  CriticVerdict,
} from "./types";

export interface CritiqueInput {
  org: CriticOrgProfile;
  grant: CriticGrantMatch;
  context: LlmCheckContext;
  /**
   * If true, skip Stage 2 (LLM) entirely. Useful when Anthropic
   * is known to be down or when the caller wants Stage 1 only.
   */
  skipLlm?: boolean;
}

/**
 * Full critique pipeline. Stage 1 → Stage 2. Returns the first
 * decisive verdict. Stage 1 hard checks KILL at high confidence
 * and skip the LLM call; Stage 1 null = proceeds to Stage 2.
 */
export async function critiqueMatch(input: CritiqueInput): Promise<CriticVerdict> {
  // Stage 1: deterministic, no API cost
  const stage1 = runHardChecks(input.org, input.grant);
  if (stage1 && stage1.verdict === "KILL") {
    return stage1;
  }

  // Stage 1 passed — proceed to Stage 2 unless caller skipped
  if (input.skipLlm) {
    return {
      verdict: "KEEP",
      killReason: null,
      confidence: 1.0,
      notes: "Stage 1 passed; Stage 2 skipped by caller",
      stage: "hard_check",
    };
  }

  return await runLlmCheck(input.org, input.grant, input.context);
}

export { runHardChecks } from "./hard-checks";
export { runLlmCheck } from "./llm-check";
export type {
  CriticOrgProfile,
  CriticGrantMatch,
  CriticVerdict,
  KillReason,
} from "./types";
