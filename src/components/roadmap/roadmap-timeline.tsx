const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface RoadmapGrant {
  name: string;
  action: string;
  month?: number;
}

interface QuarterData {
  id: string;
  quarter: string;
  year: number;
  recommendedGrants: RoadmapGrant[];
  totalPotentialAmount: number;
}

export function RoadmapTimeline({ quarters }: { quarters: QuarterData[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-[800px] pb-4">
        {quarters.map((q) => (
          <div
            key={q.id}
            className="flex-1 min-w-48 border border-warm-200 dark:border-warm-800 rounded-lg overflow-hidden"
          >
            {/* Quarter header */}
            <div className="bg-warm-100 dark:bg-warm-800 px-3 py-2 border-b border-warm-200 dark:border-warm-700">
              <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50">
                {q.quarter} {q.year}
              </h3>
              {q.totalPotentialAmount > 0 && (
                <p className="text-xs text-brand-teal">
                  ${(q.totalPotentialAmount / 1000).toFixed(0)}K potential
                </p>
              )}
            </div>

            {/* Grant cards */}
            <div className="p-2 space-y-2 min-h-[160px]">
              {q.recommendedGrants.slice(0, 4).map((g, i) => (
                <div
                  key={i}
                  className="text-xs p-2 bg-warm-50 dark:bg-warm-800/50 rounded border border-warm-100 dark:border-warm-700"
                >
                  {g.month != null && (
                    <p className="text-warm-400 mb-0.5">{MONTHS[g.month - 1]}</p>
                  )}
                  <p className="font-medium text-warm-900 dark:text-warm-50 truncate">
                    {g.name || "Grant"}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-warm-100 dark:bg-warm-700 px-1.5 py-0.5 text-[10px] text-warm-600 dark:text-warm-300 mt-1">
                    {g.action || "research"}
                  </span>
                </div>
              ))}
              {q.recommendedGrants.length === 0 && (
                <p className="text-xs text-warm-400 italic pt-2 px-1">
                  No grants planned
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
