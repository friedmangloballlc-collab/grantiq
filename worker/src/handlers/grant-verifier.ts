// worker/src/handlers/grant-verifier.ts
//
// Worker handler for the nightly Grant Data Verifier job.
// Schedule: 02:15 UTC daily (see worker/src/cron.ts).
//
// Flow:
//   1. runVerifyBatch pulls ≤2000 candidates needing verification
//   2. Each is checked (deadline + URL + funder) in parallel via
//      p-limit(10) inside the orchestrator
//   3. grant_sources mutations + grant_verification_log rows written
//   4. Summary logged — Cost Watchdog (when it ships) can alert if
//      this run returns unexpected stats

import type { SupabaseClient } from '@supabase/supabase-js';
import { runVerifyBatch } from '../../../src/lib/verifier/orchestrator';

export async function handleVerifyGrants(supabase: SupabaseClient): Promise<void> {
  const startedAt = Date.now();
  try {
    const result = await runVerifyBatch(supabase);

    // Structured log — parseable by Cost Watchdog + manual inspection
    console.log(
      JSON.stringify({
        event: 'grant_verification_complete',
        run_id: result.runId,
        grants_checked: result.grantsChecked,
        archived: result.archived,
        url_flagged: result.urlFlagged,
        funder_flagged: result.funderFlagged,
        multi_flagged: result.multiFlagged,
        no_change: result.noChange,
        duration_ms: result.durationMs,
      })
    );

    // Heuristic sanity check: if archived rate exceeds 5% of the batch,
    // something's unusual (mass-expired batch, or a bug in deadline
    // parsing). Log an explicit warning so ops notices.
    if (result.grantsChecked > 100 && result.archived / result.grantsChecked > 0.05) {
      console.warn(
        JSON.stringify({
          event: 'grant_verification_high_archive_rate',
          run_id: result.runId,
          archive_rate: result.archived / result.grantsChecked,
        })
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'grant_verification_failed',
        duration_ms: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    throw err;
  }
}
