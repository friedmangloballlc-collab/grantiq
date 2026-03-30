import { Card, CardContent } from "@/components/ui/card";
import { DeadlineCountdown } from "@/components/shared/deadline-countdown";
import { Progress } from "@/components/ui/progress";

export function PipelineCard({
  grantName,
  funderName,
  amount,
  deadline,
  progress,
  aiStatus,
}: {
  grantName: string;
  funderName: string;
  amount: number | null;
  deadline: string | null;
  progress: number;
  aiStatus: string;
}) {
  return (
    <Card className="border-warm-200 dark:border-warm-800 cursor-grab active:cursor-grabbing">
      <CardContent className="p-3 space-y-2">
        <h4 className="text-sm font-medium text-warm-900 dark:text-warm-50 truncate">{grantName}</h4>
        <p className="text-xs text-warm-500 truncate">{funderName}</p>
        <div className="flex items-center justify-between">
          {amount != null && (
            <span className="text-xs font-medium text-warm-700 dark:text-warm-300">
              ${(amount / 1000).toFixed(0)}K
            </span>
          )}
          {deadline && <DeadlineCountdown deadline={deadline} />}
        </div>
        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-warm-400 italic">{aiStatus}</p>
      </CardContent>
    </Card>
  );
}
