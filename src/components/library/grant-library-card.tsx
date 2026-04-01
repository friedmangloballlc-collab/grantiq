"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeadlineCountdown } from "@/components/shared/deadline-countdown";
import { cn } from "@/lib/utils";

export interface GrantLibraryItem {
  id: string;
  name: string;
  funder_name: string;
  source_type: string;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  description: string | null;
  category: string | null;
  states: string[];
  url: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  federal: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  state: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  foundation: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  corporate: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
};

function formatAmount(min: number | null, max: number | null): string {
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(0)}K`
      : `$${n}`;

  if (min && max && min !== max) return `${fmt(min)}–${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return "Amount varies";
}

export function GrantLibraryCard({ grant }: { grant: GrantLibraryItem }) {
  const typeColor =
    TYPE_COLORS[grant.source_type?.toLowerCase()] ??
    "bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300";

  const visibleStates = grant.states?.slice(0, 3) ?? [];
  const extraStates = (grant.states?.length ?? 0) - 3;

  return (
    <Card className="border-warm-200 dark:border-warm-800 hover:border-brand-teal/50 transition-colors h-full">
      <CardContent className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0",
              typeColor
            )}
          >
            {grant.source_type}
          </span>
          {grant.deadline && <DeadlineCountdown deadline={grant.deadline} />}
        </div>

        {/* Title + funder */}
        <Link href={`/grants/${grant.id}`} className="hover:underline">
          <h3 className="font-semibold text-warm-900 dark:text-warm-50 line-clamp-2 leading-snug">
            {grant.name}
          </h3>
        </Link>
        <p className="text-sm text-warm-500 mt-0.5 truncate">{grant.funder_name}</p>

        {/* Amount */}
        <p className="text-sm font-medium text-warm-700 dark:text-warm-300 mt-2">
          {formatAmount(grant.amount_min, grant.amount_max)}
        </p>

        {/* Category */}
        {grant.category && (
          <p className="text-xs text-warm-400 dark:text-warm-500 mt-1 truncate">
            {grant.category}
          </p>
        )}

        {/* State badges */}
        {visibleStates.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {visibleStates.map((s) => (
              <span
                key={s}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-warm-100 text-warm-600 dark:bg-warm-800 dark:text-warm-400"
              >
                {s}
              </span>
            ))}
            {extraStates > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-warm-100 text-warm-600 dark:bg-warm-800 dark:text-warm-400">
                +{extraStates} more
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            render={<Link href={`/grants/${grant.id}`}>View Details</Link>}
          />
          <Button
            size="sm"
            className="flex-1 text-xs bg-brand-teal hover:bg-brand-teal-dark text-white"
            render={<Link href={`/grants/${grant.id}`}>Start Application</Link>}
          />
        </div>
      </CardContent>
    </Card>
  );
}
