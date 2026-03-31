"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, Trophy, XCircle, DollarSign, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WinLossAnalysis } from "@/lib/analytics/win-loss";

// Benchmark: organizations like yours average 22% win rate
const BENCHMARK_WIN_RATE = 22;

const TEAL = "var(--color-brand-teal, #0d9488)";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const GREEN = "#22c55e";

interface AnalyticsDashboardProps {
  analysis: WinLossAnalysis | null;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-900/50 py-16 px-8 text-center">
      <TrendingUp className="h-10 w-10 text-warm-300" />
      <div>
        <h3 className="text-base font-semibold text-warm-700 dark:text-warm-300">
          No outcomes logged yet
        </h3>
        <p className="mt-1 text-sm text-warm-500 max-w-sm">
          When grants move to Awarded or Declined in your pipeline, log the
          outcome to start tracking your win/loss analysis.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs text-warm-500">{label}</span>
        </div>
        <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          {value}
        </p>
        {sub && <p className="text-xs text-warm-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard({ analysis }: AnalyticsDashboardProps) {
  if (!analysis || analysis.totalSubmitted === 0) {
    return <EmptyState />;
  }

  const winRateColor =
    analysis.winRate >= BENCHMARK_WIN_RATE ? GREEN : AMBER;

  const formattedAvgAward =
    analysis.avgAwardAmount > 0
      ? `$${(analysis.avgAwardAmount / 1000).toFixed(0)}K`
      : "—";

  const formattedTotal =
    analysis.totalAwarded > 0
      ? `$${(analysis.totalAwarded / 1000).toFixed(0)}K`
      : "—";

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Win Rate"
          value={`${analysis.winRate}%`}
          icon={TrendingUp}
          sub={`Benchmark: ${BENCHMARK_WIN_RATE}%`}
          color={winRateColor}
        />
        <StatCard
          label="Total Won"
          value={String(analysis.totalWon)}
          icon={Trophy}
          sub={`of ${analysis.totalSubmitted} submitted`}
          color={GREEN}
        />
        <StatCard
          label="Total Declined"
          value={String(analysis.totalLost)}
          icon={XCircle}
          color={RED}
        />
        <StatCard
          label="Total Awarded"
          value={formattedTotal}
          icon={DollarSign}
          sub={`Avg: ${formattedAvgAward}`}
          color={TEAL}
        />
      </div>

      {/* Benchmark callout */}
      <div
        className="rounded-lg border px-4 py-3 text-sm font-medium"
        style={{
          borderColor:
            analysis.winRate >= BENCHMARK_WIN_RATE
              ? "#86efac"
              : "#fcd34d",
          backgroundColor:
            analysis.winRate >= BENCHMARK_WIN_RATE
              ? "#f0fdf4"
              : "#fffbeb",
          color:
            analysis.winRate >= BENCHMARK_WIN_RATE
              ? "#15803d"
              : "#92400e",
        }}
      >
        {analysis.winRate >= BENCHMARK_WIN_RATE
          ? `Your win rate of ${analysis.winRate}% exceeds the ${BENCHMARK_WIN_RATE}% benchmark for organizations like yours.`
          : `Your win rate is ${analysis.winRate}%. Organizations like yours average ${BENCHMARK_WIN_RATE}%. See suggestions below.`}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win Rate Over Time */}
        {analysis.monthlyWinRates.length > 1 && (
          <Card className="border-warm-200 dark:border-warm-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300">
                Win Rate Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analysis.monthlyWinRates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                  />
                  <YAxis
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="winRate"
                    stroke={TEAL}
                    strokeWidth={2}
                    dot={{ fill: TEAL, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Win Rate by Grant Type */}
        {analysis.winRateByType.length > 0 && (
          <Card className="border-warm-200 dark:border-warm-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300">
                Win Rate by Grant Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={analysis.winRateByType}
                  layout="vertical"
                  margin={{ left: 8, right: 24 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    type="number"
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="type"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {analysis.winRateByType.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.rate >= BENCHMARK_WIN_RATE ? TEAL : AMBER}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Rejection Reasons */}
      {analysis.topRejectionReasons.length > 0 && (
        <Card className="border-warm-200 dark:border-warm-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              Top Rejection Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={analysis.topRejectionReasons}
                layout="vertical"
                margin={{ left: 8, right: 32 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e5e7eb"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="reason"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  width={140}
                />
                <Tooltip
                  
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar dataKey="count" fill={RED} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Win Rate by Score Bucket */}
      {analysis.winRateByScoreBucket.some((b) => b.total > 0) && (
        <Card className="border-warm-200 dark:border-warm-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              Win Rate by Match Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analysis.winRateByScoreBucket}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {analysis.winRateByScoreBucket.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.total === 0
                          ? "#e5e7eb"
                          : entry.rate >= 50
                          ? TEAL
                          : AMBER
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Improvement Suggestions */}
      {analysis.improvementSuggestions.length > 0 && (
        <Card className="border-warm-200 dark:border-warm-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Improvement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.improvementSuggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-xs font-bold text-amber-600 dark:text-amber-400">
                    {i + 1}
                  </span>
                  <p className="text-sm text-warm-700 dark:text-warm-300 leading-relaxed">
                    {suggestion}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
