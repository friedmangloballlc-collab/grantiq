// grantiq/src/lib/ai/agents/outcome-learner/types.ts
//
// Agent #5: after every terminal pipeline outcome (awarded, declined,
// withdrawn), analyze the submitted draft against the outcome and
// extract learnings — both org-specific (org_funder_history) and
// cross-org funder signals (funder_learnings).

export type Outcome = "awarded" | "declined" | "withdrawn";

export type LearningType =
  | "winning_language"
  | "losing_language"
  | "budget_sweet_spot"
  | "program_preference"
  | "common_weakness"
  | "common_strength"
  | "evaluation_signal"
  | "timing_insight";

export interface ExtractedLearning {
  learning_type: LearningType;
  insight: string;
  example_quote: string | null;
  /** Confidence 0..1. Lower for soft-signal outcomes (withdrawn),
   * higher for clear-signal outcomes (awarded with feedback). */
  confidence: number;
}

export interface LearnerInput {
  pipelineId: string;
  orgId: string;
  userId: string;
  subscriptionTier: string;
  outcome: Outcome;
  funderId: string | null;
  funderName: string;
  grantName: string;
  awardAmount: number | null;
  decisionDate: string;
  /** Funder feedback text pasted by the user. Null if not captured. */
  funderFeedbackText: string | null;
  /** Submitted draft sections keyed by section_type. Optional — absent
   * when the draft lives outside the grant_drafts pipeline. */
  draftSections: Record<string, string> | null;
  draftId: string | null;
}

export interface LearnerResult {
  learnings: ExtractedLearning[];
  historyInserted: boolean;
  funderLearningsInserted: number;
  verdict: "extracted" | "no_signal" | "insufficient_data" | "unavailable";
  tokensUsed: {
    input: number;
    output: number;
    cached: number;
  };
}
