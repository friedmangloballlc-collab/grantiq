// src/lib/cron/heartbeat.ts
//
// Record a heartbeat row for every cron run. Called at the tail of
// each /api/cron/<name> route's GET handler so the admin dashboard
// can show "last fired 3 hours ago" and flag any cron that's gone
// silent.
//
// Why a helper and not direct inserts: we want the insert itself to
// never throw. A failing heartbeat write should not turn a
// successful cron into a failed one. All database errors here are
// logged and swallowed.

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type CronOutcome = "ok" | "error" | "partial";

interface HeartbeatInput {
  cronName: string;
  startedAt: Date;
  outcome: CronOutcome;
  // The JSON summary the cron returns to the caller. Will be
  // re-serialized into the summary JSONB column. Pass null if
  // there's no meaningful summary (e.g. errored too early).
  summary?: Record<string, unknown> | null;
  // Populate when outcome === 'error'. Truncated to 500 chars.
  errorMessage?: string | null;
}

export async function recordHeartbeat(input: HeartbeatInput): Promise<void> {
  const finishedAt = new Date();
  const duration_ms = finishedAt.getTime() - input.startedAt.getTime();

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("cron_heartbeats").insert({
      cron_name: input.cronName,
      outcome: input.outcome,
      started_at: input.startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms,
      summary: input.summary ?? null,
      error_message: input.errorMessage ? input.errorMessage.slice(0, 500) : null,
    });
    if (error) {
      logger.error("heartbeat insert failed", {
        cron: input.cronName,
        err: error.message,
      });
    }
  } catch (err) {
    // Swallow — a heartbeat write failing should never break the cron.
    logger.error("heartbeat write threw", {
      cron: input.cronName,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

// Helper for cron routes that want a one-liner:
//
//   const started = new Date();
//   try {
//     const summary = await doWork();
//     await recordHeartbeat({ cronName, startedAt: started, outcome: 'ok', summary });
//     return NextResponse.json(summary);
//   } catch (err) {
//     await recordHeartbeat({ cronName, startedAt: started, outcome: 'error', errorMessage: String(err) });
//     throw err;
//   }
//
// We don't ship a wrapper like `withHeartbeat(fn)` because each cron
// has slightly different success criteria ('ok' vs 'partial') and
// wrapping the NextRequest handler directly loses type safety on
// the returned response.

/**
 * Returns the most recent heartbeat for each known cron name,
 * joined with the "stale" flag (true if last run was > 25 hours ago).
 * Used by the admin dashboard.
 */
export interface CronStatus {
  cronName: string;
  lastRunAt: Date | null;
  lastOutcome: CronOutcome | null;
  lastDurationMs: number | null;
  lastSummary: Record<string, unknown> | null;
  lastError: string | null;
  isStale: boolean;
  runsLast24h: number;
}

const STALE_AFTER_HOURS = 25;

// The set of crons the dashboard should always show, even if they've
// never heartbeated. Must stay in sync with vercel.json; when a new
// cron is added there, add it here so the dashboard shows "never run"
// instead of silently omitting it.
export const TRACKED_CRONS = [
  "refresh-grants",
  "validate-grants",
  "check-urls",
  "generate-embeddings",
  "crawl-sources",
  "enrich-grants",
  "enrich-competitiveness",
  "send-lead-nurture",
  "ingest-990",
  "process-jobs",
] as const;

export async function getCronStatuses(): Promise<CronStatus[]> {
  const admin = createAdminClient();
  const staleCutoff = new Date(
    Date.now() - STALE_AFTER_HOURS * 60 * 60 * 1000
  ).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Pull the latest heartbeat + 24h run count for each cron name.
  // Two small queries rather than one clever one keeps this readable
  // at low volume (10 crons × a few rows).
  const [{ data: latest }, { data: recent }] = await Promise.all([
    admin
      .from("cron_heartbeats")
      .select("cron_name, outcome, started_at, duration_ms, summary, error_message")
      .order("started_at", { ascending: false })
      .limit(200),
    admin
      .from("cron_heartbeats")
      .select("cron_name")
      .gte("started_at", oneDayAgo),
  ]);

  // Latest per cron_name
  type LatestRow = {
    cron_name: string;
    outcome: CronOutcome;
    started_at: string;
    duration_ms: number;
    summary: Record<string, unknown> | null;
    error_message: string | null;
  };
  const latestByName = new Map<string, LatestRow>();
  for (const row of (latest ?? []) as LatestRow[]) {
    if (!latestByName.has(row.cron_name)) latestByName.set(row.cron_name, row);
  }

  // Count per cron_name in last 24h
  const countByName = new Map<string, number>();
  for (const row of (recent ?? []) as { cron_name: string }[]) {
    countByName.set(row.cron_name, (countByName.get(row.cron_name) ?? 0) + 1);
  }

  return TRACKED_CRONS.map((cronName) => {
    const row = latestByName.get(cronName);
    const lastRunAt = row ? new Date(row.started_at) : null;
    const isStale = !lastRunAt || lastRunAt.toISOString() < staleCutoff;
    return {
      cronName,
      lastRunAt,
      lastOutcome: row?.outcome ?? null,
      lastDurationMs: row?.duration_ms ?? null,
      lastSummary: row?.summary ?? null,
      lastError: row?.error_message ?? null,
      isStale,
      runsLast24h: countByName.get(cronName) ?? 0,
    };
  });
}
