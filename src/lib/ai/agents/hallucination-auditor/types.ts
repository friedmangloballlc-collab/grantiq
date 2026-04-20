// grantiq/src/lib/ai/agents/hallucination-auditor/types.ts

export type ClaimStatus = "grounded" | "ungrounded";
export type Verdict = "clean" | "flagged" | "blocked" | "unaudited";

export interface Claim {
  claim_text: string;
  status: ClaimStatus;
  source_quote: string | null;
  missing_source: string | null;
  /** Hard facts (numbers, dates, specific populations, funder priorities)
   * trigger BLOCKED on a single ungrounded instance. Soft facts (opinions,
   * rhetoric) only count toward the flagged threshold. */
  is_hard_fact: boolean;
}

export interface AuditResult {
  claimsTotal: number;
  claimsGrounded: number;
  claimsUngrounded: number;
  verdict: Verdict;
  claimsDetail: Claim[];
  tokensUsed: {
    input: number;
    output: number;
    cached: number;
  };
}

export interface AuditInput {
  sectionText: string;
  sectionName: string;
  rfpText: string;
  funderContextBlock: string | null;
  orgProfile: {
    name: string;
    mission_statement: string;
    population_served: string[];
    program_areas: string[];
  };
  context: {
    org_id: string;
    user_id: string;
    subscription_tier: string;
    draft_id: string;
  };
}
