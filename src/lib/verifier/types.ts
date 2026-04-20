// grantiq/src/lib/verifier/types.ts
//
// Shared types for the Grant Data Verifier
// (docs/plans/2026-04-20-005-feat-grantiq-grant-data-verifier-plan.md).

export type DeadlineStatus =
  | 'future'
  | 'passed_one_time'
  | 'passed_rolling'
  | 'no_deadline';

export type UrlStatus =
  | 'ok'
  | '404'
  | 'paywall'
  | 'timeout'
  | 'skipped'
  | 'no_url';

export type FunderStatus =
  | 'active'
  | 'revoked'
  | 'not_found'
  | 'lookup_failed'
  | 'skipped';

export type ActionTaken =
  | 'no_change'
  | 'archived'
  | 'url_flagged'
  | 'funder_flagged'
  | 'multi_flagged';

export interface DeadlineCheckResult {
  status: DeadlineStatus;
  actionSuggested: 'no_change' | 'archive';
}

export interface UrlCheckResult {
  status: UrlStatus;
  finalUrl: string | null;
  actionSuggested: 'no_change' | 'url_flagged';
}

export interface FunderCheckResult {
  status: FunderStatus;
  actionSuggested: 'no_change' | 'funder_flagged';
}

/**
 * Minimal grant row fields the Verifier needs. Kept intentionally
 * small so the orchestrator can SELECT only what it uses (cheap queries,
 * no embedding columns, no description blobs).
 */
export interface VerifierGrantRow {
  id: string;
  url: string | null;
  deadline: string | null; // ISO timestamp
  recurrence: 'one_time' | 'annual' | 'rolling' | null;
  ein: string | null;
  manual_review_flag: boolean;
}
