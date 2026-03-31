export interface SequenceEmail {
  day: number;
  subject: string;
  template: string;
  condition?: string;
}

export const POST_SIGNUP_SEQUENCE: SequenceEmail[] = [
  { day: 0, subject: "Your GrantIQ account is ready — start here", template: "welcome" },
  { day: 1, subject: "The one thing most grant seekers skip", template: "readiness_nudge", condition: "readiness_not_complete" },
  { day: 2, subject: "Your readiness score is in — here's what it means", template: "readiness_result", condition: "readiness_complete" },
  { day: 3, subject: "How organizations like yours find grants they never knew existed", template: "discovery_story" },
  { day: 5, subject: "The grant calendar problem (and how to solve it in 10 minutes)", template: "calendar_intro" },
  { day: 7, subject: "Ready to write? Here's how the AI Writing Engine works", template: "writing_intro" },
  { day: 10, subject: "One option worth knowing about: $0 upfront, 10% if you win", template: "full_confidence" },
  { day: 14, subject: "Your free trial ends in 48 hours — here's what you've built", template: "trial_ending" },
];
