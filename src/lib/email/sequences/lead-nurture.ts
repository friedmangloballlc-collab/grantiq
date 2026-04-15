export interface SequenceEmail {
  day: number;
  subject: string;
  template: string;
  condition?: string;
}

/**
 * Lead nurture sequence — triggered after public /check or service intake.
 * Uses verdict-specific report delivery + follow-up sequence.
 */
export const LEAD_NURTURE_SEQUENCE: SequenceEmail[] = [
  // Day 0 — Immediate: Form confirmation + verdict-specific report
  { day: 0, subject: "We got your information — your report is being prepared", template: "form_confirmation" },
  // Day 0 — Verdict-specific report delivery (handled separately by verdict)
  { day: 0, subject: "Your Grant Eligibility Report | {{companyName}}", template: "report_delivery_verdict" },
  // Day 2 — Quick wins reminder
  { day: 2, subject: "3 Quick Wins You Can Do This Week, {{firstName}}", template: "lead_quick_wins" },
  // Day 5 — Social proof
  { day: 5, subject: "How businesses like {{companyName}} get grant-ready in 90 days", template: "lead_social_proof" },
  // Day 10 — Opportunity cost
  { day: 10, subject: "{{firstName}}, your grant universe is {{grantUniverse}}", template: "lead_opportunity_cost" },
  // Day 21 — Re-engagement
  { day: 21, subject: "Still thinking about grants?", template: "lead_reengagement" },
];

/**
 * Discovery call sequence — triggered when a call is booked.
 */
export const DISCOVERY_CALL_SEQUENCE: SequenceEmail[] = [
  { day: 0, subject: "Confirmed: Our 15-min call on {{date}} at {{time}}", template: "discovery_call_confirm" },
  { day: -1, subject: "Reminder: Our call tomorrow at {{time}}", template: "discovery_call_reminder", condition: "call_tomorrow" },
  // Post-call emails are manual/triggered by admin action
];

/**
 * Post-call follow-up sequence — triggered after discovery call if no purchase.
 */
export const POST_CALL_SEQUENCE: SequenceEmail[] = [
  { day: 2, subject: "Following up on your grant readiness path", template: "post_call_nodecision" },
  { day: 7, subject: "One last note — and a small offer", template: "final_followup" },
];

/**
 * Post-engagement sequence — triggered after tier engagement completes.
 */
export const POST_ENGAGEMENT_SEQUENCE: SequenceEmail[] = [
  { day: 30, subject: "Checking in 30 days post-engagement", template: "post_engagement_upsell" },
  { day: 365, subject: "Time to refresh your Grant Readiness Diagnostic", template: "annual_rediagnostic" },
];

/**
 * Re-engagement sequence — triggered 90 days after last touch with no purchase.
 */
export const REENGAGEMENT_SEQUENCE: SequenceEmail[] = [
  { day: 90, subject: "Still thinking about grants?", template: "reengagement_90" },
];
