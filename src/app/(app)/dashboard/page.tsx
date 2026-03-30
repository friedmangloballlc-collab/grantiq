import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TodaysFocus } from "@/components/dashboard/todays-focus";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { WhatsChanged } from "@/components/dashboard/whats-changed";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Default empty state — shown if user is not authenticated or has no org
  let stats = { totalMatches: 0, activePipeline: 0, totalPipelineValue: 0, winRate: 0 };
  let focusItems: Parameters<typeof TodaysFocus>[0]["items"] = [];
  let changeItems: Parameters<typeof WhatsChanged>[0]["items"] = [];

  if (user) {
    const db = createAdminClient();

    // Get org_id
    const { data: membership } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    const orgId = membership?.org_id;

    if (orgId) {
      // ── Stats ──────────────────────────────────────────────────────────────

      // Total matches
      const { count: matchCount } = await db
        .from("grant_matches")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId);

      // Active pipeline count (exclude terminal stages)
      const { count: pipelineCount } = await db
        .from("grant_pipeline")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .not("stage", "in", '("awarded","declined")');

      // Pipeline value — sum of amount_max from joined grant_sources
      const { data: pipelineRows } = await db
        .from("grant_pipeline")
        .select("grant_sources(amount_max)")
        .eq("org_id", orgId)
        .not("stage", "in", '("awarded","declined")');

      const pipelineValue =
        pipelineRows?.reduce((sum, row) => {
          const amount = (row.grant_sources as { amount_max?: number } | null)?.amount_max ?? 0;
          return sum + amount;
        }, 0) ?? 0;

      // Win rate from grant_outcomes
      const { data: outcomes } = await db
        .from("grant_outcomes")
        .select("outcome")
        .eq("org_id", orgId);

      let winRate = 0;
      if (outcomes && outcomes.length > 0) {
        const wins = outcomes.filter((o) => o.outcome === "awarded").length;
        winRate = Math.round((wins / outcomes.length) * 100);
      }

      stats = {
        totalMatches: matchCount ?? 0,
        activePipeline: pipelineCount ?? 0,
        totalPipelineValue: pipelineValue,
        winRate,
      };

      // ── Today's Focus ──────────────────────────────────────────────────────

      const now = new Date();
      const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // Grants with deadlines in next 14 days
      const { data: upcomingDeadlines } = await db
        .from("grant_pipeline")
        .select("id, grant_sources(name, deadline)")
        .eq("org_id", orgId)
        .not("stage", "in", '("awarded","declined")')
        .gte("grant_sources.deadline", now.toISOString())
        .lte("grant_sources.deadline", in14Days)
        .limit(3);

      const deadlineItems = (upcomingDeadlines ?? [])
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

      // Missing documents from onboarding
      const { data: orgProfile } = await db
        .from("org_profiles")
        .select("documents_ready")
        .eq("org_id", orgId)
        .single();

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

      // New matches since last login (approximate: last 7 days)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: newMatchCount } = await db
        .from("grant_matches")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", sevenDaysAgo);

      const newMatchItems =
        (newMatchCount ?? 0) > 0
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

      // ── What's Changed ─────────────────────────────────────────────────────

      const { data: recentEvents } = await db
        .from("user_events")
        .select("id, event_type, metadata, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentEvents && recentEvents.length > 0) {
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
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Dashboard</h1>
        <p className="text-sm text-warm-500 mt-1">Welcome back. Here&apos;s what needs your attention.</p>
      </div>
      <TodaysFocus items={focusItems} />
      <StatsOverview {...stats} />
      <WhatsChanged items={changeItems} />
    </div>
  );
}
