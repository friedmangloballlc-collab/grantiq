import { SkeletonCard } from "@/components/shared/skeleton-card";

export default function LibraryLoading() {
  return (
    <div className="space-y-6 p-6 max-w-6xl w-full">
      {/* Page title */}
      <div className="h-8 w-36 rounded-lg bg-warm-200 dark:bg-warm-700 animate-pulse" />

      {/* Search bar skeleton */}
      <div className="h-10 w-full max-w-md rounded-lg bg-warm-200 dark:bg-warm-700 animate-pulse" />

      {/* Filter chips */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-warm-200 dark:bg-warm-700 animate-pulse" />
        ))}
      </div>

      {/* Grant library card grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
