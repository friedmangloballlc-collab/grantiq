import { SkeletonCard } from "@/components/shared/skeleton-card";

export default function MatchesLoading() {
  return (
    <div className="space-y-6 p-6 max-w-6xl w-full">
      {/* Page title */}
      <div className="h-8 w-40 rounded-lg bg-warm-200 dark:bg-warm-700 animate-pulse" />

      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-48 rounded-lg bg-warm-200 dark:bg-warm-700 animate-pulse" />
        <div className="h-10 w-32 rounded-lg bg-warm-200 dark:bg-warm-700 animate-pulse" />
        <div className="h-10 w-32 rounded-lg bg-warm-200 dark:bg-warm-700 animate-pulse" />
      </div>

      {/* Grant match cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
