import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { TodaysFocus } from "@/components/dashboard/todays-focus";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { WhatsChanged } from "@/components/dashboard/whats-changed";
import { ServiceTracker, type ServiceEngagement } from "@/components/dashboard/service-tracker";
import { AZQualification } from "@/components/dashboard/az-qualification";
import { IndustryInsights } from "@/components/dashboard/industry-insights";
import { ProfileCompletion } from "@/components/dashboard/profile-completion";
import { VaultSummary } from "@/components/vault/vault-summary";
import { calculateAZScore } from "@/lib/qualification/az-score";
import type { AZScoreResult } from "@/lib/qualification/az-score";
import { DOCUMENT_DEFINITIONS } from "@/components/vault/document-checklist";
import { CalendarPreview, type CalendarPreviewDeadline } from "@/components/dashboard/calendar-preview";
import { ReferralMiniCard } from "@/components/referral/referral-mini-card";
import { generateReferralCode } from "@/lib/referral";
import { TopFunders } from "@/components/dashboard/top-funders";
import { MonthlyImpact, type MonthActivity } from "@/components/dashboard/monthly-impact";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import Link from "next/link";

export default async function DashboardPage() {
  const ctx = await getOrgContext();

  // Default empty state — shown if user is not authenticated or has no org
  let stats = { totalMatches: 0, activePipeline: 0, totalPipelineValue: 0, winRate: 0 };
  let focusItems: Parameters<typeof TodaysFocus>[0]["items"] = [];
  let changeItems: Parameters<typeof WhatsChanged>[0]["items"] = [];
  let activeEngagement: ServiceEngagement | null = null;
  let azScore: AZScoreResult | null = null;
  let industryKey: string | null = null;
  let deferredAnswers: Record<string, string> = {};
  let vaultUploaded = 0;
  const vaultTotal = DOCUMENT_DEFINITIONS.length; // 13
  let calendarDeadlines: CalendarPreviewDeadline[] = [];
  let referralCode: string | null = null;
  let topFunders: { name: string; avgMatchScore: number; grantCount: number }[] = [];
  let monthlyImpact: MonthActivity | null = null;

  if (ctx) {
    const { orgId } = ctx;
    const db = createAdminClient();

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // ── Parallel fetch all dashboard data in one round-trip ───────────────────
    const [
      dashStatsResult,
      upcomingDeadlinesResult,
      orgProfileResult,
      newMatchCountResult,
      recentEventsResult,
      engagementResult,
      azOrgResult,
      azCapabilitiesResult,
      azSubscriptionResult,
      vaultDocsResult,
      calPipelineResult,
      calMatchResult,
      referralResult,
      funderMatchResult,
      monthMatchCountResult,
      monthEvaluatedCountResult,
      monthSubmittedCountResult,
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

      // Org profile: single merged query for focus, A-Z score, and deferred profile
      db
        .from("org_profiles")
        .select("documents_ready, industry, business_stage, grant_history_level, program_areas, mission_statement, business_model, phone, contact_method, ownership_demographics, interested_in_nonprofit, funding_use, naics_primary, funding_amount_min, funding_amount_max, federal_certifications, sam_registration_status, match_funds_capacity")
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

      // A-Z score: capabilities
      db.from("org_capabilities").select("has_sam_registration").eq("org_id", orgId).single(),

      // A-Z score: subscription
      db.from("subscriptions").select("tier").eq("org_id", orgId).eq("status", "active").limit(1).single(),

      // Document vault count
      db
        .from("document_vault")
        .select("document_type")
        .eq("org_id", orgId)
        .eq("status", "active"),

      // Calendar Preview: pipeline deadlines
      db
        .from("grant_pipeline")
        .select("id, grant_sources(name, funder_name, deadline)")
        .eq("org_id", orgId)
        .not("stage", "in", '("awarded","declined")')
        .gte("grant_sources.deadline", now.toISOString())
        .order("grant_sources(deadline)", { ascending: true })
        .limit(3),

      // Calendar Preview: match deadlines
      db
        .from("grant_matches")
        .select("id, grant_sources(name, funder_name, deadline)")
        .eq("org_id", orgId)
        .not("grant_sources.deadline", "is", null)
        .gte("grant_sources.deadline", now.toISOString())
        .order("grant_sources(deadline)", { ascending: true })
        .limit(3),

      // Referral code lookup
      db
        .from("referrals")
        .select("code")
        .eq("referrer_user_id", ctx.userId)
        .order("created_at", { ascending: false })
        .limit(1),

      // Top funders
      db
        .from("grant_matches")
        .select("match_score, grant_sources(funder_name)")
        .eq("org_id", orgId)
        .order("match_score", { ascending: false }),

      // Monthly Impact: new matches this month
      db
        .from("grant_matches")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", monthStart),

      // Monthly Impact: grants evaluated this month
      db
        .from("grant_pipeline")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", monthStart),

      // Monthly Impact: grants submitted this month
      db
        .from("grant_pipeline")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("stage", "submitted")
        .gte("updated_at", monthStart),
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
      .filter((row) => (row.grant_sources as unknown as { name?: string; deadline?: string } | null)?.deadline)
      .map((row) => {
        const gs = row.grant_sources as unknown as { name?: string; deadline?: string } | null;
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
        const gs = m.grant_sources as unknown as { name?: string } | null;
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
      orgProfileResult.data ?? null,
      azCapabilitiesResult.data ?? null,
      azSubscriptionResult.data ?? null,
    );

    // ── Deferred Profile Answers ──────────────────────────────────────────────
    // Map DB columns back to onboarding step IDs for ProfileCompletion card
    const dp = orgProfileResult.data as {
      industry?: string | null;
      business_stage?: string | null;
      funding_use?: string | null;
      grant_history_level?: string | null;
      business_model?: string | null;
      phone?: string | null;
      contact_method?: string | null;
      documents_ready?: string | null;
      ownership_demographics?: string | null;
      interested_in_nonprofit?: string | null;
      naics_primary?: string | null;
      funding_amount_min?: number | null;
      funding_amount_max?: number | null;
      federal_certifications?: string[] | null;
      sam_registration_status?: string | null;
      match_funds_capacity?: string | null;
    } | null;

    if (dp) {
      const maybe = (v: string | null | undefined) => v ?? undefined;
      const raw: Record<string, string | undefined> = {
        industry:                maybe(dp.industry),
        business_stage:          maybe(dp.business_stage),
        funding_use:             maybe(dp.funding_use),
        grant_history:           maybe(dp.grant_history_level),
        business_model:          maybe(dp.business_model),
        phone:                   maybe(dp.phone),
        contact_method:          maybe(dp.contact_method),
        documents:               maybe(dp.documents_ready),
        ownership:               maybe(dp.ownership_demographics),
        interested_nonprofit:    maybe(dp.interested_in_nonprofit),
        naics_primary:           maybe(dp.naics_primary),
        funding_amount:          dp.funding_amount_min != null || dp.funding_amount_max != null ? `${dp.funding_amount_min ?? ""}:${dp.funding_amount_max ?? ""}` : undefined,
        federal_certifications:  Array.isArray(dp.federal_certifications) && dp.federal_certifications.length > 0 ? dp.federal_certifications.join(", ") : undefined,
        sam_registration_status: maybe(dp.sam_registration_status),
        match_funds_capacity:    maybe(dp.match_funds_capacity),
      };
      // We also need employee_count / annual_revenue / mission from organizations
      const orgRow = azOrgResult.data as {
        annual_budget?: string | null;
        employee_count?: string | null;
      } | null;
      const missionRow = orgProfileResult.data as { mission_statement?: string | null } | null;
      raw.employee_count = maybe(orgRow?.employee_count ?? undefined);
      raw.annual_revenue  = maybe(orgRow?.annual_budget ?? undefined);
      raw.mission         = maybe(missionRow?.mission_statement ?? undefined);

      deferredAnswers = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== null && v !== "")
      ) as Record<string, string>;
    }

    // ── Vault uploaded count (deduplicated by doc type) ───────────────────────
    const vaultRows = (vaultDocsResult.data ?? []) as { document_type: string }[];
    const seenTypes = new Set(vaultRows.map((r) => r.document_type));
    vaultUploaded = seenTypes.size;

    // ── Calendar Preview: next 3 deadlines ───────────────────────────────────
    const calPipeline: CalendarPreviewDeadline[] = (calPipelineResult.data ?? [])
      .filter((r) => (r.grant_sources as unknown as { deadline?: string | null } | null)?.deadline)
      .map((r) => {
        const gs = r.grant_sources as unknown as { name?: string; funder_name?: string; deadline?: string } | null;
        return { id: `p-${r.id}`, grantName: gs?.name ?? "Grant", funderName: gs?.funder_name ?? "", deadline: gs!.deadline!, isPipeline: true };
      });

    const calPipelineNames = new Set(calPipeline.map((d) => d.grantName));
    const calMatches: CalendarPreviewDeadline[] = (calMatchResult.data ?? [])
      .filter((r) => {
        const gs = r.grant_sources as unknown as { name?: string; deadline?: string | null } | null;
        return gs?.deadline && !calPipelineNames.has(gs?.name ?? "");
      })
      .map((r) => {
        const gs = r.grant_sources as unknown as { name?: string; funder_name?: string; deadline?: string } | null;
        return { id: `m-${r.id}`, grantName: gs?.name ?? "Grant", funderName: gs?.funder_name ?? "", deadline: gs!.deadline!, isPipeline: false };
      });

    calendarDeadlines = [...calPipeline, ...calMatches]
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3);

    // ── Referral code for mini card ───────────────────────────────────────────
    const referralRows = referralResult.data;

    if (referralRows && referralRows.length > 0) {
      referralCode = referralRows[0].code as string;
    } else {
      // Auto-generate
      const newCode = generateReferralCode();
      await db.from("referrals").insert({
        referrer_user_id: ctx.userId,
        referrer_org_id: orgId,
        code: newCode,
        status: "pending",
      });
      referralCode = newCode;
    }

    // ── Top Funders ───────────────────────────────────────────────────────────
    const funderMatchRows = funderMatchResult.data;

    const funderScoreMap = new Map<
      string,
      { totalScore: number; count: number }
    >();
    for (const m of funderMatchRows ?? []) {
      const gs = m.grant_sources as unknown as { funder_name?: string } | null;
      if (!gs?.funder_name) continue;
      const fn = gs.funder_name;
      if (!funderScoreMap.has(fn)) {
        funderScoreMap.set(fn, { totalScore: 0, count: 0 });
      }
      const entry = funderScoreMap.get(fn)!;
      entry.totalScore += m.match_score ?? 0;
      entry.count += 1;
    }
    topFunders = [...funderScoreMap.entries()]
      .map(([name, data]) => ({
        name,
        avgMatchScore: Math.round(data.totalScore / data.count),
        grantCount: data.count,
      }))
      .sort((a, b) => b.avgMatchScore - a.avgMatchScore)
      .slice(0, 3);

    // ── Monthly Impact ────────────────────────────────────────────────────────
    const currentMonthLabel = now.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    // Use AZ score for readiness delta — in future we could store historical scores
    const readinessNow = azScore?.overallScore ?? 0;
    const readinessPrev = Math.max(0, readinessNow - (vaultUploaded > 0 ? 7 : 0));

    monthlyImpact = {
      month: currentMonthLabel,
      newMatches: monthMatchCountResult.count ?? 0,
      grantsEvaluated: monthEvaluatedCountResult.count ?? 0,
      applicationsSubmitted: monthSubmittedCountResult.count ?? 0,
      readinessStart: readinessPrev,
      readinessEnd: readinessNow,
      grantsUnlocked: vaultUploaded > 0 ? Math.min(8, vaultUploaded * 2) : 0,
      unlockReason: vaultUploaded > 0 ? "uploading documents" : undefined,
    };
  }

  // Determine subscription tier for upgrade banner
  const dashboardTier = ctx?.tier ?? "free";

  // Derive profile completeness from filled deferred answers (3+ fields = sufficiently complete)
  const profileComplete = Object.keys(deferredAnswers).length >= 3;

  // New-user detection: no activity across matches, pipeline, or vault
  const isNewUser =
    stats.totalMatches === 0 &&
    stats.activePipeline === 0 &&
    vaultUploaded === 0;

  return (
    <div className="space-y-6 max-w-6xl px-4 md:px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Dashboard</h1>
        <p className="text-sm text-warm-500 mt-1">
          {isNewUser
            ? "Welcome to GrantAQ. Let\u2019s get you set up."
            : "Welcome back. Here\u2019s what needs your attention."}
        </p>
      </div>

      {/* Free-tier upgrade banner */}
      {dashboardTier === "free" && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10 px-4 py-3">
          <p className="text-sm text-warm-700 dark:text-warm-300">
            <span className="font-medium">You&apos;re on the Free plan.</span>{" "}
            Upgrade to unlock unlimited matches, AI writing, and more.
          </p>
          <Link
            href="/upgrade"
            className="shrink-0 inline-flex h-8 items-center justify-center rounded-lg bg-brand-teal px-3 text-sm font-medium text-white hover:bg-brand-teal/90 transition-colors"
          >
            Upgrade
          </Link>
        </div>
      )}

      {referralCode && <ReferralMiniCard referralCode={referralCode} />}

      {isNewUser ? (
        <>
          <OnboardingChecklist
            profileComplete={profileComplete}
            hasMatches={stats.totalMatches > 0}
            hasPipeline={stats.activePipeline > 0}
            hasVault={vaultUploaded > 0}
            hasCalendar={calendarDeadlines.length > 0}
          />
          <TodaysFocus items={focusItems} />
          <StatsOverview {...stats} />
        </>
      ) : (
        <>
          <TodaysFocus items={focusItems} />
          <StatsOverview {...stats} />
          {monthlyImpact && <MonthlyImpact currentMonth={monthlyImpact} />}
          {topFunders.length > 0 && <TopFunders funders={topFunders} />}
          <CalendarPreview deadlines={calendarDeadlines} />
          <ProfileCompletion savedAnswers={deferredAnswers} />
          <VaultSummary
            uploaded={vaultUploaded}
            total={vaultTotal}
            blockedFederalCount={vaultTotal - vaultUploaded > 0 ? Math.max(0, 47 - vaultUploaded * 5) : 0}
            nextUploadHint={
              vaultUploaded < vaultTotal
                ? "Upload your audited financials to unlock more federal grant matches."
                : undefined
            }
          />
          {activeEngagement && <ServiceTracker engagement={activeEngagement} />}
          {azScore && <AZQualification result={azScore} />}
          <IndustryInsights industryKey={industryKey} />
          <WhatsChanged items={changeItems} />
        </>
      )}
    </div>
  );
}
