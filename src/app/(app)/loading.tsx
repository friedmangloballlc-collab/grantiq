export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl w-full animate-pulse">
      {/* Page title skeleton */}
      <div className="h-8 w-48 rounded-lg bg-warm-200 dark:bg-warm-700" />

      {/* Card row skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-warm-200 dark:bg-warm-700"
          />
        ))}
      </div>

      {/* Content block skeleton */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-warm-200 dark:bg-warm-700"
          />
        ))}
      </div>
    </div>
  );
}
