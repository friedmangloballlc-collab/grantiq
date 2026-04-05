import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  profileComplete: boolean;
  hasMatches: boolean;
  hasPipeline: boolean;
  hasVault: boolean;
  hasCalendar: boolean;
}

interface ChecklistItem {
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export function OnboardingChecklist({
  profileComplete,
  hasMatches,
  hasPipeline,
  hasVault,
  hasCalendar,
}: OnboardingChecklistProps) {
  const items: ChecklistItem[] = [
    {
      label: "Complete your profile",
      description: "Tell us about your organization so we can find the best-fit grants.",
      href: "/settings",
      done: profileComplete,
    },
    {
      label: "Run your first grant match",
      description: "Discover grants matched to your mission and eligibility.",
      href: "/matches",
      done: hasMatches,
    },
    {
      label: "Add a grant to your pipeline",
      description: "Track and manage grants you plan to apply for.",
      href: "/pipeline",
      done: hasPipeline,
    },
    {
      label: "Upload your first document",
      description: "Build your document vault to improve match accuracy.",
      href: "/vault",
      done: hasVault,
    },
    {
      label: "Check your calendar",
      description: "Stay on top of upcoming grant deadlines.",
      href: "/calendar",
      done: hasCalendar,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const progressPct = Math.round((completedCount / items.length) * 100);

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50">
          Get Started with GrantIQ
        </CardTitle>
        <p className="text-sm text-warm-500 mt-0.5">
          Complete these steps to unlock the full power of GrantIQ.
        </p>
      </CardHeader>

      <CardContent className="pt-4 pb-2">
        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-warm-600 dark:text-warm-400">
              {completedCount} of {items.length} complete
            </span>
            <span className="text-xs font-semibold text-warm-700 dark:text-warm-300">
              {progressPct}%
            </span>
          </div>
          <div className="h-2 bg-warm-100 dark:bg-warm-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressPct === 100
                  ? "bg-green-500"
                  : progressPct >= 60
                  ? "bg-brand-teal"
                  : "bg-amber-400"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Checklist items */}
        <ul className="space-y-1 pb-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-3 transition-colors",
                  item.done
                    ? "opacity-60 hover:opacity-80 hover:bg-warm-50 dark:hover:bg-warm-800/40"
                    : "hover:bg-warm-50 dark:hover:bg-warm-800/40"
                )}
              >
                {/* Icon */}
                <span className="mt-0.5 shrink-0">
                  {item.done ? (
                    <Check
                      className="h-5 w-5 text-green-500"
                      aria-label="Completed"
                    />
                  ) : (
                    <Circle
                      className="h-5 w-5 text-warm-300 dark:text-warm-600"
                      aria-label="Not completed"
                    />
                  )}
                </span>

                {/* Text */}
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium leading-snug",
                      item.done
                        ? "line-through text-warm-500 dark:text-warm-500"
                        : "text-warm-900 dark:text-warm-50"
                    )}
                  >
                    {item.label}
                  </span>
                  {!item.done && (
                    <span className="block text-xs text-warm-500 mt-0.5">
                      {item.description}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
