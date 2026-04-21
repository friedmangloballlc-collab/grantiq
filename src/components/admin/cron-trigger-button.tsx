"use client";

// Manually fire any cron from the admin dashboard. Uses the admin's
// existing session cookie — no ADMIN_SECRET or terminal required.
// The underlying /api/admin/ingest-trigger endpoint gates on the
// isAdminEmail allow-list, so only admins can hit it.

import { useState } from "react";
import { Loader2, Play, CheckCircle2, XCircle } from "lucide-react";

interface CronTriggerButtonProps {
  cronName: string;
}

type RunState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; ok: boolean; summary: string }
  | { kind: "error"; message: string };

export function CronTriggerButton({ cronName }: CronTriggerButtonProps) {
  const [state, setState] = useState<RunState>({ kind: "idle" });

  async function trigger() {
    setState({ kind: "running" });
    try {
      const res = await fetch("/api/admin/ingest-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cron: cronName }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        duration_ms?: number;
        result?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok) {
        setState({
          kind: "error",
          message: json.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      // Summarize the result — prefer specific counts when available
      const r = (json.result ?? {}) as Record<string, unknown>;
      const parts: string[] = [];
      if (typeof r.grants_added === "number") parts.push(`${r.grants_added} added`);
      if (typeof r.grants_inserted === "number") parts.push(`${r.grants_inserted} new`);
      if (typeof r.grants_updated === "number") parts.push(`${r.grants_updated} updated`);
      if (typeof r.grants_expired === "number") parts.push(`${r.grants_expired} expired`);
      if (typeof r.sources_crawled === "number") parts.push(`${r.sources_crawled} sources`);
      if (typeof r.funders_created === "number") parts.push(`${r.funders_created} funders`);
      if (typeof r.duration_ms === "number") parts.push(`${Math.round(r.duration_ms / 1000)}s`);
      const summary = parts.length > 0 ? parts.join(" · ") : "completed";
      setState({ kind: "done", ok: json.ok !== false, summary });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  if (state.kind === "running") {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-warm-100 dark:bg-warm-800 text-warm-600 dark:text-warm-400 cursor-wait"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        Running…
      </button>
    );
  }

  if (state.kind === "done") {
    return (
      <button
        onClick={trigger}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
        title={`Result: ${state.summary}. Click to run again.`}
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        {state.summary}
      </button>
    );
  }

  if (state.kind === "error") {
    return (
      <button
        onClick={trigger}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        title={`Error: ${state.message}. Click to retry.`}
      >
        <XCircle className="h-3 w-3" aria-hidden="true" />
        {state.message.slice(0, 28)}
      </button>
    );
  }

  return (
    <button
      onClick={trigger}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-warm-300 dark:border-warm-700 text-warm-700 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
      title={`Manually trigger ${cronName} now`}
    >
      <Play className="h-3 w-3" aria-hidden="true" />
      Run now
    </button>
  );
}
