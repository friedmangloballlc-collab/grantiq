export function DiversityScore({
  federal,
  state,
  foundation,
  corporate,
}: {
  federal: number;
  state: number;
  foundation: number;
  corporate: number;
}) {
  const total = federal + state + foundation + corporate || 1;
  const maxPct = Math.max(federal, state, foundation, corporate) / total;
  const status = maxPct > 0.6 ? "warning" : "healthy";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-warm-500">Funding Mix:</span>
      <div className="flex gap-1 flex-1 h-3 rounded-full overflow-hidden">
        {federal > 0 && (
          <div
            className="bg-blue-400"
            style={{ width: `${(federal / total) * 100}%` }}
            title={`Federal: ${Math.round((federal / total) * 100)}%`}
          />
        )}
        {state > 0 && (
          <div
            className="bg-purple-400"
            style={{ width: `${(state / total) * 100}%` }}
            title={`State: ${Math.round((state / total) * 100)}%`}
          />
        )}
        {foundation > 0 && (
          <div
            className="bg-green-400"
            style={{ width: `${(foundation / total) * 100}%` }}
            title={`Foundation: ${Math.round((foundation / total) * 100)}%`}
          />
        )}
        {corporate > 0 && (
          <div
            className="bg-orange-400"
            style={{ width: `${(corporate / total) * 100}%` }}
            title={`Corporate: ${Math.round((corporate / total) * 100)}%`}
          />
        )}
      </div>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          status === "warning"
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : "bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300"
        }`}
      >
        {status === "warning" ? "Over-concentrated" : "Diversified"}
      </span>
    </div>
  );
}
