"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle, Circle } from "lucide-react";

interface WorkBackTimelineProps {
  deadline: string; // ISO date string
  grantName: string;
}

const MILESTONES = [
  { daysOut: 21, label: "Go/No-Go Decision", key: "go_nogo" },
  { daysOut: 14, label: "First Draft Due", key: "first_draft" },
  { daysOut: 12, label: "Budget Complete", key: "budget" },
  { daysOut: 10, label: "Complete Draft Due", key: "complete_draft" },
  { daysOut: 7, label: "Executive Review", key: "exec_review" },
  { daysOut: 5, label: "Final Approval", key: "final_approval" },
  { daysOut: 3, label: "Submit (48–72 hrs early)", key: "submit" },
];

function getMilestoneStatus(milestoneDate: Date, now: Date) {
  const diffDays = Math.ceil((milestoneDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "due_soon";
  return "upcoming";
}

export function WorkBackTimeline({ deadline, grantName }: WorkBackTimelineProps) {
  const deadlineDate = new Date(deadline);
  const now = new Date();

  const milestones = MILESTONES.map(({ daysOut, label, key }) => {
    const milestoneDate = new Date(deadlineDate.getTime() - daysOut * 24 * 60 * 60 * 1000);
    const status = getMilestoneStatus(milestoneDate, now);
    const isPast = milestoneDate < now;
    return { daysOut, label, key, milestoneDate, status, isPast };
  });

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-warm-700 dark:text-warm-300 mb-2">
        Work-back: {grantName}
      </p>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-warm-200 dark:bg-warm-700" />

        <div className="space-y-2">
          {milestones.map(({ label, key, milestoneDate, status, isPast }) => {
            const Icon =
              isPast
                ? CheckCircle2
                : status === "overdue"
                ? AlertCircle
                : status === "due_soon"
                ? Clock
                : Circle;

            const iconColor =
              isPast
                ? "text-green-500"
                : status === "overdue"
                ? "text-red-500"
                : status === "due_soon"
                ? "text-amber-500"
                : "text-warm-300 dark:text-warm-600";

            const textColor =
              isPast
                ? "text-warm-400 dark:text-warm-600 line-through"
                : status === "overdue"
                ? "text-red-600 dark:text-red-400 font-medium"
                : status === "due_soon"
                ? "text-amber-600 dark:text-amber-400 font-medium"
                : "text-warm-600 dark:text-warm-400";

            return (
              <div key={key} className="flex items-center gap-3 relative z-10">
                <Icon className={cn("h-[18px] w-[18px] shrink-0 bg-background", iconColor)} />
                <div className="flex-1 flex items-center justify-between gap-2">
                  <span className={cn("text-xs", textColor)}>{label}</span>
                  <span className="text-[10px] text-warm-400 shrink-0">
                    {milestoneDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
