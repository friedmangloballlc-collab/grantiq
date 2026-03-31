"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrantLibraryCard, type GrantLibraryItem } from "./grant-library-card";
import { Button } from "@/components/ui/button";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const GRANT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "federal", label: "Federal" },
  { value: "state", label: "State" },
  { value: "foundation", label: "Foundation" },
  { value: "corporate", label: "Corporate" },
];

interface Filters {
  q: string;
  type: string;
  state: string;
  min: string;
  max: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function LibrarySearch() {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    type: "all",
    state: "all",
    min: "",
    max: "",
  });
  const [grants, setGrants] = useState<GrantLibraryItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQ = useDebounce(filters.q, 350);

  const buildUrl = useCallback(
    (f: Filters, pg: number) => {
      const params = new URLSearchParams();
      if (f.q.trim()) params.set("q", f.q.trim());
      if (f.type && f.type !== "all") params.set("type", f.type);
      if (f.state && f.state !== "all") params.set("state", f.state);
      if (f.min) params.set("min", f.min);
      if (f.max) params.set("max", f.max);
      if (pg > 0) params.set("page", String(pg));
      return `/api/library/search?${params.toString()}`;
    },
    []
  );

  const fetchGrants = useCallback(
    async (f: Filters, pg: number, append: boolean) => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildUrl(f, pg), { signal: ctrl.signal });
        if (!res.ok) throw new Error("Failed to load grants");
        const data = await res.json();
        setGrants((prev) => (append ? [...prev, ...(data.grants ?? [])] : data.grants ?? []));
        setHasMore(data.hasMore ?? false);
        setPage(pg);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Failed to load grants. Please try again.");
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    },
    [buildUrl]
  );

  // Fetch on filter/search change (reset to page 0)
  useEffect(() => {
    const f = { ...filters, q: debouncedQ };
    setPage(0);
    fetchGrants(f, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, filters.type, filters.state, filters.min, filters.max]);

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ q: "", type: "all", state: "all", min: "", max: "" });
  };

  const hasActiveFilters =
    filters.q || filters.type !== "all" || filters.state !== "all" || filters.min || filters.max;

  const loadMore = () => {
    fetchGrants({ ...filters, q: debouncedQ }, page + 1, true);
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search 2,344 grants by name, funder, or keyword…"
          value={filters.q}
          onChange={(e) => handleFilterChange("q", e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-warm-200 dark:border-warm-700 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/50 focus:border-brand-teal"
        />
        {filters.q && (
          <button
            onClick={() => handleFilterChange("q", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {GRANT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => handleFilterChange("type", t.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filters.type === t.value
                  ? "bg-brand-teal text-white"
                  : "bg-warm-100 dark:bg-warm-800 text-warm-600 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* State dropdown */}
          <div className="relative">
            <select
              value={filters.state}
              onChange={(e) => handleFilterChange("state", e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-warm-200 dark:border-warm-700 bg-background text-xs focus:outline-none focus:ring-2 focus:ring-brand-teal/50 cursor-pointer"
            >
              <option value="all">All States</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-warm-400 pointer-events-none" />
          </div>

          {/* Amount range */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-warm-400">$</span>
            <input
              type="number"
              placeholder="Min"
              value={filters.min}
              onChange={(e) => handleFilterChange("min", e.target.value)}
              className="w-20 px-2 py-1.5 rounded-lg border border-warm-200 dark:border-warm-700 bg-background text-xs focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
            />
            <span className="text-xs text-warm-400">–</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.max}
              onChange={(e) => handleFilterChange("max", e.target.value)}
              className="w-20 px-2 py-1.5 rounded-lg border border-warm-200 dark:border-warm-700 bg-background text-xs focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-warm-500 hover:text-warm-700 dark:hover:text-warm-300"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Results */}
      {initialLoad ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-warm-100 dark:bg-warm-800/50 animate-pulse h-48" />
          ))}
        </div>
      ) : grants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-warm-300 dark:text-warm-600 mb-3" />
          <h3 className="text-base font-semibold text-warm-700 dark:text-warm-300">No grants found</h3>
          <p className="text-sm text-warm-500 mt-1">
            Try adjusting your search or filters to find matching grants.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-brand-teal hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-warm-500">
              {loading ? "Searching…" : `Showing ${grants.length} grant${grants.length !== 1 ? "s" : ""}${hasMore ? " (scroll for more)" : ""}`}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grants.map((grant) => (
              <GrantLibraryCard key={grant.id} grant={grant} />
            ))}
            {/* Loading skeletons when fetching more */}
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`skel-${i}`} className="rounded-xl bg-warm-100 dark:bg-warm-800/50 animate-pulse h-48" />
              ))}
          </div>
          {hasMore && !loading && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                className="px-8"
              >
                Load more grants
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
