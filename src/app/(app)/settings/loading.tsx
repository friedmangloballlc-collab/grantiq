import { SkeletonCard } from "@/components/shared/skeleton-card";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 p-6 max-w-6xl w-full animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-warm-200 dark:bg-warm-700" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
