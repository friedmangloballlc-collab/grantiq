import type { PipelineItem } from "./kanban-board";

const STAGE_LABELS: Record<string, string> = {
  identified: "Identified",
  qualified: "Qualified",
  in_development: "In Development",
  under_review: "Under Review",
  submitted: "Submitted",
  pending_decision: "Pending Decision",
  awarded: "Awarded",
  declined: "Declined",
  // legacy labels kept for backward compat with old DB rows
  researching: "Researching",
  preparing: "Preparing",
  writing: "Writing",
};

export function PipelineSummary({ items }: { items: PipelineItem[] }) {
  const totalValue = items.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const awardedValue = items
    .filter((i) => i.stage === "awarded")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const stageCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.stage] = (acc[item.stage] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-warm-50 dark:bg-warm-800/50 rounded-lg border border-warm-200 dark:border-warm-800">
      <div className="flex flex-col">
        <span className="text-xs text-warm-500">Total Grants</span>
        <span className="text-lg font-bold text-warm-900 dark:text-warm-50">{items.length}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-warm-500">Potential Value</span>
        <span className="text-lg font-bold text-brand-teal">
          ${(totalValue / 1000).toFixed(0)}K
        </span>
      </div>
      {awardedValue > 0 && (
        <div className="flex flex-col">
          <span className="text-xs text-warm-500">Awarded</span>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            ${(awardedValue / 1000).toFixed(0)}K
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-2 ml-auto">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <span
            key={stage}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warm-100 dark:bg-warm-700 text-warm-700 dark:text-warm-300"
          >
            {STAGE_LABELS[stage] ?? stage}
            <span className="font-semibold">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
