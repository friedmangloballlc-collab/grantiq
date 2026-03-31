import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ChevronRight } from "lucide-react";

interface TopFunder {
  name: string;
  avgMatchScore: number;
  grantCount: number;
}

interface Props {
  funders: TopFunder[];
}

const SCORE_COLOR = (score: number) =>
  score >= 70
    ? "text-green-600 dark:text-green-400"
    : score >= 50
    ? "text-amber-600 dark:text-amber-400"
    : "text-warm-400";

export function TopFunders({ funders }: Props) {
  if (funders.length === 0) return null;

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-warm-400" />
            <h2 className="text-sm font-semibold text-warm-900 dark:text-warm-50">
              Top Funders for You
            </h2>
          </div>
          <Link
            href="/funders"
            className="text-xs text-brand-teal hover:text-brand-teal/80 font-medium flex items-center gap-0.5"
          >
            View All
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {funders.map((funder, i) => (
            <Link
              key={funder.name}
              href={`/funders/${encodeURIComponent(funder.name)}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-warm-50 dark:hover:bg-warm-800/50 transition-colors group"
            >
              <span className="text-xs font-medium text-warm-400 w-4 shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warm-900 dark:text-warm-50 group-hover:text-brand-teal transition-colors truncate">
                  {funder.name}
                </p>
                <p className="text-xs text-warm-400 mt-0.5">
                  {funder.grantCount} grant{funder.grantCount !== 1 ? "s" : ""}{" "}
                  matching your profile
                </p>
              </div>
              <span
                className={`text-sm font-bold shrink-0 ${SCORE_COLOR(funder.avgMatchScore)}`}
              >
                {funder.avgMatchScore}%
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
