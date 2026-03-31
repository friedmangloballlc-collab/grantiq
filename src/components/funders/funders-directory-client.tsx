"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FunderType = "federal" | "state" | "foundation" | "corporate";

interface FunderRow {
  name: string;
  type: FunderType;
  grantCount: number;
  averageAward: number;
  topFocusArea: string | null;
  avgMatchScore: number | null;
}

type SortKey = "grantCount" | "averageAward" | "avgMatchScore";

const TYPE_LABELS: Record<FunderType, string> = {
  federal: "Federal",
  state: "State",
  foundation: "Foundation",
  corporate: "Corporate",
};

const TYPE_COLORS: Record<FunderType, string> = {
  federal:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  state:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  foundation:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  corporate:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

function formatAmount(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return n > 0 ? `$${n}` : "Varies";
}

interface Props {
  funders: FunderRow[];
  hasMatchData: boolean;
}

const FILTER_TYPES: Array<FunderType | "all"> = [
  "all",
  "federal",
  "state",
  "foundation",
  "corporate",
];

export function FundersDirectoryClient({ funders, hasMatchData }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FunderType | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>(
    hasMatchData ? "avgMatchScore" : "grantCount"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let rows = funders;

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((f) => f.name.toLowerCase().includes(q));
    }

    if (typeFilter !== "all") {
      rows = rows.filter((f) => f.type === typeFilter);
    }

    rows = [...rows].sort((a, b) => {
      const aVal = (a[sortKey] ?? -1) as number;
      const bVal = (b[sortKey] ?? -1) as number;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });

    return rows;
  }, [funders, query, typeFilter, sortKey, sortDir]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <span className="inline-block w-3 h-3 opacity-0" />;
    return sortDir === "desc" ? (
      <ChevronDown className="inline h-3 w-3 ml-0.5" />
    ) : (
      <ChevronUp className="inline h-3 w-3 ml-0.5" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search funders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-warm-200 dark:border-warm-700 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                typeFilter === t
                  ? "bg-brand-teal text-white border-brand-teal"
                  : "border-warm-200 dark:border-warm-700 text-warm-600 dark:text-warm-400 hover:border-brand-teal/50"
              )}
            >
              {t === "all" ? "All Types" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-warm-200 dark:border-warm-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-200 dark:border-warm-800 bg-warm-50 dark:bg-warm-900/50">
              <th className="text-left px-4 py-3 font-medium text-warm-600 dark:text-warm-400">
                Funder
              </th>
              <th className="text-left px-4 py-3 font-medium text-warm-600 dark:text-warm-400">
                Type
              </th>
              <th
                className="text-right px-4 py-3 font-medium text-warm-600 dark:text-warm-400 cursor-pointer select-none hover:text-warm-900 dark:hover:text-warm-100"
                onClick={() => handleSort("grantCount")}
              >
                Grants <SortIcon col="grantCount" />
              </th>
              <th
                className="text-right px-4 py-3 font-medium text-warm-600 dark:text-warm-400 cursor-pointer select-none hover:text-warm-900 dark:hover:text-warm-100"
                onClick={() => handleSort("averageAward")}
              >
                Avg Award <SortIcon col="averageAward" />
              </th>
              <th className="text-left px-4 py-3 font-medium text-warm-600 dark:text-warm-400">
                Top Focus Area
              </th>
              {hasMatchData && (
                <th
                  className="text-right px-4 py-3 font-medium text-warm-600 dark:text-warm-400 cursor-pointer select-none hover:text-warm-900 dark:hover:text-warm-100"
                  onClick={() => handleSort("avgMatchScore")}
                >
                  Your Match <SortIcon col="avgMatchScore" />
                </th>
              )}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100 dark:divide-warm-800">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={hasMatchData ? 7 : 6}
                  className="px-4 py-8 text-center text-sm text-warm-400"
                >
                  No funders match your search.
                </td>
              </tr>
            )}
            {filtered.map((funder) => (
              <tr
                key={funder.name}
                className="hover:bg-warm-50 dark:hover:bg-warm-900/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/funders/${encodeURIComponent(funder.name)}`}
                    className="font-medium text-warm-900 dark:text-warm-50 hover:text-brand-teal transition-colors"
                  >
                    {funder.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      TYPE_COLORS[funder.type]
                    )}
                  >
                    {TYPE_LABELS[funder.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-warm-700 dark:text-warm-300">
                  {funder.grantCount}
                </td>
                <td className="px-4 py-3 text-right text-warm-700 dark:text-warm-300">
                  {formatAmount(funder.averageAward)}
                </td>
                <td className="px-4 py-3 text-warm-500 dark:text-warm-400 text-xs">
                  {funder.topFocusArea ?? "—"}
                </td>
                {hasMatchData && (
                  <td className="px-4 py-3 text-right">
                    {funder.avgMatchScore !== null ? (
                      <span
                        className={cn(
                          "font-semibold text-sm",
                          funder.avgMatchScore >= 70
                            ? "text-green-600 dark:text-green-400"
                            : funder.avgMatchScore >= 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-warm-400"
                        )}
                      >
                        {funder.avgMatchScore}%
                      </span>
                    ) : (
                      <span className="text-warm-300 dark:text-warm-600 text-sm">
                        —
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link
                    href={`/funders/${encodeURIComponent(funder.name)}`}
                    className="text-xs text-brand-teal hover:text-brand-teal/80 font-medium whitespace-nowrap"
                  >
                    View Profile →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-warm-400">
        Showing {filtered.length} of {funders.length} funders
      </p>
    </div>
  );
}
