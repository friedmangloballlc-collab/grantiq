import { Check, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReadinessCategory {
  name: string;
  status: "ready" | "needs_attention" | "blocker";
  message: string;
  fixAction?: { label: string; href: string };
}

const STATUS_CONFIG = {
  ready: {
    icon: Check,
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    ring: "ring-green-200 dark:ring-green-800",
  },
  needs_attention: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    ring: "ring-amber-200 dark:ring-amber-800",
  },
  blocker: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    ring: "ring-red-200 dark:ring-red-800",
  },
};

export function ReadinessGauge({
  overallScore,
  categories,
}: {
  overallScore: number;
  categories: ReadinessCategory[];
}) {
  const readyCount = categories.filter((c) => c.status === "ready").length;
  const blockerCount = categories.filter((c) => c.status === "blocker").length;

  const scoreColor =
    overallScore >= 75
      ? "text-green-600 dark:text-green-400"
      : overallScore >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50">
          Readiness Assessment
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-warm-500">
            {readyCount}/{categories.length} ready
          </span>
          {blockerCount > 0 && (
            <span className="text-red-500 font-medium">
              {blockerCount} blocker{blockerCount > 1 ? "s" : ""}
            </span>
          )}
          <span className={cn("font-semibold", scoreColor)}>
            {overallScore}/100
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => {
          const config = STATUS_CONFIG[cat.status];
          const Icon = config.icon;
          return (
            <div
              key={cat.name}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg ring-1",
                config.ring,
                config.bg,
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", config.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
                  {cat.name}
                </p>
                <p className="text-xs text-warm-500">{cat.message}</p>
              </div>
              {cat.fixAction && cat.status !== "ready" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs"
                  render={<a href={cat.fixAction.href}>{cat.fixAction.label}</a>}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
