import { Check, AlertTriangle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const CRITERIA_LABELS: Record<string, string> = {
  mission_alignment: "Mission Alignment",
  capacity_fit: "Capacity Fit",
  geographic_match: "Geographic Match",
  budget_fit: "Budget Fit",
  competition_level: "Competition Level",
  funder_history_fit: "Funder History",
};

export function WhyMatches({
  scoreBreakdown,
  missingRequirements,
}: {
  scoreBreakdown: Record<string, number>;
  missingRequirements: string[];
}) {
  return (
    <div className="mt-3 space-y-2 text-sm border-t border-warm-200 dark:border-warm-800 pt-3">
      {Object.entries(scoreBreakdown).map(([key, score]) => {
        const status = score >= 75 ? "green" : score >= 50 ? "yellow" : "gray";
        const Icon =
          status === "green" ? Check : status === "yellow" ? AlertTriangle : Minus;
        const color =
          status === "green"
            ? "text-green-600"
            : status === "yellow"
              ? "text-amber-500"
              : "text-warm-400";
        return (
          <div key={key} className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4 shrink-0", color)} />
            <span className="text-warm-600 dark:text-warm-400">
              {CRITERIA_LABELS[key] || key}: {score}%
            </span>
          </div>
        );
      })}
      {missingRequirements.length > 0 && (
        <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs">
          Missing: {missingRequirements.join(", ")}
        </div>
      )}
    </div>
  );
}
