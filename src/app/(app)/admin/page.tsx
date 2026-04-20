import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminStats } from "@/components/admin/admin-stats";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "getreachmediallc@gmail.com";

const QUICK_LINKS = [
  { href: "/admin/leads", label: "Leads", description: "View leads from public eligibility checks — hot, warm, cold" },
  { href: "/admin/corrections", label: "Review Corrections", description: "Approve or reject user-submitted grant data fixes" },
  { href: "/admin/users", label: "Manage Users", description: "View users, orgs, tiers, and subscriptions" },
  { href: "/admin/agents", label: "Agents", description: "Health + activity dashboards for all 12 platform agents" },
];

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();

  const [
    userCountResult,
    orgCountResult,
    grantCountResult,
    pipelineCountResult,
    signupsWeekResult,
    signupsMonthResult,
    subscriptionTiersResult,
    pendingCorrectionsResult,
    // Agent 7-day activity aggregates
    aiGenerations7d,
    activeAlerts,
    verifierFlagged,
    matchKills7d,
    autoComplianceEvents7d,
    outcomes7d,
    funderLearningsTotal,
    sectionAudits7d,
    qualityScores7d,
    triage7d,
    tickets7d,
  ] = await Promise.all([
    // Total users
    admin
      .from("auth.users" as "org_members")
      .select("*", { count: "exact", head: true }),

    // Total orgs
    admin
      .from("organizations")
      .select("*", { count: "exact", head: true }),

    // Total grants in library
    admin
      .from("grant_sources")
      .select("*", { count: "exact", head: true }),

    // Total pipeline items
    admin
      .from("grant_pipeline")
      .select("*", { count: "exact", head: true }),

    // Signups this week — using org_members as proxy for users with orgs
    admin
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfWeek.toISOString()),

    // Signups this month
    admin
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),

    // Subscriptions by tier
    admin
      .from("subscriptions")
      .select("tier"),

    // Pending corrections (last 5 for preview)
    admin
      .from("grant_corrections")
      .select("id, grant_id, field_name, suggested_value, created_at, user_id, grant_sources(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),

    // ── Agent activity (7-day rolling) ──────────────────────────────────
    admin
      .from("ai_generations")
      .select("estimated_cost_cents")
      .gte("created_at", sevenDaysAgo),
    admin
      .from("cost_watchdog_alerts")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    admin
      .from("grant_sources")
      .select("id", { count: "exact", head: true })
      .eq("manual_review_flag", true),
    admin
      .from("match_kills")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    admin
      .from("compliance_events")
      .select("id", { count: "exact", head: true })
      .eq("auto_generated", true)
      .gte("created_at", sevenDaysAgo),
    admin
      .from("org_funder_history")
      .select("outcome")
      .gte("created_at", sevenDaysAgo),
    admin
      .from("funder_learnings")
      .select("id", { count: "exact", head: true }),
    admin
      .from("section_audits")
      .select("verdict")
      .gte("created_at", sevenDaysAgo),
    admin
      .from("draft_quality_scores")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    admin
      .from("error_triage_events")
      .select("severity, status")
      .gte("created_at", sevenDaysAgo),
    admin
      .from("support_tickets")
      .select("urgency, status")
      .gte("created_at", sevenDaysAgo),
  ]);

  // Tally subscription tiers
  const tierCounts: Record<string, number> = {};
  for (const row of subscriptionTiersResult.data ?? []) {
    const t = (row as { tier: string }).tier ?? "free";
    tierCounts[t] = (tierCounts[t] ?? 0) + 1;
  }

  const topStats = [
    { label: "Total Users", value: userCountResult.count ?? 0 },
    { label: "Total Orgs", value: orgCountResult.count ?? 0 },
    { label: "Grants in Library", value: grantCountResult.count ?? 0 },
    { label: "Pipeline Items", value: pipelineCountResult.count ?? 0 },
    {
      label: "Signups This Week",
      value: signupsWeekResult.count ?? 0,
      description: `${signupsMonthResult.count ?? 0} this month`,
    },
  ];

  const pendingCorrections = (pendingCorrectionsResult.data ?? []) as Array<{
    id: string;
    grant_id: string;
    field_name: string;
    suggested_value: string | null;
    created_at: string;
    user_id: string;
    grant_sources: { name?: string } | null;
  }>;

  // ── Agent activity aggregates (7-day) ─────────────────────────────────
  const spend7dCents = (aiGenerations7d.data ?? []).reduce(
    (acc, r) => acc + ((r.estimated_cost_cents as number | null) ?? 0),
    0
  );
  const outcomeRows = outcomes7d.data ?? [];
  const awardedCount = outcomeRows.filter((o) => o.outcome === "awarded").length;
  const declinedCount = outcomeRows.filter((o) => o.outcome === "declined").length;

  const auditRows = sectionAudits7d.data ?? [];
  const auditBlocked = auditRows.filter((a) => a.verdict === "blocked").length;
  const auditFlagged = auditRows.filter((a) => a.verdict === "flagged").length;

  const triageRows = triage7d.data ?? [];
  const triageOpenCritical = triageRows.filter(
    (t) => t.status === "open" && (t.severity === "critical" || t.severity === "high")
  ).length;

  const ticketRows = tickets7d.data ?? [];
  const ticketsUrgentOpen = ticketRows.filter(
    (t) => t.status === "open" && t.urgency === "urgent"
  ).length;

  // Per-row agent summary with label, headline metric, link, and "needs attention" flag
  type AgentRow = {
    label: string;
    icon: string;
    metric: string;
    detail: string;
    attention: boolean;
    href: string;
  };

  const agentRows: AgentRow[] = [
    {
      label: "Cost Watchdog",
      icon: "⚙",
      metric: `$${(spend7dCents / 100).toFixed(2)}`,
      detail: `${activeAlerts.count ?? 0} open alert${activeAlerts.count === 1 ? "" : "s"} · 7d spend`,
      attention: (activeAlerts.count ?? 0) > 0,
      href: "/admin/agents#cost-watchdog",
    },
    {
      label: "Grant Verifier",
      icon: "🔍",
      metric: String(verifierFlagged.count ?? 0),
      detail: "grants flagged for manual review",
      attention: (verifierFlagged.count ?? 0) > 0,
      href: "/admin/agents#grant-verifier",
    },
    {
      label: "Match Critic",
      icon: "🎯",
      metric: String(matchKills7d.count ?? 0),
      detail: "false-positive matches killed · 7d",
      attention: false,
      href: "/admin/agents#match-critic",
    },
    {
      label: "Compliance Builder",
      icon: "📅",
      metric: String(autoComplianceEvents7d.count ?? 0),
      detail: "obligations auto-generated · 7d",
      attention: false,
      href: "/admin/agents#compliance",
    },
    {
      label: "Outcome Learner",
      icon: "🧠",
      metric: `${awardedCount}W / ${declinedCount}L`,
      detail: `${funderLearningsTotal.count ?? 0} total learnings`,
      attention: false,
      href: "/admin/agents#outcome-learner",
    },
    {
      label: "Hallucination Auditor",
      icon: "🛡",
      metric: `${auditRows.length - auditBlocked - auditFlagged} clean`,
      detail: `${auditBlocked} blocked · ${auditFlagged} flagged · 7d`,
      attention: auditBlocked > 0,
      href: "/admin/agents#auditor",
    },
    {
      label: "Quality Scorer",
      icon: "📊",
      metric: String(qualityScores7d.count ?? 0),
      detail: "drafts scored · 7d",
      attention: false,
      href: "/admin/agents#scorer",
    },
    {
      label: "Sentry Triage",
      icon: "🚨",
      metric: String(triageOpenCritical),
      detail: `open critical/high · ${triageRows.length} total 7d`,
      attention: triageOpenCritical > 0,
      href: "/admin/agents#sentry",
    },
    {
      label: "Support Triage",
      icon: "💬",
      metric: String(ticketsUrgentOpen),
      detail: `open urgent · ${ticketRows.length} total 7d`,
      attention: ticketsUrgentOpen > 0,
      href: "/admin/agents#support",
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl px-4 md:px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform overview for {ADMIN_EMAIL}</p>
      </div>

      {/* Key metrics */}
      <AdminStats stats={topStats} />

      {/* Agent activity — all 9 live agents with headline metric + attention flag */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Agent Activity</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              7-day rolling. Red dot = needs attention.
            </p>
          </div>
          <Link
            href="/admin/agents"
            className="text-xs font-medium text-[var(--color-brand-teal-text)] hover:underline"
          >
            Open agent dashboards →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {agentRows.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-[var(--color-brand-teal)]/40 transition-colors"
              >
                <span className="text-xl shrink-0">{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-warm-900 dark:text-warm-50 truncate">
                      {a.label}
                    </p>
                    {a.attention && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0"
                        title="Needs attention"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-warm-900 dark:text-warm-50 shrink-0">
                  {a.metric}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue summary */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Summary — Subscriptions by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(tierCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscription data.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {(["free", "starter", "pro", "growth", "enterprise"] as const).map((tier) => {
                const count = tierCounts[tier] ?? 0;
                if (count === 0) return null;
                return (
                  <div
                    key={tier}
                    className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-5 py-3 min-w-[90px]"
                  >
                    <span className="text-xl font-bold text-warm-900 dark:text-warm-50">{count}</span>
                    <span className="mt-1 text-xs font-medium text-muted-foreground capitalize">{tier}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending corrections preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pending Corrections</CardTitle>
          <Link
            href="/admin/corrections"
            className="text-xs font-medium text-[var(--color-brand-teal-text)] hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {pendingCorrections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending corrections.</p>
          ) : (
            <ul className="space-y-2">
              {pendingCorrections.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-warm-900 dark:text-warm-50 truncate">
                      {c.grant_sources?.name ?? c.grant_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Field: <span className="font-mono">{c.field_name}</span>
                    </p>
                    <p className="text-xs text-[var(--color-brand-teal-text)] truncate">
                      Suggestion: {c.suggested_value}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-border bg-card px-5 py-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-md hover:border-[var(--color-brand-teal)]/40"
            >
              <p className="font-medium text-warm-900 dark:text-warm-50 group-hover:text-[var(--color-brand-teal-text)] transition-colors">
                {link.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
