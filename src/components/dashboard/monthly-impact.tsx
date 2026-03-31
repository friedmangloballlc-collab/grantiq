"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, Zap, CheckCircle2, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MonthActivity {
  month: string; // e.g. "Mar 2026"
  newMatches: number;
  grantsEvaluated: number;
  applicationsSubmitted: number;
  readinessStart: number;
  readinessEnd: number;
  grantsUnlocked: number;
  unlockReason?: string; // e.g. "uploading your audit"
}

interface MonthlyImpactProps {
  currentMonth: MonthActivity;
  previousMonths?: MonthActivity[];
}

function ActivityRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-warm-600 dark:text-warm-400">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold",
          highlight
            ? "text-[var(--color-brand-teal)]"
            : "text-warm-900 dark:text-warm-50"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ReadinessBadge({
  start,
  end,
}: {
  start: number;
  end: number;
}) {
  const delta = end - start;
  const improved = delta > 0;

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-sm text-warm-600 dark:text-warm-400 flex-1">
        Readiness Score
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-warm-900 dark:text-warm-50">
          {start} → {end}
        </span>
        {improved && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
            <ArrowUp className="h-2.5 w-2.5" />+{delta}
          </span>
        )}
      </div>
    </div>
  );
}

function MonthCard({
  activity,
  isCurrentMonth,
}: {
  activity: MonthActivity;
  isCurrentMonth: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        isCurrentMonth
          ? "border-[var(--color-brand-teal)]/30 bg-[var(--color-brand-teal)]/5 dark:bg-[var(--color-brand-teal)]/10"
          : "border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800/50"
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold mb-2",
          isCurrentMonth
            ? "text-[var(--color-brand-teal)]"
            : "text-warm-500"
        )}
      >
        {isCurrentMonth ? `This Month — ${activity.month}` : activity.month}
      </p>

      <div className="divide-y divide-warm-200 dark:divide-warm-700">
        <ActivityRow
          label="New matches found"
          value={`${activity.newMatches} new${activity.newMatches > 0 ? " 🎯" : ""}`}
          highlight={activity.newMatches > 0}
        />
        <ActivityRow
          label="Grants evaluated"
          value={String(activity.grantsEvaluated)}
        />
        <ActivityRow
          label="Applications submitted"
          value={String(activity.applicationsSubmitted)}
        />
        <ReadinessBadge start={activity.readinessStart} end={activity.readinessEnd} />
        {activity.grantsUnlocked > 0 && (
          <ActivityRow
            label={`Grants unlocked${activity.unlockReason ? ` (${activity.unlockReason})` : ""}`}
            value={`+${activity.grantsUnlocked}`}
            highlight
          />
        )}
      </div>
    </div>
  );
}

export function MonthlyImpact({
  currentMonth,
  previousMonths = [],
}: MonthlyImpactProps) {
  const [expanded, setExpanded] = useState(false);
  const hasPreviousMonths = previousMonths.length > 0;

  // Proof-of-value indicators even with no wins
  const totalActivity =
    currentMonth.newMatches +
    currentMonth.grantsEvaluated +
    currentMonth.applicationsSubmitted;

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--color-brand-teal)]" />
            Monthly Impact
          </CardTitle>
          {hasPreviousMonths && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-warm-500 hover:text-warm-700 dark:hover:text-warm-300 transition-colors"
            >
              {expanded ? "Hide history" : "Last 3 months"}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <MonthCard activity={currentMonth} isCurrentMonth />

        {/* Proof-of-value message when no wins yet */}
        {currentMonth.applicationsSubmitted === 0 && totalActivity > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              The platform is working — {currentMonth.newMatches} new matches
              found and your readiness score grew from{" "}
              {currentMonth.readinessStart} to {currentMonth.readinessEnd} this
              month.
            </p>
          </div>
        )}

        {currentMonth.applicationsSubmitted > 0 && (
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {currentMonth.applicationsSubmitted} application
            {currentMonth.applicationsSubmitted > 1 ? "s" : ""} submitted this
            month — well done!
          </div>
        )}

        {/* Previous months (expandable) */}
        {expanded && hasPreviousMonths && (
          <div className="space-y-3 pt-1">
            <p className="text-xs font-medium text-warm-500 uppercase tracking-wider">
              Previous Months
            </p>
            {previousMonths.map((month) => (
              <MonthCard
                key={month.month}
                activity={month}
                isCurrentMonth={false}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
