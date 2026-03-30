import { cn } from "@/lib/utils";

export function DeadlineCountdown({ deadline }: { deadline: string }) {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const color = days <= 3 ? "text-red-500" : days <= 14 ? "text-amber-500" : "text-green-600";
  const label = days < 0 ? "Expired" : days === 0 ? "Today" : `${days}d left`;

  return <span className={cn("text-xs font-medium", color)}>{label}</span>;
}
