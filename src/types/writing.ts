// grantaq/src/types/writing.ts

import type {
  RfpParseOutput,
  FunderAnalysisOutput,
  DraftSectionOutput,
  BudgetTableOutput,
  CoherenceCheckOutput,
  AuditOutput,
  ReviewSimulationOutput,
  ComplianceOutput,
} from "@/lib/ai/writing/schemas";

export type WritingTier = "tier1_ai_only" | "tier2_ai_audit" | "tier3_expert" | "full_confidence";
export type GrantType = "state_foundation" | "federal" | "sbir_sttr";

export interface WritingPurchase {
  tier: WritingTier;
  grant_type: GrantType;
  price_cents: number;
  stripe_payment_intent_id: string | null;  // null for Full Confidence
}

export interface WritingContext {
  org_id: string;
  user_id: string;
  /**
   * Subscription tier (free | starter | pro | growth | enterprise).
   * Required by aiCall's checkUsageLimit + checkTokenCeiling pre-flight gates
   * after the Unit 7 draft-generator migration. Looked up by pipeline.ts from
   * the subscriptions table and threaded through.
   */
  subscription_tier: string;
  rfp_analysis: RfpParseOutput;
  funder_analysis: FunderAnalysisOutput;
  org_profile: {
    name: string;
    mission_statement: string;
    entity_type: string;
    population_served: string[];
    program_areas: string[];
    voice_profile: Record<string, unknown> | null;
  };
  org_capabilities: Record<string, unknown>;
  narrative_examples: Array<{
    segment_type: string;
    text: string;
    quality_score: number;
  }>;
  /**
   * Optional funder context block sourced from existing 990 data
   * (Unit 9a of docs/plans/2026-04-19-002). Built by
   * src/lib/grants/funder_context.ts and threaded in by pipeline.ts.
   * When present, it's appended to the cacheable context so the AI
   * has verified ground-truth funder details on every section call.
   * When null/undefined, the cacheable context omits it entirely —
   * never emit a placeholder that the AI could mistake for real data.
   */
  funder_context_block?: string | null;
  grant_match?: {
    match_score: number;
    score_breakdown: Record<string, number>;
    match_reasons: Record<string, string>;
  };
}

export interface DraftResult {
  sections: DraftSectionOutput[];
  budget: BudgetTableOutput;
  coherence: CoherenceCheckOutput;
  audit?: AuditOutput;
  review_simulation?: ReviewSimulationOutput;
  compliance: ComplianceOutput;
}

export type DraftStatus =
  | "rfp_parsed" | "funder_analyzed" | "drafting" | "draft_complete"
  | "coherence_checked" | "auditing" | "audit_complete"
  | "rewriting" | "rewrite_complete" | "review_simulated"
  | "compliance_checked" | "completed" | "failed";
