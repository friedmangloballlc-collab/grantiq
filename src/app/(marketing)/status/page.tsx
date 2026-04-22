// src/app/(marketing)/status/page.tsx
//
// Public uptime / data-freshness dashboard. Reads cron_heartbeats
// (migration 00067) and surfaces the last-run time for every
// scheduled data pipeline. Purpose:
//
//   1. Substantiate the "verified nightly" FTC claim we make on the
//      homepage and in pricing copy. If a crawler hasn't run, visitors
//      can see that here.
//   2. Reduce enterprise prospect friction — "can we see your uptime?"
//      is a question every procurement team asks.
//   3. Externalize the heartbeat info that already powers
//      /admin/agents, making it public for trust purposes.
//
// No sensitive data leaks: we show cron name, last-run timestamp,
// and a green/amber/red health pill. No individual summaries, no
// error messages, no org-level data.

import type { Metadata } from "next";
import { getCronStatuses, TRACKED_CRONS } from "@/lib/cron/heartbeat";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

// Refresh once per minute — freshness signal without hammering the DB.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Status — GrantAQ",
  description:
    "Real-time status of GrantAQ's grant ingestion pipelines. Every data source shows its last successful run time.",
  alternates: { canonical: "https://grantaq.com/status" },
};

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

function fmtUtc(date: Date | null): string {
  if (!date) return "—";
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

// Friendly cron labels — what visitors see instead of the internal
// route name. Match the TRACKED_CRONS whitelist from heartbeat.ts.
const LABELS: Record<string, { name: string; description: string }> = {
  "refresh-grants": {
    name: "Federal grants (Grants.gov)",
    description: "Pulls the latest 750 federal grant opportunities daily",
  },
  "crawl-sources": {
    name: "State &amp; foundation sources",
    description: "AI-extracts grants from 500+ state agency and foundation websites",
  },
  "ingest-990": {
    name: "Foundation 990 data (ProPublica)",
    description: "Ingests private foundation 990-PF filings with giving history",
  },
  "enrich-grants": {
    name: "Grant enrichment",
    description: "Adds eligibility details, requirements, and submission guidance",
  },
  "enrich-competitiveness": {
    name: "Competitiveness scoring",
    description: "Estimates award probability based on historical win rates",
  },
  "validate-grants": {
    name: "Grant validation",
    description: "Checks active grants against their sources for changes",
  },
  "check-urls": {
    name: "Link freshness",
    description: "Weekly HEAD-checks every grant URL and updates redirects",
  },
  "generate-embeddings": {
    name: "Search embeddings",
    description: "Regenerates semantic search vectors for new grants",
  },
  "send-lead-nurture": {
    name: "Email sequences",
    description: "Drip campaigns for readiness leads and nurture sequences",
  },
  "process-jobs": {
    name: "Background job queue",
    description: "Runs every 15 minutes to process async AI and verification jobs",
  },
};

export default async function StatusPage() {
  const statuses = await getCronStatuses();
  const totalCrons = TRACKED_CRONS.length;
  const healthy = statuses.filter((s) => !s.isStale && s.lastOutcome === "ok").length;
  const degraded = statuses.filter(
    (s) => !s.isStale && (s.lastOutcome === "partial" || s.lastOutcome === "error")
  ).length;
  const stale = statuses.filter((s) => s.isStale).length;

  const overallStatus =
    stale === 0 && degraded === 0
      ? "all-operational"
      : stale === 0
      ? "degraded"
      : "major-issue";

  const overallColor =
    overallStatus === "all-operational"
      ? "bg-green-500"
      : overallStatus === "degraded"
      ? "bg-amber-500"
      : "bg-red-500";

  const overallText =
    overallStatus === "all-operational"
      ? "All systems operational"
      : overallStatus === "degraded"
      ? "Some systems degraded"
      : `${stale} system${stale > 1 ? "s" : ""} stale (> 25h since last run)`;

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero header with pulse */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 shadow-sm">
          <span
            className={`relative inline-flex h-3 w-3 rounded-full ${overallColor}`}
          >
            {overallStatus === "all-operational" && (
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${overallColor} opacity-60 animate-ping`}
              />
            )}
          </span>
          <span className="font-semibold text-warm-900 dark:text-warm-50">
            {overallText}
          </span>
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50">
          GrantAQ Status
        </h1>
        <p className="mt-3 text-sm text-warm-600 dark:text-warm-400 max-w-xl mx-auto">
          Real-time status of every grant ingestion pipeline. Last updated at
          page load; refreshes every minute.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <SummaryTile
          count={healthy}
          total={totalCrons}
          label="Operational"
          color="text-green-600 dark:text-green-400"
        />
        <SummaryTile
          count={degraded}
          total={totalCrons}
          label="Degraded"
          color="text-amber-600 dark:text-amber-400"
        />
        <SummaryTile
          count={stale}
          total={totalCrons}
          label="Stale"
          color="text-red-600 dark:text-red-400"
        />
      </div>

      {/* Per-cron detail */}
      <div className="space-y-3">
        {statuses.map((s) => {
          const label = LABELS[s.cronName] ?? {
            name: s.cronName,
            description: "",
          };
          const isHealthy = !s.isStale && s.lastOutcome === "ok";
          const isDegraded =
            !s.isStale && (s.lastOutcome === "partial" || s.lastOutcome === "error");
          const isStale = s.isStale;

          return (
            <div
              key={s.cronName}
              className="rounded-lg border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-4 flex items-center gap-4"
            >
              <div className="shrink-0">
                {isStale ? (
                  <AlertTriangle
                    className="h-5 w-5 text-red-500"
                    aria-label="Stale"
                  />
                ) : isDegraded ? (
                  <AlertTriangle
                    className="h-5 w-5 text-amber-500"
                    aria-label="Degraded"
                  />
                ) : isHealthy ? (
                  <CheckCircle2
                    className="h-5 w-5 text-green-500"
                    aria-label="Operational"
                  />
                ) : (
                  <Clock
                    className="h-5 w-5 text-warm-400"
                    aria-label="Unknown"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold text-sm text-warm-900 dark:text-warm-50"
                  dangerouslySetInnerHTML={{ __html: label.name }}
                />
                {label.description && (
                  <p className="text-xs text-warm-500 dark:text-warm-400 mt-0.5 truncate">
                    {label.description}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p
                  className="text-xs font-medium text-warm-900 dark:text-warm-50 tabular-nums"
                  title={fmtUtc(s.lastRunAt)}
                >
                  {fmtAgo(s.lastRunAt)}
                </p>
                <p className="text-[10px] text-warm-400 uppercase tracking-wider">
                  {s.runsLast24h} runs / 24h
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <p className="text-xs text-warm-500">
          Questions about pipeline status? Email{" "}
          <a
            href="mailto:support@grantaq.com"
            className="text-brand-teal hover:underline"
          >
            support@grantaq.com
          </a>
          . Security incident? Email{" "}
          <a
            href="mailto:security@grantaq.com"
            className="text-brand-teal hover:underline"
          >
            security@grantaq.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}

function SummaryTile({
  count,
  total,
  label,
  color,
}: {
  count: number;
  total: number;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-5 text-center">
      <p className={`text-3xl font-bold tabular-nums ${color}`}>
        {count}
        <span className="text-lg text-warm-400 font-normal">/{total}</span>
      </p>
      <p className="text-xs uppercase tracking-wider text-warm-500 mt-1">
        {label}
      </p>
    </div>
  );
}
