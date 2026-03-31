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
