export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3 animate-pulse">
      <div className="h-4 w-2/3 bg-warm-200 dark:bg-warm-700 rounded" />
      <div className="h-3 w-full bg-warm-200 dark:bg-warm-700 rounded" />
      <div className="h-3 w-1/2 bg-warm-200 dark:bg-warm-700 rounded" />
    </div>
  );
}
