"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface FlaggedGrant {
  id: string;
  name: string;
  funder_name: string;
  url: string | null;
  manual_review_flag: boolean;
  manual_review_reason: string | null;
  last_verified: string | null;
}

type Action = "clear" | "archive" | "suppress";

export function VerifierReviewQueue({ flagged: initial }: { flagged: FlaggedGrant[] }) {
  const [rows, setRows] = useState<FlaggedGrant[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No grants flagged for manual review. Verifier is happy.
      </p>
    );
  }

  async function act(grantId: string, action: Action) {
    setBusyId(grantId);
    try {
      const res = await fetch("/api/admin/grant-verifier/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_source_id: grantId, action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? `Failed to ${action}`);
        setBusyId(null);
        return;
      }
      setRows((prev) => prev.filter((g) => g.id !== grantId));
    } catch {
      alert(`Network error`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
            <th className="text-left py-2 font-medium">Grant</th>
            <th className="text-left py-2 font-medium">Reason</th>
            <th className="text-left py-2 font-medium">Last checked</th>
            <th className="text-right py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.id} className="border-b border-border last:border-0 align-top">
              <td className="py-3 pr-4 min-w-0">
                <p className="font-medium text-warm-900 dark:text-warm-50 truncate max-w-xs">
                  {g.name}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{g.funder_name}</p>
              </td>
              <td className="py-3 pr-4 text-xs text-muted-foreground max-w-sm">
                {g.manual_review_reason ?? "—"}
              </td>
              <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                {g.last_verified
                  ? new Date(g.last_verified).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "never"}
              </td>
              <td className="py-3 text-right whitespace-nowrap">
                <div className="inline-flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === g.id}
                    onClick={() => act(g.id, "clear")}
                    title="Clear flag — verifier will re-check on next run"
                  >
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === g.id}
                    onClick={() => act(g.id, "suppress")}
                    title="Keep grant active and stop re-flagging"
                  >
                    Suppress
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === g.id}
                    onClick={() => {
                      if (confirm(`Archive "${g.name}"? It will be removed from matches.`)) {
                        act(g.id, "archive");
                      }
                    }}
                    className="text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Mark inactive"
                  >
                    Archive
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
