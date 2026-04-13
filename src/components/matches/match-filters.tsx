"use client";

import { useState, useMemo, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MatchGrantSource {
  name: string | null;
  funder_name: string | null;
  source_type: string | null;
  amount_max: number | null;
  deadline: string | null;
}

export interface MatchItem {
  id: string;
  grant_source_id: string;
  match_score: number;
  scores: Record<string, number> | null;
  score_breakdown: Record<string, number> | null;
  missing_requirements: string[] | null;
  grant_sources: MatchGrantSource | null;
}

type SourceTypeFilter = "all" | "federal" | "state" | "foundation" | "corporate";
type SortBy = "match_score" | "deadline_soonest" | "amount_highest";
type DeadlineRange = "all" | "30" | "60" | "90";

interface MatchFiltersProps {
  matches: MatchItem[];
  children: (filtered: MatchItem[]) => React.ReactNode;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_TYPE_PILLS: { value: SourceTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "federal", label: "Federal" },
  { value: "state", label: "State" },
  { value: "foundation", label: "Foundation" },
  { value: "corporate", label: "Corporate" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "match_score", label: "Match Score" },
  { value: "deadline_soonest", label: "Deadline Soonest" },
  { value: "amount_highest", label: "Amount Highest" },
];

const DEADLINE_OPTIONS: { value: DeadlineRange; label: string }[] = [
  { value: "all", label: "All" },
  { value: "30", label: "Next 30 days" },
  { value: "60", label: "Next 60 days" },
  { value: "90", label: "Next 90 days" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysFromTimestamp(deadline: string, now: number): number {
  const diff = new Date(deadline).getTime() - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function MatchFilters({ matches, children }: MatchFiltersProps) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [sourceType, setSourceType] = useState<SourceTypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("match_score");
  const [deadlineRange, setDeadlineRange] = useState<DeadlineRange>("all");

  const filtered = useMemo<MatchItem[]>(() => {
    let result = [...matches];

    // Filter by source type
    if (sourceType !== "all") {
      result = result.filter(
        (m) => (m.grant_sources?.source_type ?? "").toLowerCase() === sourceType
      );
    }

    // Filter by deadline range
    if (deadlineRange !== "all") {
      const days = parseInt(deadlineRange, 10);
      result = result.filter((m) => {
        const deadline = m.grant_sources?.deadline;
        if (!deadline) return false;
        const daysUntil = daysFromTimestamp(deadline, now);
        return daysUntil >= 0 && daysUntil <= days;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "match_score") {
        return b.match_score - a.match_score;
      }
      if (sortBy === "deadline_soonest") {
        const da = a.grant_sources?.deadline;
        const db = b.grant_sources?.deadline;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return daysFromTimestamp(da, now) - daysFromTimestamp(db, now);
      }
      if (sortBy === "amount_highest") {
        return (b.grant_sources?.amount_max ?? 0) - (a.grant_sources?.amount_max ?? 0);
      }
      return 0;
    });

    return result;
  }, [matches, sourceType, sortBy, deadlineRange, now]);

  const activeCount = filtered.length;
  const totalCount = matches.length;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col gap-3 mb-5 p-4 bg-warm-50 dark:bg-warm-800/30 border border-warm-200 dark:border-warm-700 rounded-xl">
        {/* Row 1: source type pills + result count */}
        <div className="flex flex-wrap items-center gap-2">
          {SOURCE_TYPE_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setSourceType(pill.value)}
              className={[
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors",
                sourceType === pill.value
                  ? "bg-brand-teal text-white"
                  : "bg-white dark:bg-warm-800 text-warm-600 dark:text-warm-300 border border-warm-200 dark:border-warm-600 hover:border-brand-teal hover:text-brand-teal",
              ].join(" ")}
            >
              {pill.label}
            </button>
          ))}

          {activeCount < totalCount && (
            <span className="ml-auto text-xs text-warm-400">
              {activeCount} of {totalCount} shown
            </span>
          )}
        </div>

        {/* Row 2: sort + deadline */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="matches-sort"
              className="text-xs text-warm-500 whitespace-nowrap"
            >
              Sort by
            </label>
            <select
              id="matches-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="text-xs rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-800 text-warm-700 dark:text-warm-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="matches-deadline"
              className="text-xs text-warm-500 whitespace-nowrap"
            >
              Deadline
            </label>
            <select
              id="matches-deadline"
              value={deadlineRange}
              onChange={(e) => setDeadlineRange(e.target.value as DeadlineRange)}
              className="text-xs rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-800 text-warm-700 dark:text-warm-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
            >
              {DEADLINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset link — only show when any filter is active */}
          {(sourceType !== "all" || deadlineRange !== "all" || sortBy !== "match_score") && (
            <button
              onClick={() => {
                setSourceType("all");
                setSortBy("match_score");
                setDeadlineRange("all");
              }}
              className="text-xs text-warm-400 hover:text-warm-600 underline underline-offset-2 ml-auto"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Empty state when filters produce no results */}
      {activeCount === 0 ? (
        <div className="text-center py-12 text-warm-400 text-sm">
          No matches found for the selected filters.
          <button
            onClick={() => {
              setSourceType("all");
              setSortBy("match_score");
              setDeadlineRange("all");
            }}
            className="block mx-auto mt-2 text-brand-teal hover:underline text-xs"
          >
            Clear filters
          </button>
        </div>
      ) : (
        children(filtered)
      )}
    </div>
  );
}
