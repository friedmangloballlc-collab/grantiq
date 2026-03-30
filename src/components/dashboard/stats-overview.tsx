import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText, DollarSign, TrendingUp } from "lucide-react";

interface StatsProps {
  totalMatches: number;
  activePipeline: number;
  totalPipelineValue: number;
  winRate: number;
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
        <Card key={stat.label} className="border-warm-200 dark:border-warm-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4 text-warm-400" />
              <span className="text-xs text-warm-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-warm-900 dark:text-warm-50">{stat.format(stat.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
