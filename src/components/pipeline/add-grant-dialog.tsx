"use client";

import { useState, useRef, useCallback } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrg } from "@/hooks/use-org";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrantResult {
  id: string;
  name: string;
  funder_name: string;
  grant_type?: string;
  amount_max?: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddGrantDialog() {
  const { orgId } = useOrg();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GrantResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- debounced search ---
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/library/search?q=${encodeURIComponent(q.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : (data.results ?? []));
        }
      } catch {
        toast.error("Search failed. Please try again.");
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    search(e.target.value);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery("");
      setResults([]);
    }
    setOpen(nextOpen);
  }

  async function handleAdd(grant: GrantResult) {
    if (addingId) return;
    setAddingId(grant.id);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_source_id: grant.id,
          org_id: orgId,
          stage: "identified",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to add grant");
      }

      toast.success(`"${grant.name}" added to your pipeline.`);
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not add grant to pipeline."
      );
    } finally {
      setAddingId(null);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <Button
        onClick={() => setOpen(true)}
        className="bg-brand-teal hover:bg-brand-teal-dark text-white gap-1.5"
        size="default"
      >
        <Plus className="h-4 w-4" />
        Add Grant
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-lg w-full p-0 gap-0 overflow-hidden"
          aria-label="Add grant to pipeline"
        >
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
            <DialogTitle>Add Grant to Pipeline</DialogTitle>
          </DialogHeader>

          {/* Search input */}
          <div className="px-5 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search grants by name, funder, or type..."
                autoFocus
                className={cn(
                  "w-full rounded-lg border border-border bg-background",
                  "pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                  "outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal",
                  "transition-shadow"
                )}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>
          </div>

          {/* Results list */}
          <div className="overflow-y-auto max-h-[320px] px-3 pb-4">
            {/* Placeholder when no query yet */}
            {!query.trim() && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Start typing to search the grant library.
              </p>
            )}

            {/* No results after searching */}
            {query.trim() && !searching && results.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No grants found for &ldquo;{query}&rdquo;.
              </p>
            )}

            {/* Result rows */}
            {results.map((grant) => {
              const isAdding = addingId === grant.id;
              return (
                <button
                  key={grant.id}
                  type="button"
                  disabled={!!addingId}
                  onClick={() => handleAdd(grant)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3",
                    "rounded-lg px-3 py-3 text-left",
                    "hover:bg-accent transition-colors duration-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50",
                    "disabled:opacity-60 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {grant.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate mt-0.5">
                      {grant.funder_name}
                      {grant.grant_type ? ` · ${grant.grant_type}` : ""}
                      {grant.amount_max
                        ? ` · up to ${formatAmount(grant.amount_max)}`
                        : ""}
                    </span>
                  </div>

                  {isAdding ? (
                    <Loader2 className="h-4 w-4 text-brand-teal animate-spin shrink-0" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
