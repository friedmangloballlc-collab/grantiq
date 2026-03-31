import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { analyzeWinLoss } from "@/lib/analytics/win-loss";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import Link from "next/link";
import { Lock } from "lucide-react";

export default async function AnalyticsPage() {
  const ctx = await getOrgContext();

  // Gate: full analytics requires Applicant (growth) tier
  // Seeker gets the monthly impact summary on the dashboard instead
  const tier = ctx?.tier ?? "free";
  const hasFullAnalytics =
    tier === "applicant" || tier === "growth" || tier === "enterprise";

  if (!hasFullAnalytics) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Analytics</h1>
          <p className="text-sm text-warm-500 mt-1">
            Win/loss analysis and grant performance insights.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-900/50 py-20 px-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warm-200 dark:bg-warm-800">
            <Lock className="h-6 w-6 text-warm-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50">
              Analytics requires Applicant plan
            </h2>
            <p className="mt-1 text-sm text-warm-500 max-w-sm">
              Unlock win/loss analysis, rejection pattern tracking, benchmarks,
              and AI-powered improvement suggestions.
            </p>
          </div>
          <Link
            href="/upgrade"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--color-brand-teal)] px-4 text-sm font-medium text-white hover:bg-[var(--color-brand-teal)]/90 transition-colors"
          >
            Upgrade to Applicant
          </Link>
        </div>
      </div>
    );
  }

  let analysis = null;
  if (ctx) {
    const db = createAdminClient();
    try {
      analysis = await analyzeWinLoss(ctx.orgId, db);
    } catch {
      // Silently fall back to empty state if tables don't exist yet
      analysis = null;
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Analytics</h1>
        <p className="text-sm text-warm-500 mt-1">
          Win/loss analysis, rejection patterns, and grant performance benchmarks.
        </p>
      </div>

      <AnalyticsDashboard analysis={analysis} />
    </div>
  );
}
