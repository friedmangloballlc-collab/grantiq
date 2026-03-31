"use client";

import { useState } from "react";
import { X, AlertCircle, Calendar, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineItem } from "./kanban-board";

// Generate quarterly report dates starting from awardStart
function generateReportingCalendar(awardStart: Date): {
  label: string;
  dueDate: Date;
  type: "quarterly" | "annual" | "closeout";
}[] {
  const events = [];
  // Four quarterly financial reports (Q1–Q4)
  for (let q = 1; q <= 4; q++) {
    const due = new Date(awardStart);
    due.setMonth(due.getMonth() + q * 3);
    events.push({ label: `Q${q} Financial Report`, dueDate: due, type: "quarterly" as const });
  }
  // Annual narrative (12 months out)
  const annual = new Date(awardStart);
  annual.setMonth(annual.getMonth() + 12);
  events.push({ label: "Annual Narrative Report", dueDate: annual, type: "annual" as const });
  // Closeout (18 months out — typical grant period)
  const closeout = new Date(awardStart);
  closeout.setMonth(closeout.getMonth() + 18);
  events.push({ label: "Final Closeout Report", dueDate: closeout, type: "closeout" as const });

  return events;
}

function daysUntil(date: Date): number {
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const INITIAL_CHECKLIST = [
  "Award documents signed",
  "Grant file created (physical + digital)",
  "Budget tracking codes set up in accounting",
  "Reporting calendar created",
  "Program staff notified",
  "Data collection systems established",
  "Kickoff meeting scheduled",
  "Funder thanked appropriately",
];

interface CompliancePanelProps {
  item: PipelineItem;
  onClose: () => void;
}

export function CompliancePanel({ item, onClose }: CompliancePanelProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Use item deadline as proxy for award start, falling back to today
  const awardStart = item.deadline ? new Date(item.deadline) : new Date();
  const calendar = generateReportingCalendar(awardStart);

  const toggleCheck = (task: string) =>
    setChecked((prev) => ({ ...prev, [task]: !prev[task] }));

  const completedCount = Object.values(checked).filter(Boolean).length;

  // Find upcoming reports within 30 days
  const upcoming = calendar.filter((e) => {
    const d = daysUntil(e.dueDate);
    return d >= 0 && d <= 30;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-warm-900 rounded-xl shadow-2xl border border-warm-200 dark:border-warm-700 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-warm-200 dark:border-warm-700 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                Awarded
              </span>
            </div>
            <h2 className="text-base font-bold text-warm-900 dark:text-warm-50 mt-1 leading-tight">
              {item.grantName}
            </h2>
            <p className="text-xs text-warm-500 mt-0.5">{item.funderName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800 text-warm-400 hover:text-warm-700 dark:hover:text-warm-300 transition-colors ml-2 shrink-0"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {/* Award Details */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2">Award Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-warm-50 dark:bg-warm-800 rounded-lg p-3">
                <p className="text-xs text-warm-500">Amount</p>
                <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
                  {item.amount != null ? `$${item.amount.toLocaleString()}` : "TBD"}
                </p>
              </div>
              <div className="bg-warm-50 dark:bg-warm-800 rounded-lg p-3">
                <p className="text-xs text-warm-500">Funder</p>
                <p className="text-sm font-semibold text-warm-900 dark:text-warm-50 truncate">{item.funderName}</p>
              </div>
              <div className="bg-warm-50 dark:bg-warm-800 rounded-lg p-3 col-span-2">
                <p className="text-xs text-warm-500">Grant Period Start</p>
                <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">{formatDate(awardStart)}</p>
              </div>
            </div>
          </section>

          {/* Compliance Alerts */}
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                Compliance Alerts
              </h3>
              <div className="space-y-2">
                {upcoming.map((e) => {
                  const d = daysUntil(e.dueDate);
                  return (
                    <div
                      key={e.label}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm",
                        d <= 7
                          ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                          : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                      )}
                    >
                      <span>{e.label}</span>
                      <span className="font-semibold shrink-0 ml-2">
                        due in {d} day{d !== 1 ? "s" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Reporting Calendar */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Reporting Calendar
            </h3>
            <div className="space-y-1.5">
              {calendar.map((e) => {
                const d = daysUntil(e.dueDate);
                const isPast = d < 0;
                return (
                  <div
                    key={e.label}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs border",
                      isPast
                        ? "bg-warm-50 dark:bg-warm-800 border-warm-200 dark:border-warm-700 text-warm-400 line-through"
                        : "bg-white dark:bg-warm-800/60 border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-300",
                      e.type === "closeout" && !isPast && "border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400"
                    )}
                  >
                    <span className="font-medium">{e.label}</span>
                    <span className="text-warm-400 dark:text-warm-500">{formatDate(e.dueDate)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Compliance Checklist */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              Compliance Checklist
              <span className="ml-auto text-xs font-normal text-warm-400 normal-case">
                {completedCount}/{INITIAL_CHECKLIST.length} complete
              </span>
            </h3>
            <div className="space-y-1.5">
              {INITIAL_CHECKLIST.map((task) => {
                const done = checked[task] ?? false;
                return (
                  <button
                    key={task}
                    onClick={() => toggleCheck(task)}
                    className="flex items-start gap-2.5 w-full text-left px-3 py-2 rounded-lg hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors group"
                  >
                    {done ? (
                      <CheckSquare className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-warm-400 group-hover:text-warm-600 shrink-0 mt-0.5" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        done
                          ? "line-through text-warm-400"
                          : "text-warm-700 dark:text-warm-300"
                      )}
                    >
                      {task}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer progress bar */}
        <div className="p-4 border-t border-warm-200 dark:border-warm-700 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-warm-500 mb-1.5">
            <span>Onboarding progress</span>
            <span>{Math.round((completedCount / INITIAL_CHECKLIST.length) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-warm-200 dark:bg-warm-700 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / INITIAL_CHECKLIST.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
