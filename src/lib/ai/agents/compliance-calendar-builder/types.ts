// grantiq/src/lib/ai/agents/compliance-calendar-builder/types.ts
//
// Agent #4: when a grant moves to stage='awarded', extract every
// compliance obligation from the RFP + award info (reports, audits,
// renewals, performance reviews, etc.) and create calendar events
// the org cannot afford to miss.

/** Mirrors compliance_events.event_type CHECK enum in migration 00047. */
export type ComplianceEventType =
  | "sam_renewal"
  | "990_filing"
  | "state_annual_report"
  | "insurance_renewal"
  | "charitable_registration"
  | "good_standing"
  | "ein_verification"
  | "audit_due"
  | "board_meeting"
  | "coi_renewal"
  | "uei_renewal"
  | "custom";

export type RecurrencePattern = "annual" | "quarterly" | "monthly" | "one_time";

/** Single extracted obligation, ready for insert into compliance_events. */
export interface ExtractedObligation {
  event_type: ComplianceEventType;
  title: string;
  description: string;
  due_date: string; // ISO date YYYY-MM-DD
  recurrence: RecurrencePattern;
  risk_if_missed: string;
  /** Natural-language source of the obligation (RFP quote, award letter, etc.)
   * — persisted to description so reviewers can audit extraction. */
  source_quote: string | null;
}

export interface BuilderInput {
  pipelineId: string;
  orgId: string;
  userId: string;
  subscriptionTier: string;
  grantName: string;
  funderName: string;
  /** Award date (ISO YYYY-MM-DD). Obligation due_dates are computed
   * relative to this. Typically the day stage flipped to 'awarded'. */
  awardDate: string;
  /** Award period end (YYYY-MM-DD) — optional. When supplied, final-
   * report due dates get anchored to it. */
  awardEndDate?: string | null;
  /** RFP text if available. Obligations often live in the "Reporting
   * Requirements" or "Award Terms" section. */
  rfpText: string | null;
}

export interface BuilderResult {
  obligations: ExtractedObligation[];
  /** Count of rows that actually got inserted. Dedup against existing
   * compliance_events for (org_id, title, due_date) suppresses dupes. */
  inserted: number;
  /** Count of rows skipped because a duplicate already existed. */
  skipped: number;
  verdict: "extracted" | "no_rfp" | "empty" | "unavailable";
  tokensUsed: {
    input: number;
    output: number;
    cached: number;
  };
}
