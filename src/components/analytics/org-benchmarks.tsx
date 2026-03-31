"use client";

import { TrendingUp, Clock, Star, Users, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface OrgBenchmarksProps {
  winRate: number;
  avgDaysToSubmit: number;
  readinessScore: number;
  orgSize: "small" | "medium" | "large";
}

// Platform averages (anonymized)
const PLATFORM = {
  winRate: 22,
  avgDaysToSubmit: 42,
  readinessScore: 65,
};

// Benchmarks by org size
const SIZE_BENCHMARKS: Record<string, { winRate: number; avgDays: number; readiness: number }> = {
  small: { winRate: 19, avgDays: 46, readiness: 60 },
  medium: { winRate: 23, avgDays: 40, readiness: 67 },
  large: { winRate: 28, avgDays: 35, readiness: 72 },
};

function percentile(value: number, avg: number, lowerIsBetter = false): number {
  // Simplified percentile estimate: normal distribution approximation
  const diff = lowerIsBetter ? avg - value : value - avg;
  const sigma = avg * 0.3; // assume 30% std dev
  const z = diff / sigma;
  // Map z-score to approximate percentile
  if (z > 1.28) return 90;
  if (z > 0.84) return 80;
  if (z > 0.52) return 70;
  if (z > 0.25) return 60;
  if (z > 0) return 55;
  if (z > -0.25) return 45;
  if (z > -0.52) return 40;
  if (z > -0.84) return 30;
  if (z > -1.28) return 20;
  return 10;
}

function percentileLabel(pct: number): string {
  if (pct >= 90) return "top 10%";
  if (pct >= 80) return "top 20%";
  if (pct >= 75) return "top 25%";
  if (pct >= 70) return "top 30%";
  if (pct >= 60) return "top 40%";
  if (pct >= 50) return "above average";
  if (pct >= 40) return "near average";
  return "below average";
}

function percentileColor(pct: number): string {
  if (pct >= 70) return "#22c55e";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}

interface MetricRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  yourValue: string;
  platformAvg: string;
  sizeAvg: string;
  percentileVal: number;
  higherIsBetter?: boolean;
}

function MetricRow({
  icon: Icon,
  label,
  yourValue,
  platformAvg,
  sizeAvg,
  percentileVal,
}: MetricRowProps) {
  const color = percentileColor(percentileVal);
  const pLabel = percentileLabel(percentileVal);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-warm-100 dark:border-warm-800 bg-warm-50 dark:bg-warm-900/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-warm-400" />
          <span className="text-xs font-medium text-warm-600 dark:text-warm-400">{label}</span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ color, backgroundColor: color + "18" }}
        >
          {pLabel}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mt-1">
        <div>
          <p className="text-lg font-bold text-warm-900 dark:text-warm-50">{yourValue}</p>
          <p className="text-[10px] text-warm-400">You</p>
        </div>
        <div>
          <p className="text-base font-semibold text-warm-500">{sizeAvg}</p>
          <p className="text-[10px] text-warm-400">Similar orgs</p>
        </div>
        <div>
          <p className="text-base font-semibold text-warm-400">{platformAvg}</p>
          <p className="text-[10px] text-warm-400">Platform avg</p>
        </div>
      </div>
    </div>
  );
}

export function OrgBenchmarks({
  winRate,
  avgDaysToSubmit,
  readinessScore,
  orgSize,
}: OrgBenchmarksProps) {
  const sizeBench = SIZE_BENCHMARKS[orgSize] ?? SIZE_BENCHMARKS.medium;

  const winPct = winRate > 0 ? percentile(winRate, sizeBench.winRate) : 0;
  const daysPct = avgDaysToSubmit > 0 ? percentile(avgDaysToSubmit, sizeBench.avgDays, true) : 0;
  const readyPct = readinessScore > 0 ? percentile(readinessScore, sizeBench.readiness) : 0;

  const overallPct =
    winRate > 0 || avgDaysToSubmit > 0 || readinessScore > 0
      ? Math.round(
          ((winRate > 0 ? winPct : 50) +
            (avgDaysToSubmit > 0 ? daysPct : 50) +
            (readinessScore > 0 ? readyPct : 50)) /
            3
        )
      : 0;

  const hasData = winRate > 0 || avgDaysToSubmit > 0 || readinessScore > 0;

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300 flex items-center gap-2">
          <Users className="h-4 w-4 text-warm-400" />
          Organization Benchmarks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-xs text-warm-400 text-center py-4">
            Submit and track grant outcomes to unlock benchmark comparisons.
          </p>
        ) : (
          <>
            {/* Overall percentile banner */}
            {overallPct > 0 && (
              <div
                className="rounded-lg border px-4 py-3 text-sm font-medium text-center"
                style={{
                  borderColor: percentileColor(overallPct) + "60",
                  backgroundColor: percentileColor(overallPct) + "10",
                  color: percentileColor(overallPct),
                }}
              >
                <Award className="h-4 w-4 inline mr-1.5 opacity-70" />
                Overall: You&apos;re in the {percentileLabel(overallPct)} of organizations your size
              </div>
            )}

            <div className="space-y-3">
              {winRate > 0 && (
                <MetricRow
                  icon={TrendingUp}
                  label="Win Rate"
                  yourValue={`${winRate}%`}
                  platformAvg={`${PLATFORM.winRate}%`}
                  sizeAvg={`${sizeBench.winRate}%`}
                  percentileVal={winPct}
                  higherIsBetter
                />
              )}

              {avgDaysToSubmit > 0 && (
                <MetricRow
                  icon={Clock}
                  label="Avg Days to Submit"
                  yourValue={`${avgDaysToSubmit}d`}
                  platformAvg={`${PLATFORM.avgDaysToSubmit}d`}
                  sizeAvg={`${sizeBench.avgDays}d`}
                  percentileVal={daysPct}
                />
              )}

              {readinessScore > 0 && (
                <MetricRow
                  icon={Star}
                  label="Readiness Score"
                  yourValue={`${readinessScore}`}
                  platformAvg={`${PLATFORM.readinessScore}`}
                  sizeAvg={`${sizeBench.readiness}`}
                  percentileVal={readyPct}
                  higherIsBetter
                />
              )}
            </div>

            <p className="text-[10px] text-warm-300 dark:text-warm-600 text-center pt-1">
              Benchmarks based on anonymized platform data. Similar orgs = {orgSize === "small" ? "1–10" : orgSize === "medium" ? "11–50" : "51+"} staff.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
