import { Progress } from "@/components/ui/progress";

export function GoalProgress({
  secured,
  goal,
}: {
  secured: number;
  goal: number;
}) {
  const pct = Math.min(100, Math.round((secured / goal) * 100));

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-warm-500">Annual Goal</span>
          <span className="font-medium text-warm-900 dark:text-warm-50">
            ${(secured / 1000).toFixed(0)}K / ${(goal / 1000).toFixed(0)}K
          </span>
        </div>
        <Progress value={pct} className="h-3" />
      </div>
      <span className="text-lg font-bold text-brand-teal">{pct}%</span>
    </div>
  );
}
