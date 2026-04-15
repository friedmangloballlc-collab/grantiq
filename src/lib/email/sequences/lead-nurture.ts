import type { SequenceEmail } from "./post-signup";

export const LEAD_NURTURE_SEQUENCE: SequenceEmail[] = [
  {
    day: 0,
    subject: "Your Grant Eligibility Report — {{verdict}} | {{companyName}}",
    template: "eligibility_report",
  },
  {
    day: 2,
    subject: "3 Quick Wins You Can Do This Week, {{firstName}}",
    template: "lead_quick_wins",
  },
  {
    day: 5,
    subject: "How businesses like {{companyName}} get grant-ready in 90 days",
    template: "lead_social_proof",
  },
  {
    day: 10,
    subject: "{{firstName}}, your grant universe is {{grantUniverse}} — here's what that means",
    template: "lead_opportunity_cost",
  },
  {
    day: 21,
    subject: "Still thinking about grants? Here's what changed since your assessment",
    template: "lead_reengagement",
  },
];
