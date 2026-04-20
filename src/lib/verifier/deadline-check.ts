// grantiq/src/lib/verifier/deadline-check.ts
//
// Unit 2a — pure deadline validation. No network, no DB mutations —
// just a function from grant row to verdict. The orchestrator (Unit 3)
// decides what to do with the verdict.
//
// Rule table (from docs/plans/2026-04-20-005 Unit 2a):
//
//   deadline | recurrence      | verdict             | action
//   ---------|-----------------|---------------------|----------
//   null     | any             | no_deadline         | no_change
//   future   | any             | future              | no_change
//   past     | one_time        | passed_one_time     | archive
//   past     | rolling/annual  | passed_rolling      | no_change
//                (the 'past' deadline refers to last cycle; funder
//                 still accepts continuously)

import type { DeadlineCheckResult, VerifierGrantRow } from './types';

export function checkDeadline(grant: VerifierGrantRow, now: Date = new Date()): DeadlineCheckResult {
  if (!grant.deadline) {
    return { status: 'no_deadline', actionSuggested: 'no_change' };
  }

  const deadlineDate = new Date(grant.deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    // Malformed deadline — safer to treat as unknown than to auto-archive.
    return { status: 'no_deadline', actionSuggested: 'no_change' };
  }

  if (deadlineDate > now) {
    return { status: 'future', actionSuggested: 'no_change' };
  }

  // Deadline is in the past. The action depends on recurrence.
  if (grant.recurrence === 'one_time') {
    return { status: 'passed_one_time', actionSuggested: 'archive' };
  }

  // 'rolling' or 'annual' past deadline = last cycle closed, funder
  // still accepts new applications. Don't archive. Null recurrence
  // falls here too (safer to not archive on ambiguous data).
  return { status: 'passed_rolling', actionSuggested: 'no_change' };
}
