// src/components/admin/cron-status-card.tsx
//
// Live status for every scheduled cron. Reads cron_heartbeats and
// flags anything that hasn't fired in 25+ hours as stale. This is
// the single most valuable piece of observability we have for the
// ingest pipeline — without it, crawl-sources can die for 9 days
// before anyone notices.

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CronStatus } from "@/lib/cron/heartbeat";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";

function fmtAgo(date: Date | null): string {
  if (!date) return "never";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function OutcomeBadge({
  outcome,
  isStale,
}: {
  outcome: CronStatus["lastOutcome"];
  isStale: boolean;
}) {
  if (isStale) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        stale
      </span>
    );
  }
  if (!outcome) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warm-100 dark:bg-warm-800 px-2 py-0.5 text-xs font-semibold text-warm-600 dark:text-warm-400">
        <Clock className="h-3 w-3" aria-hidden="true" />
        never run
      </span>
    );
  }
  if (outcome === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        ok
      </span>
    );
  }
  if (outcome === "partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
      <XCircle className="h-3 w-3" aria-hidden="true" />
      error
    </span>
  );
}

export function CronStatusCard({ statuses }: { statuses: CronStatus[] }) {
  const staleCount = statuses.filter((s) => s.isStale).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Crons</CardTitle>
        <CardDescription>
          {staleCount > 0 ? (
            <span className="font-semibold text-red-600 dark:text-red-400">
              {staleCount} cron{staleCount > 1 ? "s" : ""} stale (&gt; 25h since last run)
            </span>
          ) : (
            "All crons fired within the last 25 hours"
          )}
          . Manual trigger: <code className="text-xs bg-warm-100 dark:bg-warm-800 px-1 rounded">POST /api/admin/ingest-trigger</code> with <code>{`{cron:"<name>"}`}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 dark:border-warm-800 text-xs text-warm-500 uppercase tracking-wider">
                <th className="text-left font-medium py-2 pr-4">Cron</th>
                <th className="text-left font-medium py-2 pr-4">Status</th>
                <th className="text-left font-medium py-2 pr-4">Last Run</th>
                <th className="text-right font-medium py-2 pr-4">Duration</th>
                <th className="text-right font-medium py-2">24h Runs</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => (
                <tr
                  key={s.cronName}
                  className={
                    s.isStale
                      ? "border-b border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10"
                      : "border-b border-warm-100 dark:border-warm-800/50"
                  }
                >
                  <td className="py-2.5 pr-4 font-mono text-xs text-warm-800 dark:text-warm-200">
                    {s.cronName}
                  </td>
                  <td className="py-2.5 pr-4">
                    <OutcomeBadge outcome={s.lastOutcome} isStale={s.isStale} />
                  </td>
                  <td className="py-2.5 pr-4 text-warm-600 dark:text-warm-400 tabular-nums">
                    {fmtAgo(s.lastRunAt)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-warm-600 dark:text-warm-400 tabular-nums">
                    {s.lastDurationMs !== null
                      ? s.lastDurationMs < 1000
                        ? `${s.lastDurationMs}ms`
                        : `${(s.lastDurationMs / 1000).toFixed(1)}s`
                      : "—"}
                  </td>
                  <td className="py-2.5 text-right text-warm-600 dark:text-warm-400 tabular-nums">
                    {s.runsLast24h}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {statuses.some((s) => s.lastError) && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
              Recent errors
            </p>
            {statuses
              .filter((s) => s.lastError)
              .map((s) => (
                <p
                  key={`err-${s.cronName}`}
                  className="text-xs text-warm-600 dark:text-warm-400 border-l-2 border-red-400 dark:border-red-800 pl-3 py-1"
                >
                  <span className="font-mono font-semibold">{s.cronName}</span>:{" "}
                  {s.lastError}
                </p>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
