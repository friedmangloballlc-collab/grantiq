export default function PipelineLoading() {
  // Kanban column labels (mimic real pipeline stages)
  const columns = ["Researching", "Applied", "Under Review", "Awarded", "Declined"];

  return (
    <div className="space-y-6 p-6 w-full overflow-x-auto">
      {/* Page title */}
      <div className="h-8 w-36 rounded-lg bg-warm-200 dark:bg-warm-700 animate-pulse" />

      {/* Kanban columns */}
      <div className="flex gap-4 min-w-max">
        {columns.map((col) => (
          <div key={col} className="w-64 shrink-0 space-y-3">
            {/* Column header */}
            <div className="flex items-center gap-2">
              <div className="h-5 w-28 rounded bg-warm-200 dark:bg-warm-700 animate-pulse" />
              <div className="h-5 w-6 rounded-full bg-warm-200 dark:bg-warm-700 animate-pulse" />
            </div>
            {/* Cards */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border p-4 space-y-2 animate-pulse bg-background"
              >
                <div className="h-4 w-3/4 rounded bg-warm-200 dark:bg-warm-700" />
                <div className="h-3 w-full rounded bg-warm-200 dark:bg-warm-700" />
                <div className="h-3 w-1/2 rounded bg-warm-200 dark:bg-warm-700" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
