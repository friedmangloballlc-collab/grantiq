"use client";

import { CheckCircle2, Circle, Loader2, User, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1,  name: "Intake & Assessment",    timeline: "Week 1",            description: "Understand org, programs, funding history, goals" },
  { number: 2,  name: "Readiness Audit",         timeline: "Week 1–2",          description: "Assess grant readiness, identify gaps, evaluate eligibility" },
  { number: 3,  name: "Strategy Development",    timeline: "Week 2–3",          description: "Develop 12–24 month grant strategy and funding roadmap" },
  { number: 4,  name: "Opportunity Sourcing",    timeline: "Week 3–4",          description: "Research and identify best-fit grant opportunities" },
  { number: 5,  name: "Opportunity Evaluation",  timeline: "Week 4",            description: "Score and prioritize opportunities, recommend targets" },
  { number: 6,  name: "Application Planning",    timeline: "Pre-application",   description: "Develop timeline, assign responsibilities, gather requirements" },
  { number: 7,  name: "Content Development",     timeline: "Application period", description: "Draft narrative sections, develop logic model, create docs" },
  { number: 8,  name: "Budget Development",      timeline: "Application period", description: "Develop grant budget and budget justification" },
  { number: 9,  name: "Internal Review",         timeline: "Pre-submission",    description: "Quality review, compliance check" },
  { number: 10, name: "Submission",              timeline: "Deadline",          description: "Final formatting, portal submission, confirmation tracking" },
  { number: 11, name: "Post-Submission",         timeline: "After submission",  description: "Track status, respond to funder questions" },
  { number: 12, name: "Post-Award Support",      timeline: "If awarded",        description: "Grant acceptance, compliance setup, reporting calendar" },
] as const;

type StepStatus = "completed" | "in_progress" | "upcoming";

export interface ServiceEngagement {
  id: string;
  package_name: string;
  service_type: string;
  status: "active" | "completed" | "paused" | "cancelled";
  current_step: number;
  step_statuses: Record<string, StepStatus>;
  assigned_advisor: string | null;
  started_at: string | null;
}

function getStepStatus(step: number, currentStep: number, stepStatuses: Record<string, StepStatus>): StepStatus {
  if (stepStatuses[String(step)]) return stepStatuses[String(step)];
  if (step < currentStep) return "completed";
  if (step === currentStep) return "in_progress";
  return "upcoming";
}

function formatServiceType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function ServiceTracker({ engagement }: { engagement: ServiceEngagement }) {
  const completedCount = STEPS.filter(
    (s) => getStepStatus(s.number, engagement.current_step, engagement.step_statuses) === "completed"
  ).length;

  const progressPct = Math.round((completedCount / 12) * 100);

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand-teal" />
              Service Delivery Tracker
            </CardTitle>
            <p className="text-sm text-warm-500 mt-0.5">{engagement.package_name} &middot; {formatServiceType(engagement.service_type)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-warm-500">{completedCount} of 12 steps complete</span>
            <div className="w-36 h-2 bg-warm-100 dark:bg-warm-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-teal rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {engagement.assigned_advisor && (
              <span className="text-xs text-warm-400 flex items-center gap-1 mt-1">
                <User className="h-3 w-3" />
                {engagement.assigned_advisor}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-warm-200 dark:bg-warm-700" aria-hidden="true" />

          <ol className="space-y-1">
            {STEPS.map((step) => {
              const status = getStepStatus(step.number, engagement.current_step, engagement.step_statuses);
              const isCompleted = status === "completed";
              const isInProgress = status === "in_progress";

              return (
                <li key={step.number} className="relative flex items-start gap-3 py-2">
                  {/* Step icon */}
                  <div className="relative z-10 shrink-0 flex items-center justify-center w-9">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : isInProgress ? (
                      <span className="relative flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-60" />
                        <Loader2 className="relative h-5 w-5 text-brand-teal animate-spin" />
                      </span>
                    ) : (
                      <Circle className="h-5 w-5 text-warm-300 dark:text-warm-600" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className={cn("flex-1 min-w-0 pb-1", isCompleted && "opacity-60")}>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isInProgress
                            ? "text-brand-teal"
                            : isCompleted
                            ? "text-warm-500 dark:text-warm-400"
                            : "text-warm-400 dark:text-warm-600"
                        )}
                      >
                        {step.number}. {step.name}
                      </span>
                      <span className="text-xs text-warm-400">{step.timeline}</span>
                    </div>
                    {isInProgress && (
                      <p className="text-xs text-warm-500 mt-0.5">{step.description}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
