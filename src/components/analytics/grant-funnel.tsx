"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown } from "lucide-react";

export interface FunnelStage {
  label: string;
  count: number;
}

export interface GrantFunnelProps {
  matched: number;
  evaluated: number;
  pipeline: number;
  submitted: number;
  awarded: number;
}

const BENCHMARK_CONVERSIONS: Record<string, number> = {
  "Matched → Evaluated": 60,
  "Evaluated → Pipeline": 50,
  "Pipeline → Submitted": 70,
  "Submitted → Awarded": 22,
};

function conversionRate(from: number, to: number): number {
  if (from === 0) return 0;
  return Math.round((to / from) * 100);
}

function rateColor(rate: number, benchmark: number): string {
  if (rate >= benchmark * 1.1) return "#22c55e";
  if (rate >= benchmark * 0.8) return "#f59e0b";
  return "#ef4444";
}

function rateLabel(rate: number, benchmark: number): string {
  if (rate >= benchmark * 1.1) return "Above benchmark";
  if (rate >= benchmark * 0.8) return "Near benchmark";
  return "Below benchmark";
}

interface StageBarProps {
  label: string;
  count: number;
  maxCount: number;
  isFirst: boolean;
}

function StageBar({ label, count, maxCount, isFirst }: StageBarProps) {
  const widthPct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div className="space-y-1">
      {!isFirst && (
        <div className="flex justify-center text-warm-300">
          <ArrowDown className="h-4 w-4" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="w-28 text-right text-xs text-warm-500 shrink-0">{label}</div>
        <div className="flex-1 h-8 bg-warm-100 dark:bg-warm-800 rounded-md overflow-hidden">
          <div
            className="h-full rounded-md transition-all duration-500"
            style={{
              width: `${widthPct}%`,
              backgroundColor: "var(--color-brand-teal, #0d9488)",
              opacity: 0.85,
            }}
          />
        </div>
        <div className="w-10 text-sm font-semibold text-warm-800 dark:text-warm-200 shrink-0">
          {count}
        </div>
      </div>
    </div>
  );
}

interface ConversionBadgeProps {
  label: string;
  rate: number;
}

function ConversionBadge({ label, rate }: ConversionBadgeProps) {
  const benchmark = BENCHMARK_CONVERSIONS[label] ?? 30;
  const color = rateColor(rate, benchmark);
  const text = rateLabel(rate, benchmark);
  return (
    <div className="flex items-center justify-between text-xs px-4">
      <span className="text-warm-400">{label}</span>
      <span
        className="font-semibold px-2 py-0.5 rounded-full"
        style={{
          color,
          backgroundColor: color + "20",
        }}
        title={`${text} (benchmark: ${benchmark}%)`}
      >
        {rate}% conversion
      </span>
    </div>
  );
}

export function GrantFunnel({
  matched,
  evaluated,
  pipeline,
  submitted,
  awarded,
}: GrantFunnelProps) {
  const stages = [
    { label: "Matched", count: matched },
    { label: "Evaluated", count: evaluated },
    { label: "Pipeline", count: pipeline },
    { label: "Submitted", count: submitted },
    { label: "Awarded", count: awarded },
  ];

  const maxCount = matched;

  const conversions = [
    { label: "Matched → Evaluated", rate: conversionRate(matched, evaluated) },
    { label: "Evaluated → Pipeline", rate: conversionRate(evaluated, pipeline) },
    { label: "Pipeline → Submitted", rate: conversionRate(pipeline, submitted) },
    { label: "Submitted → Awarded", rate: conversionRate(submitted, awarded) },
  ];

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-warm-700 dark:text-warm-300">
          Grant Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-0.5">
          {stages.map((stage, i) => (
            <StageBar
              key={stage.label}
              label={stage.label}
              count={stage.count}
              maxCount={maxCount}
              isFirst={i === 0}
            />
          ))}
        </div>

        <div className="border-t border-warm-100 dark:border-warm-800 pt-3 space-y-1.5">
          <p className="text-xs font-medium text-warm-500 px-4 mb-2">Conversion Rates</p>
          {conversions.map((c) => (
            <ConversionBadge key={c.label} label={c.label} rate={c.rate} />
          ))}
        </div>

        {submitted === 0 && (
          <p className="text-xs text-warm-400 text-center py-2">
            Submit grants to your pipeline to see funnel conversion data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
