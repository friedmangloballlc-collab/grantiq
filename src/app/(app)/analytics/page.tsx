import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { analyzeWinLoss } from "@/lib/analytics/win-loss";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { GrantFunnel } from "@/components/analytics/grant-funnel";
import { TimeToSubmit } from "@/components/analytics/time-to-submit";
import { FundingBySource } from "@/components/analytics/funding-by-source";
import { OrgBenchmarks } from "@/components/analytics/org-benchmarks";
import { ExportButton } from "@/components/shared/export-button";
import Link from "next/link";
import { Lock, FileText } from "lucide-react";

export default async function AnalyticsPage() {
  const ctx = await getOrgContext();

  const tier = ctx?.tier ?? "free";
  const hasBasicAnalytics = tier !== "free"; // Seeker+
  const hasFullAnalytics =
    tier === "growth" || tier === "growth" || tier === "enterprise";
  const hasEnterprise = tier === "enterprise";

  // Fully locked out (free tier)
  if (!hasBasicAnalytics) {
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
              Analytics requires Seeker plan
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
            Upgrade to Seeker
          </Link>
        </div>
      </div>
    );
  }

  // Fetch analytics data
  let analysis = null;
  let funnelData = { matched: 0, evaluated: 0, pipeline: 0, submitted: 0, awarded: 0 };
  let timeToSubmitData = { avgDays: 0, byType: [] as { type: string; avgDays: number; count: number }[], trend: [] as { month: string; avgDays: number }[] };
  let fundingSources: { source: string; amount: number; count: number }[] = [];
  let orgSize: "small" | "medium" | "large" = "small";

  if (ctx) {
    const db = createAdminClient();

    try {
      analysis = await analyzeWinLoss(ctx.orgId, db);
    } catch {
      analysis = null;
    }

    if (hasFullAnalytics) {
      try {
        // Funnel data
        const [{ count: matchedCount }, { count: pipelineCount }, { data: outcomeRows }] =
          await Promise.all([
            db.from("grant_matches").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId),
            db.from("grant_pipeline").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId),
            db.from("grant_outcomes").select("outcome, amount_awarded, grant_pipeline_id, logged_at").eq("org_id", ctx.orgId),
          ]);

        const submitted = (outcomeRows ?? []).length;
        const awarded = (outcomeRows ?? []).filter((r) => r.outcome === "awarded").length;

        // Rough "evaluated" = pipeline rows that have a scorecard or moved past initial
        const { count: evaluatedCount } = await db
          .from("grant_pipeline")
          .select("id", { count: "exact", head: true })
          .eq("org_id", ctx.orgId)
          .neq("stage", "identified");

        funnelData = {
          matched: matchedCount ?? 0,
          evaluated: evaluatedCount ?? 0,
          pipeline: pipelineCount ?? 0,
          submitted,
          awarded,
        };

        // Funding by source — join outcomes with grant_sources
        const { data: pipelineWithSources } = await db
          .from("grant_pipeline")
          .select("id, grant_sources(grant_type)")
          .eq("org_id", ctx.orgId);

        const pipelineSourceMap = new Map(
          (pipelineWithSources ?? []).map((r) => {
            const gs = r.grant_sources as { grant_type?: string } | null;
            return [r.id as string, gs?.grant_type ?? "Other"];
          })
        );

        // Map grant_type → funding source category
        function typeToSource(gt: string): string {
          const l = gt.toLowerCase();
          if (l.includes("federal") || l.includes("government") || l.includes("federal agency")) return "Federal";
          if (l.includes("state") || l.includes("city") || l.includes("county") || l.includes("local")) return "State";
          if (l.includes("corporate") || l.includes("business") || l.includes("company")) return "Corporate";
          return "Foundation";
        }

        const sourceMap: Record<string, { amount: number; count: number }> = {};
        for (const outcome of outcomeRows ?? []) {
          if (outcome.outcome !== "awarded") continue;
          const grantType = pipelineSourceMap.get(outcome.grant_pipeline_id) ?? "Other";
          const source = typeToSource(grantType);
          if (!sourceMap[source]) sourceMap[source] = { amount: 0, count: 0 };
          sourceMap[source].amount += outcome.amount_awarded ?? 0;
          sourceMap[source].count += 1;
        }
        fundingSources = Object.entries(sourceMap).map(([source, { amount, count }]) => ({
          source,
          amount,
          count,
        }));

        // Time-to-submit: use pipeline added_at vs outcome logged_at
        const { data: pipelineWithDates } = await db
          .from("grant_pipeline")
          .select("id, added_at, grant_sources(grant_type)")
          .eq("org_id", ctx.orgId);

        const pipelineDateMap = new Map(
          (pipelineWithDates ?? []).map((r) => {
            const gs = r.grant_sources as { grant_type?: string } | null;
            return [r.id as string, { addedAt: r.added_at as string, grantType: gs?.grant_type ?? "Other" }];
          })
        );

        const typeTimeMap: Record<string, number[]> = {};
        const monthTimeMap: Record<string, number[]> = {};

        for (const outcome of outcomeRows ?? []) {
          const info = pipelineDateMap.get(outcome.grant_pipeline_id);
          if (!info || !outcome.grant_pipeline_id) continue;
          const added = new Date(info.addedAt).getTime();
          const loggedStr = (outcome as Record<string, unknown>).logged_at as string | undefined;
          const logged = new Date(loggedStr ?? info.addedAt).getTime();
          const days = Math.round(Math.abs(logged - added) / (1000 * 60 * 60 * 24));
          if (days < 365) {
            if (!typeTimeMap[info.grantType]) typeTimeMap[info.grantType] = [];
            typeTimeMap[info.grantType].push(days);

            const month = new Date(info.addedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
            if (!monthTimeMap[month]) monthTimeMap[month] = [];
            monthTimeMap[month].push(days);
          }
        }

        const byType = Object.entries(typeTimeMap).map(([type, days]) => ({
          type,
          avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
          count: days.length,
        }));

        const trendEntries = Object.entries(monthTimeMap).map(([month, days]) => ({
          month,
          avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
        }));

        const allDays = Object.values(typeTimeMap).flat();
        const avgDays = allDays.length > 0 ? Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length) : 0;

        timeToSubmitData = { avgDays, byType, trend: trendEntries };

        // Org size estimate
        const { count: memberCount } = await db
          .from("org_members")
          .select("id", { count: "exact", head: true })
          .eq("org_id", ctx.orgId)
          .eq("status", "active");

        orgSize = (memberCount ?? 1) <= 10 ? "small" : (memberCount ?? 1) <= 50 ? "medium" : "large";
      } catch {
        // silently fall through
      }
    }
  }

  const totalAwarded = fundingSources.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Analytics</h1>
          <p className="text-sm text-warm-500 mt-1">
            Win/loss analysis, rejection patterns, and grant performance benchmarks.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasFullAnalytics && (
            <>
              <ExportButton type="analytics" label="Export" size="sm" />
              <Link
                href="/analytics/reports"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-warm-200 dark:border-warm-700 px-3 text-xs font-medium text-warm-600 dark:text-warm-400 hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                Reports
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Basic analytics — Seeker+ */}
      <AnalyticsDashboard analysis={analysis} />

      {/* Full analytics — Applicant+ */}
      {!hasFullAnalytics ? (
        <div className="rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-900/30 p-6 text-center space-y-3">
          <Lock className="h-6 w-6 text-warm-300 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              Grant Funnel, Time-to-Submit, and Funding Breakdown
            </p>
            <p className="text-xs text-warm-400 mt-1">
              Upgrade to Applicant to unlock advanced analytics.
            </p>
          </div>
          <Link
            href="/upgrade"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--color-brand-teal)] px-4 text-xs font-medium text-white hover:bg-[var(--color-brand-teal)]/90 transition-colors"
          >
            Upgrade to Applicant
          </Link>
        </div>
      ) : (
        <>
          {/* Grant Funnel + Time to Submit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GrantFunnel
              matched={funnelData.matched}
              evaluated={funnelData.evaluated}
              pipeline={funnelData.pipeline}
              submitted={funnelData.submitted}
              awarded={funnelData.awarded}
            />
            <TimeToSubmit
              avgDays={timeToSubmitData.avgDays}
              byType={timeToSubmitData.byType}
              trend={timeToSubmitData.trend}
            />
          </div>

          {/* Funding by Source */}
          <FundingBySource sources={fundingSources} totalAwarded={totalAwarded} />
        </>
      )}

      {/* Org Benchmarks — Enterprise only */}
      {hasFullAnalytics && !hasEnterprise && (
        <div className="rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-900/30 p-6 text-center space-y-3">
          <Lock className="h-6 w-6 text-warm-300 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              Organization Benchmarks
            </p>
            <p className="text-xs text-warm-400 mt-1">
              Compare your performance against similar orgs on the platform. Available on Enterprise plan.
            </p>
          </div>
          <Link
            href="/upgrade"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--color-brand-teal)] px-4 text-xs font-medium text-white hover:bg-[var(--color-brand-teal)]/90 transition-colors"
          >
            Upgrade to Enterprise
          </Link>
        </div>
      )}

      {hasEnterprise && (
        <OrgBenchmarks
          winRate={analysis?.winRate ?? 0}
          avgDaysToSubmit={timeToSubmitData.avgDays}
          readinessScore={0}
          orgSize={orgSize}
        />
      )}
    </div>
  );
}
