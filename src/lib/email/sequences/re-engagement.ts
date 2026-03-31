import type { SequenceEmail } from "./post-signup";

export const RE_ENGAGEMENT_SEQUENCE: SequenceEmail[] = [
  { day: 21, subject: "You have [X] new grant matches since you last visited", template: "new_matches" },
  { day: 28, subject: "A deadline you should know about", template: "deadline_warning" },
  { day: 35, subject: "Is GrantAQ a fit for where you are right now?", template: "honest_check" },
  { day: 42, subject: "Before you go — one last thing", template: "final_offer" },
];
