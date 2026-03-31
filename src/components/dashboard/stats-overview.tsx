"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText, DollarSign, TrendingUp } from "lucide-react";

interface StatsProps {
  totalMatches: number;
  activePipeline: number;
  totalPipelineValue: number;
  winRate: number;
}

/** Animate a number from 0 to `target` over `duration` ms using rAF. Only runs once on mount. */
function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    if (target === 0) return;
    hasAnimated.current = true;

    let startTime: number | null = null;
    let raf: number;

    function step(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}

function StatCard({
  label,
  value,
  icon: Icon,
  format,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  format: (v: number) => string;
}) {
  const animated = useCountUp(value);
  return (
    <Card
      className="border-warm-200 dark:border-warm-800 hover:shadow-md transition-shadow duration-200"
      aria-label={`${label}: ${format(value)}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-warm-400" aria-hidden="true" />
          <span className="text-xs text-warm-500">{label}</span>
        </div>
        <p className="text-2xl font-bold mt-1 text-warm-900 dark:text-warm-50">
          {format(animated)}
        </p>
      </CardContent>
    </Card>
  );
}

export function StatsOverview({ totalMatches, activePipeline, totalPipelineValue, winRate }: StatsProps) {
  const stats = [
    { label: "Grant Matches", value: totalMatches, icon: Search, format: (v: number) => v.toLocaleString() },
    { label: "In Pipeline", value: activePipeline, icon: FileText, format: (v: number) => v.toString() },
    { label: "Pipeline Value", value: totalPipelineValue, icon: DollarSign, format: (v: number) => `$${(v / 1000).toFixed(0)}K` },
    { label: "Win Rate", value: winRate, icon: TrendingUp, format: (v: number) => `${v}%` },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
