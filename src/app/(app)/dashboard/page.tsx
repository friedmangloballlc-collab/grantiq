import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { TodaysFocus } from "@/components/dashboard/todays-focus";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { WhatsChanged } from "@/components/dashboard/whats-changed";
import { ServiceTracker, type ServiceEngagement } from "@/components/dashboard/service-tracker";
import { AZQualification } from "@/components/dashboard/az-qualification";
import { IndustryInsights } from "@/components/dashboard/industry-insights";
import { calculateAZScore } from "@/lib/qualification/az-score";
import type { AZScoreResult } from "@/lib/qualification/az-score";

export default async function DashboardPage() {
  const ctx = await getOrgContext();

  // Default empty state — shown if user is not authenticated or has no org
  let stats = { totalMatches: 0, activePipeline: 0, totalPipelineValue: 0, winRate: 0 };
  let focusItems: Parameters<typeof TodaysFocus>[0]["items"] = [];
  let changeItems: Parameters<typeof WhatsChanged>[0]["items"] = [];
  let activeEngagement: ServiceEngagement | null = null;
  let azScore: AZScoreResult | null = null;
  let industryKey: string | null = null;

  if (ctx) {
    const { orgId } = ctx;
    const db = createAdminClient();

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // ── Parallel fetch all dashboard data in one round-trip ───────────────────
    const [
      dashStatsResult,
      upcomingDeadlinesResult,
      orgProfileResult,
      newMatchCountResult,
      recentEventsResult,
      engagementResult,
      azOrgResult,
      azProfileResult,
      azCapabilitiesResult,
      azSubscriptionResult,
    ] = await Promise.all([
      // Stats via RPC (replaces 4 separate queries)
      db.rpc("get_dashboard_stats", { p_org_id: orgId }),

      // Today's Focus: upcoming deadlines
      db
        .from("grant_pipeline")
        .select("id, grant_sources(name, deadline)")
        .eq("org_id", orgId)
        .not("stage", "in", '("awarded","declined")')
        .gte("grant_sources.deadline", now.toISOString())
        .lte("grant_sources.deadline", in14Days)
        .limit(3),

      // Today's Focus: org profile (docs + industry)
      db
        .from("org_profiles")
        .select("documents_ready, industry")
        .eq("org_id", orgId)
        .single(),

      // Today's Focus: new matches last 7 days
      db
        .from("grant_matches")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", sevenDaysAgo),

      // What's Changed: recent events
      db
        .from("user_events")
        .select("id, event_type, metadata, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5),

      // Active service engagement
      db
        .from("service_engagements")
        .select("id, package_name, service_type, status, current_step, step_statuses, assigned_advisor, started_at")
        .eq("org_id", orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),

      // A-Z score: org financials
      db.from("organizations").select("annual_budget, entity_type, employee_count").eq("id", orgId).single(),

      // A-Z score: org profile
      db.from("org_profiles").select("business_stage, grant_history_level, program_areas, documents_ready, mission_statement").eq("org_id", orgId).single(),

      // A-Z score: capabilities
      db.from("org_capabilities").select("has_sam_registration").eq("org_id", orgId).single(),

      // A-Z score: subscription
      db.from("subscriptions").select("tier").eq("org_id", orgId).eq("status", "active").limit(1).single(),
    ]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const dashStats = dashStatsResult.data as {
      total_matches: number;
      active_pipeline: number;
      pipeline_value: number;
      win_count: number;
      total_outcomes: number;
    } | null;

    if (dashStats) {
      const winRate =
        dashStats.total_outcomes > 0
          ? Math.round((dashStats.win_count / dashStats.total_outcomes) * 100)
          : 0;

      stats = {
        totalMatches: dashStats.total_matches ?? 0,
        activePipeline: dashStats.active_pipeline ?? 0,
        totalPipelineValue: dashStats.pipeline_value ?? 0,
        winRate,
      };
    }

    // ── Today's Focus ─────────────────────────────────────────────────────────
    const upcomingDeadlines = upcomingDeadlinesResult.data ?? [];
    const deadlineItems = upcomingDeadlines
      .filter((row) => (row.grant_sources as { name?: string; deadline?: string } | null)?.deadline)
      .map((row) => {
        const gs = row.grant_sources as { name?: string; deadline?: string } | null;
        return {
          id: `deadline-${row.id}`,
          priority: "urgent" as const,
          title: `Deadline approaching: ${gs?.name ?? "Grant"}`,
          action: "View in Pipeline",
          actionHref: "/pipeline",
          estimatedTime: "30 min",
        };
      });

    const orgProfile = orgProfileResult.data;
    industryKey = (orgProfile as { industry?: string | null } | null)?.industry ?? null;
    const docsReady = orgProfile?.documents_ready ?? "";
    const missingDocItems =
      docsReady === "none" || docsReady === ""
        ? [
            {
              id: "missing-docs",
              priority: "this_week" as const,
              title: "Upload key documents to improve your matches",
              action: "Go to Settings",
              actionHref: "/settings",
              estimatedTime: "15 min",
            },
          ]
        : [];

    const newMatchCount = newMatchCountResult.count ?? 0;
    const newMatchItems =
      newMatchCount > 0
        ? [
            {
              id: "new-matches",
              priority: "opportunity" as const,
              title: `${newMatchCount} new grant matches in the last 7 days`,
              action: "View Matches",
              actionHref: "/matches",
              estimatedTime: "10 min",
            },
          ]
        : [];

    focusItems = [...deadlineItems, ...missingDocItems, ...newMatchItems].slice(0, 3);

    // ── What's Changed ────────────────────────────────────────────────────────
    const recentEvents = recentEventsResult.data ?? [];

    if (recentEvents.length > 0) {
      changeItems = recentEvents.map((evt) => {
        const meta = (evt.metadata ?? {}) as Record<string, unknown>;
        let message = "Activity recorded";
        let type: "new_match" | "deadline" | "pipeline_update" | "readiness_change" = "pipeline_update";

        switch (evt.event_type) {
          case "grant_matched":
            type = "new_match";
            message = `New grant matched: ${String(meta.grant_name ?? "Unknown")}`;
            break;
          case "deadline_reminder":
            type = "deadline";
            message = `Deadline coming up for: ${String(meta.grant_name ?? "a grant")}`;
            break;
          case "pipeline_stage_changed":
            type = "pipeline_update";
            message = `Grant moved to ${String(meta.new_stage ?? "new stage")}`;
            break;
          case "readiness_scored":
            type = "readiness_change";
            message = `Readiness score updated to ${String(meta.score ?? "N/A")}`;
            break;
          default:
            message = String(evt.event_type).replace(/_/g, " ");
        }

        return {
          id: String(evt.id),
          type,
          message,
          timestamp: String(evt.created_at),
        };
      });
    } else {
      // Fallback: surface recent grant matches as change items
      const { data: recentMatches } = await db
        .from("grant_matches")
        .select("id, match_score, created_at, grant_sources(name)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5);

      changeItems = (recentMatches ?? []).map((m) => {
        const gs = m.grant_sources as { name?: string } | null;
        return {
          id: String(m.id),
          type: "new_match" as const,
          message: `Matched to ${gs?.name ?? "a grant"} with ${Math.round(m.match_score)}% score`,
          timestamp: String(m.created_at),
        };
      });
    }

    // ── Active Service Engagement ─────────────────────────────────────────────
    if (engagementResult.data) {
      activeEngagement = engagementResult.data as ServiceEngagement;
    }

    // ── A-Z Qualification Score ───────────────────────────────────────────────
    azScore = calculateAZScore(
      azOrgResult.data ?? null,
      azProfileResult.data ?? null,
      azCapabilitiesResult.data ?? null,
      azSubscriptionResult.data ?? null,
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Dashboard</h1>
        <p className="text-sm text-warm-500 mt-1">Welcome back. Here&apos;s what needs your attention.</p>
      </div>
      <TodaysFocus items={focusItems} />
      <StatsOverview {...stats} />
      {activeEngagement && <ServiceTracker engagement={activeEngagement} />}
      {azScore && <AZQualification result={azScore} />}
      <IndustryInsights industryKey={industryKey} />
      <WhatsChanged items={changeItems} />
    </div>
  );
}
