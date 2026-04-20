// grantiq/src/lib/ai/agents/support-triage/types.ts
//
// Agent #12 — Support Triage. Classifies inbound support messages
// and generates a suggested first response. Inputs come from email,
// Intercom, the in-app contact form, or manual entry.

export type Intent =
  | "billing"
  | "bug_report"
  | "feature_request"
  | "onboarding"
  | "refund"
  | "cancellation"
  | "account_access"
  | "grant_question"
  | "compliment"
  | "other";

export type Urgency = "urgent" | "high" | "normal" | "low";
export type Sentiment = "angry" | "frustrated" | "neutral" | "happy";
export type SupportChannel = "email" | "intercom" | "in_app" | "manual";
export type SupportTeam =
  | "support"
  | "billing"
  | "engineering"
  | "success"
  | "none";

export interface SupportTriageInput {
  channel: SupportChannel;
  externalId: string | null;
  senderEmail: string | null;
  senderName: string | null;
  subject: string | null;
  body: string;
  orgId: string | null;
  userId: string | null;
  tier: string;
}

export interface SupportTriageResult {
  intent: Intent;
  urgency: Urgency;
  sentiment: Sentiment;
  assigneeTeam: SupportTeam;
  suggestedResponse: string;
  triageConfidence: number;
  ticketId: string | null;
  verdict: "triaged" | "duplicate" | "unavailable";
  tokensUsed: { input: number; output: number; cached: number };
}
