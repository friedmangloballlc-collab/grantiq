// grantiq/src/lib/verifier/orchestrator.ts
//
// Unit 3 — orchestrator for the Grant Data Verifier. Runs all three
// check modules (deadline/url/funder) against a batch of grants,
// aggregates verdicts into a single action, persists to
// grant_verification_log, and mutates grant_sources.
//
// Designed to be called from:
//   - Worker cron handler (worker/src/handlers/grant-verifier.ts)
//   - Ad-hoc admin retry endpoint (single grant)
//
// Both callers share the per-grant logic via verifyOneGrant().

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkDeadline } from './deadline-check';
import { checkUrl } from './url-check';
import { checkFunderByEin } from './funder-check';
import type {
  VerifierGrantRow,
  ActionTaken,
  DeadlineStatus,
  UrlStatus,
  FunderStatus,
} from './types';

interface CandidateGrant extends VerifierGrantRow {
  // Expanded shape as returned by the orchestrator's SELECT query.
}

export interface VerifyRunResult {
  runId: string;
  grantsChecked: number;
  archived: number;
  urlFlagged: number;
  funderFlagged: number;
  multiFlagged: number;
  noChange: number;
  durationMs: number;
}

export interface VerifyOneResult {
  actionTaken: ActionTaken;
  deadlineStatus: DeadlineStatus;
  urlStatus: UrlStatus | null;
  urlFinalUrl: string | null;
  funderStatus: FunderStatus;
  notes: string;
}

const BATCH_SIZE = 2000;
const CONCURRENCY = 10;

/**
 * Pull candidate grants for verification. Skips:
 *  - inactive grants (is_active=false)
 *  - grants not in open/forecasted status
 *  - grants with manual_review_flag already set (admin gatekeeps them)
 *  - grants verified within the last 7 days (unless never verified)
 */
async function selectCandidates(
  supabase: SupabaseClient,
  limit: number
): Promise<CandidateGrant[]> {
  // Candidate SELECT requires joining funder_profiles for EIN. Supabase
  // PostgREST foreign-table syntax: `funder_profiles(ein)` then flattened
  // by the caller.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('grant_sources')
    .select(
      'id, url, deadline, recurrence, manual_review_flag, funder_id, funder_profiles(ein), last_verified'
    )
    .eq('is_active', true)
    .in('status', ['open', 'forecasted'])
    .eq('manual_review_flag', false)
    .or(`last_verified.is.null,last_verified.lt.${sevenDaysAgo}`)
    .order('last_verified', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) throw new Error(`selectCandidates failed: ${error.message}`);
  if (!data) return [];

  return data.map((r) => {
    // funder_profiles from PostgREST may come as object or array depending
    // on the FK relationship shape. Handle both.
    const fp = r.funder_profiles;
    let ein: string | null = null;
    if (Array.isArray(fp) && fp.length > 0) ein = (fp[0] as { ein?: string }).ein ?? null;
    else if (fp && typeof fp === 'object') ein = (fp as { ein?: string }).ein ?? null;

    return {
      id: r.id as string,
      url: r.url as string | null,
      deadline: r.deadline as string | null,
      recurrence: r.recurrence as VerifierGrantRow['recurrence'],
      ein,
      manual_review_flag: r.manual_review_flag as boolean,
    };
  });
}

/**
 * Run all three checks against a single grant, aggregate verdict,
 * and persist to grant_verification_log + grant_sources. Does NOT
 * throw on per-check failures — each module handles its own errors
 * and returns a status.
 *
 * Exported so admin retry endpoint can verify a single grant
 * on-demand.
 */
