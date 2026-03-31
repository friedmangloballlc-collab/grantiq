import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarPreviewDeadline {
  id: string;
  grantName: string;
  funderName: string;
  deadline: string; // ISO date
  isPipeline: boolean;
}

interface CalendarPreviewProps {
  deadlines: CalendarPreviewDeadline[];
}

function daysUntil(deadline: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyBadge(days: number) {
  if (days < 7) return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  if (days < 14) return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300";
}

export function CalendarPreview({ deadlines }: CalendarPreviewProps) {
  const top3 = deadlines
    .slice()
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--color-brand-teal)]" />
            <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50">
              Upcoming Deadlines
            </CardTitle>
          </div>
          <Link
            href="/calendar"
            className="text-xs text-[var(--color-brand-teal)] hover:underline flex items-center gap-1"
          >
            Full calendar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {top3.length === 0 ? (
          <p className="text-sm text-warm-400 py-2">
            No upcoming deadlines.{" "}
            <Link href="/matches" className="underline text-[var(--color-brand-teal)]">
              Browse matches
            </Link>{" "}
            to start tracking.
          </p>
        ) : (
          top3.map((d) => {
            const days = daysUntil(d.deadline);
            return (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 rounded-md bg-warm-50 dark:bg-warm-900/30"
              >
                {/* Date block */}
                <div className="text-center shrink-0 w-10">
                  <p className="text-lg font-bold text-warm-900 dark:text-warm-50 leading-none">
                    {new Date(d.deadline).getDate()}
                  </p>
                  <p className="text-[10px] text-warm-400 uppercase">
                    {new Date(d.deadline).toLocaleString("default", { month: "short" })}
                  </p>
                </div>

                {/* Grant info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 dark:text-warm-50 truncate">{d.grantName}</p>
                  <p className="text-xs text-warm-500 truncate">{d.funderName}</p>
                </div>

                {/* Countdown badge */}
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", urgencyBadge(days))}>
                  {days === 0 ? "Today" : `${days}d`}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
