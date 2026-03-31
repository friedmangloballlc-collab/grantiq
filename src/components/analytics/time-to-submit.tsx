"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Clock, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimeToSubmitByType {
  type: string;
  avgDays: number;
  count: number;
}

export interface TimeToSubmitTrend {
  month: string;
  avgDays: number;
}

export interface TimeToSubmitProps {
  avgDays: number;
  byType: TimeToSubmitByType[];
  trend: TimeToSubmitTrend[];
}

const BENCHMARK_DAYS = 21; // top performers
const PLATFORM_AVG_DAYS = 42;
const TEAL = "var(--color-brand-teal, #0d9488)";
const AMBER = "#f59e0b";

function trendIcon(trend: TimeToSubmitTrend[]) {
  if (trend.length < 2) return <Minus className="h-3.5 w-3.5 text-warm-400" />;
  const first = trend[0].avgDays;
  const last = trend[trend.length - 1].avgDays;
  const delta = last - first;
  if (delta < -3) return <TrendingDown className="h-3.5 w-3.5 text-green-500" />;
  if (delta > 3) return <TrendingUp className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-warm-400" />;
}

function trendText(trend: TimeToSubmitTrend[]): string {
  if (trend.length < 2) return "Not enough data for trend";
  const first = trend[0].avgDays;
  const last = trend[trend.length - 1].avgDays;
  const delta = last - first;
  if (delta < -3) return `Getting faster — down ${Math.abs(delta)} days vs. ${trend[0].month}`;
  if (delta > 3) return `Getting slower — up ${delta} days vs. ${trend[0].month}`;
  return "Submission time is stable";
}

export function TimeToSubmit({ avgDays, byType, trend }: TimeToSubmitProps) {
  const isTopPerformer = avgDays > 0 && avgDays <= BENCHMARK_DAYS;
  const isBelowAvg = avgDays > PLATFORM_AVG_DAYS;

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300 flex items-center gap-2">
          <Clock className="h-4 w-4 text-warm-400" />
          Time to Submit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Benchmark callout */}
        {avgDays > 0 ? (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: isTopPerformer ? "#86efac" : isBelowAvg ? "#fca5a5" : "#fcd34d",
              backgroundColor: isTopPerformer ? "#f0fdf4" : isBelowAvg ? "#fef2f2" : "#fffbeb",
              color: isTopPerformer ? "#15803d" : isBelowAvg ? "#b91c1c" : "#92400e",
            }}
          >
            <span className="font-semibold">Your average: {avgDays} days.</span>{" "}
            {isTopPerformer
              ? `You're among top performers (≤${BENCHMARK_DAYS} days).`
              : `Top performers: ${BENCHMARK_DAYS} days | Platform avg: ${PLATFORM_AVG_DAYS} days.`}
          </div>
        ) : (
          <p className="text-xs text-warm-400 text-center py-2">
            No submission data yet. Add grant submissions to your pipeline to track this metric.
          </p>
        )}

        {/* Trend over time */}
        {trend.length > 1 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              {trendIcon(trend)}
              <span className="text-xs text-warm-500">{trendText(trend)}</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trend} margin={{ left: 0, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  label={{ value: "days", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }}
                />
                <Tooltip
                  formatter={((v: number) => [`${v} days`, "Avg Time to Submit"]) as never}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <ReferenceLine
                  y={BENCHMARK_DAYS}
                  stroke="#22c55e"
                  strokeDasharray="4 2"
                  label={{ value: "Top", fontSize: 9, fill: "#22c55e" }}
                />
                <ReferenceLine
                  y={PLATFORM_AVG_DAYS}
                  stroke="#9ca3af"
                  strokeDasharray="4 2"
                  label={{ value: "Avg", fontSize: 9, fill: "#9ca3af" }}
                />
                <Bar dataKey="avgDays" fill={TEAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By grant type */}
        {byType.length > 0 && (
          <div>
            <p className="text-xs font-medium text-warm-500 mb-2">By Grant Type</p>
            <div className="space-y-2">
              {byType.map((row) => (
                <div key={row.type} className="flex items-center gap-3">
                  <span className="text-xs text-warm-600 dark:text-warm-400 w-28 shrink-0 truncate">
                    {row.type}
                  </span>
                  <div className="flex-1 h-5 bg-warm-100 dark:bg-warm-800 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{
                        width: `${Math.min((row.avgDays / 90) * 100, 100)}%`,
                        backgroundColor: row.avgDays <= BENCHMARK_DAYS ? "#22c55e" : row.avgDays <= PLATFORM_AVG_DAYS ? TEAL : AMBER,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-warm-700 dark:text-warm-300 w-16 text-right shrink-0">
                    {row.avgDays}d ({row.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
