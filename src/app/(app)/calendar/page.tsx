import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { CalendarView, type DeadlineEntry } from "@/components/calendar/calendar-view";
import { FiscalCycle } from "@/components/calendar/fiscal-cycle";
import { ProactiveAlerts } from "@/components/calendar/proactive-alerts";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const TIER_ORDER = ["free", "starter", "pro", "enterprise"];

export default async function CalendarPage() {
  const ctx = await getOrgContext();
  const tier = ctx?.tier ?? "free";
  const isStarterOrAbove = TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf("starter");

  let deadlines: DeadlineEntry[] = [];

  if (ctx) {
    const { orgId } = ctx;
    const db = createAdminClient();

    const now = new Date().toISOString();

    const [pipelineResult, matchesResult] = await Promise.all([
      // Pipeline grants with deadlines
      db
        .from("grant_pipeline")
        .select("id, stage, grant_sources(name, funder_name, deadline)")
        .eq("org_id", orgId)
        .not("stage", "in", '("awarded","declined")')
        .not("grant_sources.deadline", "is", null)
        .gte("grant_sources.deadline", now)
        .order("grant_sources(deadline)", { ascending: true }),

      // Matched grants with upcoming deadlines
      db
        .from("grant_matches")
        .select("id, grant_sources(name, funder_name, deadline)")
        .eq("org_id", orgId)
        .not("grant_sources.deadline", "is", null)
        .gte("grant_sources.deadline", now)
        .order("grant_sources(deadline)", { ascending: true })
        .limit(50),
    ]);

    // Build pipeline deadline entries
    const pipelineDeadlines: DeadlineEntry[] = (pipelineResult.data ?? [])
      .filter((row) => {
        const gs = row.grant_sources as { deadline?: string | null } | null;
        return gs?.deadline;
      })
      .map((row) => {
        const gs = row.grant_sources as { name?: string; funder_name?: string; deadline?: string } | null;
        return {
          id: `pipeline-${row.id}`,
          grantName: gs?.name ?? "Unknown Grant",
          funderName: gs?.funder_name ?? "Unknown Funder",
          deadline: gs!.deadline!,
          stage: row.stage ?? null,
          isPipeline: true,
        };
      });

    // Build matched grant deadline entries (exclude those already in pipeline)
    const pipelineGrantNames = new Set(pipelineDeadlines.map((d) => d.grantName));

    const matchDeadlines: DeadlineEntry[] = (matchesResult.data ?? [])
      .filter((row) => {
        const gs = row.grant_sources as { name?: string; deadline?: string | null } | null;
        return gs?.deadline && !pipelineGrantNames.has(gs?.name ?? "");
      })
      .map((row) => {
        const gs = row.grant_sources as { name?: string; funder_name?: string; deadline?: string } | null;
        return {
          id: `match-${row.id}`,
          grantName: gs?.name ?? "Unknown Grant",
          funderName: gs?.funder_name ?? "Unknown Funder",
          deadline: gs!.deadline!,
          stage: null,
          isPipeline: false,
        };
      });

    deadlines = [...pipelineDeadlines, ...matchDeadlines];
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Grant Calendar</h1>
        <p className="text-sm text-warm-500 mt-1">
          12-month deadline view
          {isStarterOrAbove
            ? " · federal fiscal cycle · work-back timelines"
            : " · deadlines only (upgrade for fiscal cycle + work-back timelines)"}
        </p>
      </div>

      {/* Free tier — subtle upgrade nudge */}
      {!isStarterOrAbove && (
        <div className="mb-4 flex items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-medium">Free plan:</span> Upgrade to Starter for federal fiscal cycle insights and per-grant work-back timelines.
          </p>
          <Button
            size="sm"
            className="shrink-0 bg-[var(--color-brand-teal)] text-white"
            render={<Link href="/upgrade">Upgrade</Link>}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main calendar */}
        <div className="flex-1 min-w-0">
          <CalendarView deadlines={deadlines} showWorkBack={isStarterOrAbove} />
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 xl:w-96 space-y-4 shrink-0">
          <ProactiveAlerts />
          {isStarterOrAbove ? (
            <FiscalCycle />
          ) : (
            <div className="relative">
              <div className="blur-sm pointer-events-none select-none">
                <FiscalCycle />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-warm-900/80 rounded-xl">
                <div className="text-center p-4 space-y-2">
                  <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
                    Upgrade to Starter to unlock the Federal Fiscal Calendar
                  </p>
                  <Button
                    size="sm"
                    className="bg-[var(--color-brand-teal)] text-white"
                    render={<Link href="/upgrade">Upgrade Now</Link>}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
