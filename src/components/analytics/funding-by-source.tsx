"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface FundingSource {
  source: "Federal" | "State" | "Foundation" | "Corporate" | string;
  amount: number;
  count: number;
}

export interface FundingBySourceProps {
  sources: FundingSource[];
  totalAwarded: number;
}

const SOURCE_COLORS: Record<string, string> = {
  Federal: "#3b82f6",
  State: "#8b5cf6",
  Foundation: "#0d9488",
  Corporate: "#f59e0b",
  Other: "#9ca3af",
};

function getColor(source: string, index: number): string {
  return (
    SOURCE_COLORS[source] ??
    ["#06b6d4", "#ec4899", "#84cc16", "#f97316"][index % 4]
  );
}

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function diversificationAlert(sources: FundingSource[], total: number): string | null {
  if (total === 0 || sources.length === 0) return null;

  const sorted = [...sources].sort((a, b) => b.amount - a.amount);
  const top = sorted[0];
  const topPct = Math.round((top.amount / total) * 100);

  if (topPct >= 70) {
    return `${topPct}% of your funding is from ${top.source}. Consider diversifying — concentration risk is high.`;
  }
  if (topPct >= 50 && top.source === "Foundation") {
    return `${topPct}% of funding from foundations. Consider adding federal or state grants to reduce concentration.`;
  }
  return null;
}

export function FundingBySource({ sources, totalAwarded }: FundingBySourceProps) {
  const alert = diversificationAlert(sources, totalAwarded);

  const pieData = sources
    .filter((s) => s.amount > 0)
    .map((s) => ({
      name: s.source,
      value: s.amount,
      count: s.count,
    }));

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-warm-400" />
          Funding by Source
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalAwarded === 0 ? (
          <p className="text-xs text-warm-400 text-center py-4">
            No awarded funding recorded yet. Log outcomes in your pipeline to see this breakdown.
          </p>
        ) : (
          <>
            {/* Pie chart */}
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={48}
                  paddingAngle={2}
                  label={(({ name, percent }: { name: string; percent?: number }) =>
                    `${name} ${Math.round((percent ?? 0) * 100)}%`
                  ) as never}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={getColor(entry.name, i)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={((value: number) => [formatDollars(value), "Awarded"]) as never}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Source breakdown table */}
            <div className="space-y-2">
              {sources
                .filter((s) => s.amount > 0)
                .sort((a, b) => b.amount - a.amount)
                .map((s, i) => {
                  const pct =
                    totalAwarded > 0
                      ? Math.round((s.amount / totalAwarded) * 100)
                      : 0;
                  return (
                    <div key={s.source} className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getColor(s.source, i) }}
                      />
                      <span className="text-xs text-warm-600 dark:text-warm-400 flex-1">
                        {s.source}
                      </span>
                      <span className="text-xs font-medium text-warm-800 dark:text-warm-200">
                        {formatDollars(s.amount)}
                      </span>
                      <span className="text-xs text-warm-400 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
            </div>

            {/* Diversification alert */}
            {alert && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  {alert}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
