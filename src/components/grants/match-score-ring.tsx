import { cn } from "@/lib/utils";

export function MatchScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : "text-red-400";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={3}
          className="stroke-warm-200 dark:stroke-warm-700" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={circumference - filled}
          strokeLinecap="round" className={cn("transition-all duration-500", color.replace("text-", "stroke-"))} />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold", color)}>
        {score}
      </span>
    </div>
  );
}
