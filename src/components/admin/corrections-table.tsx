"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export interface Correction {
  id: string;
  grant_id: string;
  grant_name: string | null;
  field_name: string;
  current_value: string | null;
  suggested_value: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  user_email: string | null;
  user_id: string;
}

interface CorrectionsTableProps {
  corrections: Correction[];
}

type ActionStatus = "idle" | "pending" | "success" | "error";

interface RowState {
  status: ActionStatus;
  message?: string;
  resolved?: "approved" | "rejected";
}

export function CorrectionsTable({ corrections: initial }: CorrectionsTableProps) {
  const [rows, setRows] = useState<Correction[]>(initial);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [, startTransition] = useTransition();

  async function handleAction(id: string, action: "approve" | "reject") {
    setRowStates((prev) => ({ ...prev, [id]: { status: "pending" } }));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/corrections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setRowStates((prev) => ({
            ...prev,
            [id]: { status: "error", message: (body as { error?: string }).error ?? "Request failed" },
          }));
          return;
        }

        setRowStates((prev) => ({
          ...prev,
          [id]: { status: "success" as const, resolved: (action === "approve" ? "approved" : "rejected") as "approved" | "rejected" },
        }));

        // Remove the row from the visible list after a short delay
        setTimeout(() => {
          setRows((prev) => prev.filter((r) => r.id !== id));
        }, 1200);
      } catch {
        setRowStates((prev) => ({
          ...prev,
          [id]: { status: "error", message: "Network error" },
        }));
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No pending corrections.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <th className="pb-2 pr-4">Grant</th>
            <th className="pb-2 pr-4">Field</th>
            <th className="pb-2 pr-4">Current value</th>
            <th className="pb-2 pr-4">Suggested value</th>
            <th className="pb-2 pr-4">Submitted by</th>
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const state = rowStates[row.id] ?? { status: "idle" };
            const isPending = state.status === "pending";

            return (
              <tr key={row.id} className="align-top">
                <td className="py-3 pr-4 font-medium text-warm-900 dark:text-warm-50 max-w-[160px]">
                  <span className="line-clamp-2">{row.grant_name ?? row.grant_id}</span>
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {row.field_name}
                </td>
                <td className="py-3 pr-4 max-w-[160px]">
                  <span className="line-clamp-3 text-muted-foreground">
                    {row.current_value ?? <em className="text-muted-foreground/60">empty</em>}
                  </span>
                </td>
                <td className="py-3 pr-4 max-w-[200px]">
                  <span className="line-clamp-3 text-[var(--color-brand-teal-text)]">
                    {row.suggested_value}
                  </span>
                  {row.notes && (
                    <p className="mt-1 text-xs text-muted-foreground italic line-clamp-2">
                      {row.notes}
                    </p>
                  )}
                </td>
                <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap text-xs">
                  {row.user_email ?? row.user_id.slice(0, 8) + "…"}
                </td>
                <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap text-xs">
                  {new Date(row.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="py-3">
                  {state.status === "success" ? (
                    <span
                      className={
                        state.resolved === "approved"
                          ? "text-xs font-medium text-[var(--color-brand-teal-text)]"
                          : "text-xs font-medium text-muted-foreground"
                      }
                    >
                      {state.resolved === "approved" ? "Approved" : "Rejected"}
                    </span>
                  ) : state.status === "error" ? (
                    <span className="text-xs text-destructive">{state.message}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={isPending}
                        onClick={() => handleAction(row.id, "approve")}
                        className="bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal-dark)] text-white border-transparent"
                      >
                        {isPending ? "…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleAction(row.id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
