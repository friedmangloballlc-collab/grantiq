"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FEDERAL_MONTHS = [
  { month: "Oct", label: "Q1", note: "New FY, initial NOFOs drop" },
  { month: "Nov", label: "Q1", note: "Prepare for Jan NOFO wave" },
  { month: "Dec", label: "Q1", note: "Holiday — review pipeline" },
  { month: "Jan", label: "Q2", note: "Peak NOFO release season" },
  { month: "Feb", label: "Q2", note: "Peak NOFO release season" },
  { month: "Mar", label: "Q2", note: "Peak NOFO release season" },
  { month: "Apr", label: "Q3", note: "Peak deadline season" },
  { month: "May", label: "Q3", note: "Peak deadline season" },
  { month: "Jun", label: "Q3", note: "Peak deadline season" },
  { month: "Jul", label: "Q4", note: "Award announcements" },
  { month: "Aug", label: "Q4", note: "Q4 spending surge — USE IT OR LOSE IT" },
  { month: "Sep", label: "Q4", note: "Q4 spending surge — supplements & no-costs" },
];

const QUARTER_COLORS: Record<string, string> = {
  Q1: "bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  Q2: "bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  Q3: "bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  Q4: "bg-orange-100 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200",
};

export function FiscalCycle() {
  const now = new Date();
  const currentMonthName = now.toLocaleString("default", { month: "short" });

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50">
          Federal Fiscal Calendar
        </CardTitle>
        <p className="text-xs text-warm-500">FY Oct 1 – Sep 30 · Most states Jul 1 – Jun 30</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {FEDERAL_MONTHS.map(({ month, label, note }) => {
          const isCurrentMonth = month === currentMonthName;
          return (
            <div
              key={month}
              className={cn(
                "flex items-start gap-3 p-2 rounded-md border text-xs transition-colors",
                isCurrentMonth
                  ? "bg-teal-100 dark:bg-teal-950/50 border-teal-400 dark:border-teal-600"
                  : QUARTER_COLORS[label]
              )}
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("font-bold w-7", isCurrentMonth && "text-teal-700 dark:text-teal-300")}>
                  {month}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    isCurrentMonth
                      ? "bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200"
                      : "bg-black/10 dark:bg-white/10"
                  )}
                >
                  {label}
                </span>
              </div>
              <p className={cn("flex-1 leading-tight", isCurrentMonth && "font-medium text-teal-800 dark:text-teal-200")}>
                {note}
              </p>
              {isCurrentMonth && (
                <span className="shrink-0 text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                  Now
                </span>
              )}
            </div>
          );
        })}

        <div className="mt-4 pt-3 border-t border-warm-200 dark:border-warm-800 space-y-1">
          <p className="text-xs font-semibold text-warm-700 dark:text-warm-300">Foundation Cycles</p>
          <p className="text-xs text-warm-500">
            Most foundations hold quarterly board meetings (Mar, Jun, Sep, Dec). LOIs are typically due 6–8 weeks before.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
