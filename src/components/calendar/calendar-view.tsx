"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkBackTimeline } from "./work-back-timeline";
import { CalendarDays, List, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeadlineEntry {
  id: string;
  grantName: string;
  funderName: string;
  deadline: string; // ISO date
  stage?: string | null;
  isPipeline: boolean;
}

interface CalendarViewProps {
  deadlines: DeadlineEntry[];
  /** When false (Free tier), work-back timeline expand buttons are hidden */
  showWorkBack?: boolean;
}

function daysUntil(deadline: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyClasses(days: number): string {
  if (days < 0) return "text-warm-400 line-through";
  if (days < 7) return "text-red-600 dark:text-red-400 font-bold";
  if (days < 14) return "text-amber-600 dark:text-amber-400 font-semibold";
  return "text-green-600 dark:text-green-400";
}

function urgencyBadge(days: number): string {
  if (days < 0) return "bg-warm-100 text-warm-500 dark:bg-warm-800 dark:text-warm-400";
  if (days < 7) return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  if (days < 14) return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300";
}

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupByMonth(deadlines: DeadlineEntry[]): Map<string, DeadlineEntry[]> {
  const grouped = new Map<string, DeadlineEntry[]>();
  for (const d of deadlines) {
    const key = new Date(d.deadline).toLocaleString("default", { month: "long", year: "numeric" });
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }
  return grouped;
}

// --- List View ---
function ListView({ deadlines, showWorkBack = true }: { deadlines: DeadlineEntry[]; showWorkBack?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (deadlines.length === 0) {
    return (
      <div className="text-center py-12 text-warm-400">
        <p className="text-sm">No upcoming deadlines found.</p>
        <p className="text-xs mt-1">Add grants to your pipeline or browse matches to get started.</p>
      </div>
    );
  }

  const grouped = groupByMonth(deadlines);

  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([month, entries]) => (
        <div key={month}>
          <h3 className="text-sm font-semibold text-warm-500 uppercase tracking-widest mb-3">{month}</h3>
          <div className="space-y-3">
            {entries.map((entry) => {
              const days = daysUntil(entry.deadline);
              const isExpanded = expanded === entry.id;
              const writebackDays = Math.max(days - 21, 0);

              return (
                <Card
                  key={entry.id}
                  className={cn(
                    "border transition-shadow hover:shadow-sm",
                    days < 7 && days >= 0
                      ? "border-red-200 dark:border-red-800"
                      : days < 14 && days >= 0
                      ? "border-amber-200 dark:border-amber-800"
                      : "border-warm-200 dark:border-warm-800"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Date block */}
                      <div className="text-center shrink-0 w-12">
                        <p className="text-lg font-bold text-warm-900 dark:text-warm-50 leading-none">
                          {new Date(entry.deadline).getDate()}
                        </p>
                        <p className="text-[10px] text-warm-400 uppercase">
                          {new Date(entry.deadline).toLocaleString("default", { month: "short" })}
                        </p>
                      </div>

                      {/* Grant info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-warm-900 dark:text-warm-50 truncate">
                          {entry.grantName}
                        </p>
                        <p className="text-xs text-warm-500 mt-0.5 truncate">{entry.funderName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", urgencyBadge(days))}>
                            {days < 0 ? "Passed" : days === 0 ? "Today" : `${days}d left`}
                          </span>
                          {entry.stage && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300">
                              {formatStage(entry.stage)}
                            </span>
                          )}
                          {entry.isPipeline && days >= 14 && (
                            <span className="text-xs text-warm-400">
                              Start writing in {writebackDays}d
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expand toggle (pipeline items + Starter+ only) */}
                      {entry.isPipeline && showWorkBack && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : entry.id)}
                          className="shrink-0 text-warm-400 hover:text-warm-600 transition-colors"
                          aria-label="Toggle work-back timeline"
                        >
                          <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                        </button>
                      )}
                    </div>

                    {/* Work-back timeline (expanded, Starter+ only) */}
                    {isExpanded && entry.isPipeline && showWorkBack && (
                      <div className="mt-4 pt-4 border-t border-warm-100 dark:border-warm-800">
                        <WorkBackTimeline deadline={entry.deadline} grantName={entry.grantName} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Grid Calendar View ---
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function GridCalendarView({ deadlines }: { deadlines: DeadlineEntry[] }) {
  const now = new Date();

  // Build a set of deadline date strings for fast lookup
  const deadlineMap = new Map<string, DeadlineEntry[]>();
  for (const d of deadlines) {
    const key = d.deadline.slice(0, 10); // YYYY-MM-DD
    if (!deadlineMap.has(key)) deadlineMap.set(key, []);
    deadlineMap.get(key)!.push(d);
  }

  // Show 12 months starting from current month
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {months.map(({ year, month }) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

        return (
          <Card
            key={`${year}-${month}`}
            className={cn(
              "border",
              isCurrentMonth
                ? "border-teal-300 dark:border-teal-700"
                : "border-warm-200 dark:border-warm-800"
            )}
          >
            <CardContent className="p-3">
              <p className={cn("text-xs font-bold mb-2 text-center uppercase tracking-wide",
                isCurrentMonth ? "text-teal-600 dark:text-teal-400" : "text-warm-500"
              )}>
                {MONTH_NAMES[month]} {year}
              </p>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-warm-400 font-medium py-0.5">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {/* Empty cells for first day offset */}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const entries = deadlineMap.get(dateStr) ?? [];
                  const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
                  const hasPipelineDeadline = entries.some((e) => e.isPipeline);
                  const hasMatchDeadline = entries.some((e) => !e.isPipeline);

                  return (
                    <div
                      key={day}
                      className={cn(
                        "relative flex flex-col items-center py-0.5",
                        isToday && "font-bold"
                      )}
                      title={entries.map((e) => e.grantName).join(", ")}
                    >
                      <span className={cn(
                        "text-[11px] w-5 h-5 flex items-center justify-center rounded-full",
                        isToday && "bg-teal-500 text-white",
                        !isToday && entries.length > 0 && "font-semibold text-warm-900 dark:text-warm-50",
                        !isToday && entries.length === 0 && "text-warm-400"
                      )}>
                        {day}
                      </span>
                      {/* Deadline dots */}
                      {entries.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {hasPipelineDeadline && (
                            <span className="w-1 h-1 rounded-full bg-red-500" />
                          )}
                          {hasMatchDeadline && (
                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend only on first card */}
            </CardContent>
          </Card>
        );
      })}

      {/* Legend */}
      <div className="md:col-span-2 lg:col-span-3 flex items-center gap-4 text-xs text-warm-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Pipeline deadline
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Match deadline
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-teal-500 inline-flex items-center justify-center text-white text-[9px]">1</span>
          Today
        </div>
      </div>
    </div>
  );
}

// --- Main CalendarView ---
export function CalendarView({ deadlines, showWorkBack = true }: CalendarViewProps) {
  const [view, setView] = useState<"list" | "grid">("list");

  const sorted = [...deadlines].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          onClick={() => setView("list")}
          className={cn(view === "list" && "bg-[var(--color-brand-teal)] text-white hover:bg-[var(--color-brand-teal)]")}
        >
          <List className="h-4 w-4 mr-1.5" />
          List
        </Button>
        <Button
          size="sm"
          variant={view === "grid" ? "default" : "outline"}
          onClick={() => setView("grid")}
          className={cn(view === "grid" && "bg-[var(--color-brand-teal)] text-white hover:bg-[var(--color-brand-teal)]")}
        >
          <CalendarDays className="h-4 w-4 mr-1.5" />
          Calendar
        </Button>
        <span className="ml-auto text-xs text-warm-400">{deadlines.length} deadlines</span>
      </div>

      {view === "list" ? <ListView deadlines={sorted} showWorkBack={showWorkBack} /> : <GridCalendarView deadlines={sorted} />}
    </div>
  );
}
