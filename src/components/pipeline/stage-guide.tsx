import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const PIPELINE_STAGES = [
  {
    id: "identified",
    label: "Identified",
    description: "Grant has been matched to your profile. Review the opportunity to decide if it's worth pursuing.",
    action: "Review grant details and eligibility requirements.",
    color: "text-warm-400",
    bgColor: "bg-warm-100",
  },
  {
    id: "qualified",
    label: "Qualified",
    description: "You've evaluated this grant and confirmed you meet the eligibility criteria. Begin gathering requirements.",
    action: "Run the scorecard evaluation. Gather required documents.",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    id: "in_development",
    label: "In Development",
    description: "Application is being written. Narrative, budget, and supporting documents are in progress.",
    action: "Write narrative sections. Build budget. Collect letters of support.",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    id: "under_review",
    label: "Under Review",
    description: "Application draft is complete and being reviewed internally before submission.",
    action: "Run compliance check. Review with team. Make final edits.",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  {
    id: "submitted",
    label: "Submitted",
    description: "Application has been submitted to the funder. Confirmation received and logged.",
    action: "Save confirmation number. Set reminder for expected decision date.",
    color: "text-brand-teal",
    bgColor: "bg-teal-50",
  },
  {
    id: "pending_decision",
    label: "Pending Decision",
    description: "The funder is reviewing your application. You may receive requests for additional information.",
    action: "Monitor for funder communications. Respond to any clarifying questions promptly.",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    id: "awarded",
    label: "Awarded",
    description: "Congratulations! Your grant application was successful. Prepare for grant agreement and reporting.",
    action: "Sign grant agreement. Set up reporting schedule. Begin project implementation.",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "declined",
    label: "Declined",
    description: "This application was not selected. Review funder feedback to improve future applications.",
    action: "Request funder feedback if available. Log rejection reason for analytics.",
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
] as const;

export function StageGuide({ currentStage }: { currentStage?: string }) {
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50 mb-3">
        Application Stages
      </h3>
      <div className="space-y-2">
        {PIPELINE_STAGES.map((stage, i) => {
          const isCompleted = currentIndex >= 0 && i < currentIndex;
          const isCurrent = stage.id === currentStage;
          const isFuture = currentIndex >= 0 && i > currentIndex;
          // Don't show awarded/declined as future steps
          if (isFuture && (stage.id === "awarded" || stage.id === "declined")) return null;

          return (
            <div
              key={stage.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                isCurrent
                  ? "border-brand-teal/40 bg-brand-teal/5"
                  : isCompleted
                  ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10"
                  : "border-warm-200 dark:border-warm-700 opacity-60"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : isCurrent ? (
                  <ArrowRight className="h-4 w-4 text-brand-teal" />
                ) : (
                  <Circle className="h-4 w-4 text-warm-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-brand-teal" : isCompleted ? "text-green-700 dark:text-green-400" : "text-warm-500"
                )}>
                  {stage.label}
                </p>
                <p className="text-xs text-warm-500 mt-0.5">{stage.description}</p>
                {isCurrent && (
                  <p className="text-xs font-medium text-brand-teal mt-1">
                    Next: {stage.action}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact inline version for pipeline cards */
export function StageProgress({ currentStage }: { currentStage: string }) {
  const stages = PIPELINE_STAGES.filter((s) => s.id !== "awarded" && s.id !== "declined");
  const currentIndex = stages.findIndex((s) => s.id === currentStage);

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, i) => (
        <div
          key={stage.id}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i <= currentIndex ? "bg-brand-teal" : "bg-warm-200 dark:bg-warm-700"
          )}
          title={stage.label}
        />
      ))}
    </div>
  );
}
