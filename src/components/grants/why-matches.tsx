"use client";

import { Check, AlertTriangle, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchCriterion } from "@/lib/matching/match-criteria";

const STATUS_CONFIG = {
  match: { Icon: Check, color: "text-green-600 dark:text-green-400", bg: "" },
  partial: { Icon: AlertTriangle, color: "text-amber-500 dark:text-amber-400", bg: "" },
  gap: { Icon: Minus, color: "text-red-500 dark:text-red-400", bg: "" },
  info: { Icon: Info, color: "text-warm-400 dark:text-warm-500", bg: "" },
};

export function WhyMatches({
  criteria,
  missingRequirements,
}: {
  criteria: MatchCriterion[];
  missingRequirements: string[];
}) {
  if (criteria.length === 0 && missingRequirements.length === 0) {
    return (
      <div className="mt-3 text-xs text-warm-400 border-t border-warm-200 dark:border-warm-800 pt-3">
        Match based on profile similarity. Run a detailed match for specific criteria.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1.5 text-sm border-t border-warm-200 dark:border-warm-800 pt-3">
      {criteria.map((c, i) => {
        const { Icon, color } = STATUS_CONFIG[c.status];
        return (
          <div key={i} className="flex items-start gap-2">
            <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", color)} />
            <span className="text-xs text-warm-600 dark:text-warm-400">{c.label}</span>
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
