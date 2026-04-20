"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface AlertRow {
  id: string;
  alert_type: string;
  org_id: string | null;
  severity: "info" | "warning" | "critical";
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
  ago: string;
}

const SEVERITY_STYLES: Record<AlertRow["severity"], string> = {
  info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  critical: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
};

const SEVERITY_EMOJI: Record<AlertRow["severity"], string> = {
  info: "ℹ",
  warning: "⚠",
  critical: "🚨",
};

export function AlertsTable({ alerts: initial }: { alerts: AlertRow[] }) {
  const [alerts, setAlerts] = useState<AlertRow[]>(initial);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No active alerts. The watchdog is watching.
      </p>
    );
  }

  async function resolve(id: string) {
    setResolvingId(id);
    try {
      const res = await fetch("/api/admin/cost-watchdog/resolve-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, note: "resolved via admin UI" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Failed to resolve alert");
        setResolvingId(null);
        return;
      }
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Network error resolving alert");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${SEVERITY_STYLES[a.severity]}`}
        >
          <span className="text-base shrink-0 mt-0.5">{SEVERITY_EMOJI[a.severity]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
              <span className="font-semibold">{a.alert_type}</span>
              <span>·</span>
              <span>{a.ago}</span>
              {a.org_id && (
                <>
                  <span>·</span>
                  <span className="font-mono">{a.org_id.slice(0, 8)}</span>
                </>
              )}
            </div>
            <p className="mt-1">{a.message}</p>
            {Object.keys(a.metadata).length > 0 && (
              <details className="mt-1 text-xs opacity-70">
                <summary className="cursor-pointer hover:opacity-100">metadata</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all">
                  {JSON.stringify(a.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => resolve(a.id)}
            disabled={resolvingId === a.id}
            className="shrink-0"
          >
            {resolvingId === a.id ? "…" : "Resolve"}
          </Button>
        </div>
      ))}
    </div>
  );
}
