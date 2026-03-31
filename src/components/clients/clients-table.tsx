"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ArrowRightLeft, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClientRow {
  orgId: string;
  orgName: string;
  entityType: string | null;
  state: string | null;
  role: string;
  tier: string;
  activePipelineCount: number;
  lastActivity: string | null;
}

interface ClientsTableProps {
  clients: ClientRow[];
  currentOrgId: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReadinessBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : score >= 40
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", color)}>
      {score}
    </span>
  );
}

export function ClientsTable({ clients, currentOrgId }: ClientsTableProps) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const router = useRouter();

  const filtered = clients.filter((c) =>
    c.orgName.toLowerCase().includes(query.toLowerCase()) ||
    (c.state ?? "").toLowerCase().includes(query.toLowerCase()) ||
    (c.entityType ?? "").toLowerCase().includes(query.toLowerCase())
  );

  async function handleSwitch(orgId: string) {
    setSwitchingId(orgId);
    try {
      const res = await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        startTransition(() => {
          router.push("/dashboard");
          router.refresh();
        });
      }
    } finally {
      setSwitchingId(null);
    }
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-1">No clients yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Add your first client organization to start managing their grant pipeline.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search clients by name, state, or entity type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Organization</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Entity / State</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">Pipeline</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Last Activity</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No clients match &ldquo;{query}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((client) => (
                <tr
                  key={client.orgId}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    client.orgId === currentOrgId && "bg-[var(--color-brand-teal)]/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[var(--color-brand-teal)]/10 flex items-center justify-center text-[var(--color-brand-teal)] font-semibold text-xs shrink-0">
                        {client.orgName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{client.orgName}</p>
                        {client.orgId === currentOrgId && (
                          <span className="text-xs text-[var(--color-brand-teal)]">Active</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    <span className="truncate">
                      {[client.entityType, client.state].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {client.activePipelineCount} active
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {formatDate(client.lastActivity)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {client.orgId === currentOrgId ? (
                      <span className="text-xs text-muted-foreground">Current</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending || switchingId === client.orgId}
                        onClick={() => handleSwitch(client.orgId)}
                        className="gap-1.5"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        {switchingId === client.orgId ? "Switching…" : "Switch"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {clients.length} client{clients.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