export async function verifyOneGrant(
  supabase: SupabaseClient,
  grant: CandidateGrant,
  runId: string
): Promise<VerifyOneResult> {
  const deadline = checkDeadline(grant);

  // url + funder checks in parallel — they're independent HTTP calls
  // to different upstreams.
  const [urlResult, funderResult] = await Promise.all([
    checkUrl(grant.url),
    checkFunderByEin(grant.ein),
  ]);

  const action = deriveAction(
    deadline.actionSuggested,
    urlResult.actionSuggested,
    funderResult.actionSuggested
  );

  const notes = buildNotes(deadline.status, urlResult.status, funderResult.status);

  // Persist audit row first (before mutating grant_sources) so even if
  // the grant_sources update fails, the audit trail is preserved.
  const { error: logError } = await supabase.from('grant_verification_log').insert({
    grant_source_id: grant.id,
    run_id: runId,
    url_status: urlResult.status,
    url_final_url: urlResult.finalUrl,
    deadline_status: deadline.status,
    funder_status: funderResult.status,
    action_taken: action,
    notes,
  });
  if (logError) {
    // Log insert failed — the grant_sources mutation below would be
    // auditless. Skip the mutation to avoid silent state change.
    throw new Error(`grant_verification_log insert failed: ${logError.message}`);
  }

  // Apply the action
  const updatePayload: Record<string, unknown> = {
    last_verified: new Date().toISOString(),
    url_status: urlResult.status,
  };

  if (funderResult.status === 'active') {
    updatePayload.funder_verified_at = new Date().toISOString();
  }

  if (action === 'archived') {
    updatePayload.is_active = false;
    updatePayload.status = 'closed';
  } else if (action === 'url_flagged' || action === 'funder_flagged' || action === 'multi_flagged') {
    updatePayload.manual_review_flag = true;
    updatePayload.manual_review_reason = notes;
  }

  const { error: updateError } = await supabase
    .from('grant_sources')
    .update(updatePayload)
    .eq('id', grant.id);

  if (updateError) {
    throw new Error(`grant_sources update failed for ${grant.id}: ${updateError.message}`);
  }

  return {
    actionTaken: action,
    deadlineStatus: deadline.status,
    urlStatus: urlResult.status,
    urlFinalUrl: urlResult.finalUrl,
    funderStatus: funderResult.status,
    notes,
  };
}

function deriveAction(
  deadlineAction: 'no_change' | 'archive',
  urlAction: 'no_change' | 'url_flagged',
  funderAction: 'no_change' | 'funder_flagged'
): ActionTaken {
  // Precedence: archive wins (deadline-driven; highest confidence).
  if (deadlineAction === 'archive') return 'archived';

  const flags: string[] = [];
  if (urlAction === 'url_flagged') flags.push('url');
  if (funderAction === 'funder_flagged') flags.push('funder');

  if (flags.length === 0) return 'no_change';
  if (flags.length === 1) return flags[0] === 'url' ? 'url_flagged' : 'funder_flagged';
  return 'multi_flagged';
}

function buildNotes(d: DeadlineStatus, u: UrlStatus, f: FunderStatus): string {
  const parts: string[] = [];
  if (d === 'passed_one_time') parts.push('deadline passed (one-time)');
  if (d === 'passed_rolling') parts.push('deadline passed (rolling — still valid)');
  if (u === '404') parts.push('URL returns 404');
  if (u === 'paywall') parts.push('URL gated (401/403)');
  if (u === 'timeout') parts.push('URL unreachable (timeout/network)');
  if (f === 'revoked') parts.push('funder 501(c)(3) revoked per IRS');
  if (f === 'not_found') parts.push('funder not found in IRS EO database');
  if (f === 'lookup_failed') parts.push('IRS lookup failed (will retry)');
  return parts.join('; ') || 'all checks passed';
}

/**
 * In-process concurrency limiter. Small enough to not pull a dep.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<Array<{ item: T; result?: R; error?: unknown }>> {
  const results: Array<{ item: T; result?: R; error?: unknown }> = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        const r = await fn(items[index]);
        results[index] = { item: items[index], result: r };
      } catch (err) {
        results[index] = { item: items[index], error: err };
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

/**
 * The main entry point called by the worker cron. Pulls a batch of
 * candidates, verifies them in parallel, returns aggregate stats.
 */
export async function runVerifyBatch(
  supabase: SupabaseClient,
  opts: { batchSize?: number; concurrency?: number } = {}
): Promise<VerifyRunResult> {
  const runId = randomUUID();
  const startedAt = Date.now();
  const batchSize = opts.batchSize ?? BATCH_SIZE;
  const concurrency = opts.concurrency ?? CONCURRENCY;

  const candidates = await selectCandidates(supabase, batchSize);

  const settled = await runWithConcurrency(candidates, concurrency, (g) =>
    verifyOneGrant(supabase, g, runId)
  );

  let archived = 0;
  let urlFlagged = 0;
  let funderFlagged = 0;
  let multiFlagged = 0;
  let noChange = 0;

  for (const s of settled) {
    if (s.error || !s.result) {
      // Per-grant error — log it but keep going so one bad apple doesn't
      // fail the whole batch.
      continue;
    }
    switch (s.result.actionTaken) {
      case 'archived':
        archived++;
        break;
      case 'url_flagged':
        urlFlagged++;
        break;
      case 'funder_flagged':
        funderFlagged++;
        break;
      case 'multi_flagged':
        multiFlagged++;
        break;
      case 'no_change':
        noChange++;
        break;
    }
  }

  return {
    runId,
    grantsChecked: candidates.length,
    archived,
    urlFlagged,
    funderFlagged,
    multiFlagged,
    noChange,
    durationMs: Date.now() - startedAt,
  };
}
