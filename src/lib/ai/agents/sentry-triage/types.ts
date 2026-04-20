// grantiq/src/lib/ai/agents/sentry-triage/types.ts
//
// Agent #10 — Sentry Triage. Classifies error events into severity,
// category, and routes them to the right team. Input comes from any
// source: Sentry webhooks, internal error pipeline, or manual dump.

export type Severity = "critical" | "high" | "medium" | "low" | "noise";

export type Category =
  | "auth_failure"
  | "payment_failure"
  | "data_corruption"
  | "third_party_outage"
  | "rate_limit"
  | "rls_violation"
  | "ai_failure"
  | "ui_crash"
  | "performance"
  | "unknown";

export type AssigneeTeam =
  | "engineering"
  | "billing"
  | "data"
  | "security"
  | "none";

export type EventSource = "sentry" | "internal" | "manual";

export interface TriageInput {
  source: EventSource;
  /** Upstream id (Sentry issue id, log corr id) — used for dedup. */
  externalId: string | null;
  title: string;
  errorMessage: string | null;
  stackTrace: string | null;
  /** Optional extra context the caller wants considered. */
  context?: Record<string, unknown>;
  /** Bound to an org/user when we can tell. */
  orgId: string | null;
  userId: string | null;
  /** Caller's tier label — used for aiCall budget plumbing. Errors
   * triaged on the platform are billed to an internal budget, but
   * we still need to supply a value. */
  tier: string;
}

export interface TriageResult {
  severity: Severity;
  category: Category;
  assigneeTeam: AssigneeTeam;
  likelyCause: string;
  suggestedAction: string;
  affectedUsersEstimate: number | null;
  triageConfidence: number;
  eventId: string | null;
  verdict: "triaged" | "duplicate" | "unavailable";
  tokensUsed: { input: number; output: number; cached: number };
}
