import { SkeletonCard } from "@/components/shared/skeleton-card";

export default function AppLoading() {
  return (
    <div className="space-y-6 p-6 max-w-6xl w-full animate-pulse">
      {/* Page title skeleton */}
      <div className="h-8 w-48 rounded-lg bg-warm-200 dark:bg-warm-700" />

      {/* Stat cards row — 4 columns on md+ */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-warm-200 dark:bg-warm-700" />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
