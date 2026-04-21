// Unified admin surface for all GrantAQ agents.
//
// Add a new agent section here instead of creating a new admin page —
// keeps navigation clean as more agents ship.
//
// Covers all 12 agents from the roadmap:
//   #1  Cost Watchdog           (cost_watchdog_alerts, ai_generations)
//   #2  Grant Data Verifier     (grant_verification_log, grant_sources)
//   #3  Funder Match Critic     (match_kills)
//   #4  Compliance Calendar     (compliance_events auto_generated)
//   #5  Outcome Learning        (org_funder_history, funder_learnings)
//   #6  Onboarding Coach        (deferred post-PMF)
//   #7  Hallucination Auditor   (section_audits)
//   #8  Quality Scorer          (draft_quality_scores)
//   #9  RLS Sweep               (GitHub Action, no table)
//   #10 Sentry Triage           (error_triage_events)
//   #11 Smoke Test              (GitHub Action, no table)
//   #12 Support Triage          (support_tickets)

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AlertsTable } from "@/components/admin/alerts-table";
import { VerifierReviewQueue } from "@/components/admin/verifier-review-queue";

export const dynamic = "force-dynamic";

function fmtDollars(cents: number | null): string {
  if (!cents) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function AgentsAdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  // ── All queries in parallel ────────────────────────────────────────────
  const [
    // Cost Watchdog — last 24h + 7d spend
    spend24h,
    spend7d,
    recentAlerts,
    // Grant Verifier
    recentRuns,
    flaggedGrants,
    // Match Critic (#3)
    matchKills7d,
    // Compliance Calendar Builder (#4)
    autoComplianceEvents7d,
    // Outcome Learner (#5)
    orgFunderHistory7d,
    funderLearningsTotal,
    // Hallucination Auditor (#7)
    sectionAudits7d,
    // Quality Scorer (#8)
    qualityScores7d,
    // Sentry Triage (#10)
    triageEvents7d,
    // Support Triage (#12)
    supportTickets7d,
  ] = await Promise.all([
    admin
      .from("ai_generations")
      .select("estimated_cost_cents, generation_type")
      .gte("created_at", twentyFourHoursAgo),

    admin
      .from("ai_generations")
      .select("estimated_cost_cents")
      .gte("created_at", sevenDaysAgo),

    admin
      .from("cost_watchdog_alerts")
      .select("id, alert_type, org_id, severity, message, metadata, created_at, resolved_at")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(25),

    admin
      .from("grant_verification_log")
      .select("run_id, action_taken, checked_at")
      .gte("checked_at", sevenDaysAgo),

    admin
      .from("grant_sources")
      .select("id, name, funder_name, url, manual_review_flag, manual_review_reason, last_verified")
      .eq("manual_review_flag", true)
      .order("last_verified", { ascending: false })
      .limit(50),

    admin
      .from("match_kills")
      .select("kill_reason, overridden_by_user, created_at")
      .gte("created_at", sevenDaysAgo),

    admin
      .from("compliance_events")
      .select("id, created_at")
      .eq("auto_generated", true)
      .gte("created_at", sevenDaysAgo),

    admin
      .from("org_funder_history")
      .select("outcome, created_at")
      .gte("created_at", sevenDaysAgo),

    admin
      .from("funder_learnings")
      .select("*", { count: "exact", head: true }),

    admin
      .from("section_audits")
      .select("verdict, claims_ungrounded, created_at")
      .gte("created_at", sevenDaysAgo),

    admin
      .from("draft_quality_scores")
      .select("verdict, total_score, created_at")
      .gte("created_at", sevenDaysAgo),

    admin
      .from("error_triage_events")
      .select("severity, category, status, created_at")
      .gte("created_at", sevenDaysAgo),

    admin
      .from("support_tickets")
      .select("intent, urgency, status, created_at")
      .gte("created_at", sevenDaysAgo),
  ]);

  // ── Aggregate derived stats ────────────────────────────────────────────
  const spend24hTotal = (spend24h.data ?? []).reduce(
    (acc, r) => acc + (r.estimated_cost_cents ?? 0),
    0
  );
  const spend7dTotal = (spend7d.data ?? []).reduce(
    (acc, r) => acc + (r.estimated_cost_cents ?? 0),
    0
  );

  // Per-action breakdown for the 24h window
  const actionBreakdown: Record<string, { cents: number; calls: number }> = {};
  for (const r of spend24h.data ?? []) {
    const a = (r.generation_type as string) ?? "unknown";
    if (!actionBreakdown[a]) actionBreakdown[a] = { cents: 0, calls: 0 };
    actionBreakdown[a].cents += r.estimated_cost_cents ?? 0;
    actionBreakdown[a].calls += 1;
  }
  const topActions = Object.entries(actionBreakdown)
    .map(([action, v]) => ({ action, ...v }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 5);

  // Verifier run stats: group the log by run_id for the latest runs
  const runsMap = new Map<string, {
    run_id: string;
    checked_at: string;
    total: number;
    archived: number;
    url_flagged: number;
    funder_flagged: number;
    multi_flagged: number;
    no_change: number;
  }>();
  for (const row of recentRuns.data ?? []) {
    const id = row.run_id as string;
    let entry = runsMap.get(id);
    if (!entry) {
      entry = {
        run_id: id,
        checked_at: row.checked_at as string,
        total: 0,
        archived: 0,
        url_flagged: 0,
        funder_flagged: 0,
        multi_flagged: 0,
        no_change: 0,
      };
      runsMap.set(id, entry);
    }
    entry.total += 1;
    const action = row.action_taken as keyof typeof entry;
    if (action in entry) {
      (entry[action] as number) += 1;
    }
    // Track most recent timestamp across all rows for this run
    if ((row.checked_at as string) > entry.checked_at) {
      entry.checked_at = row.checked_at as string;
    }
  }
  const runs = Array.from(runsMap.values())
    .sort((a, b) => (a.checked_at > b.checked_at ? -1 : 1))
    .slice(0, 14);

  const flagged = (flaggedGrants.data ?? []) as Array<{
    id: string;
    name: string;
    funder_name: string;
    url: string | null;
    manual_review_flag: boolean;
    manual_review_reason: string | null;
    last_verified: string | null;
  }>;

  // ── Aggregate 7d activity per new agent ─────────────────────────────────
  const kills = matchKills7d.data ?? [];
  const killsByReason: Record<string, number> = {};
  let killsOverridden = 0;
  for (const k of kills) {
    const r = (k.kill_reason as string) ?? "other";
    killsByReason[r] = (killsByReason[r] ?? 0) + 1;
    if (k.overridden_by_user) killsOverridden += 1;
  }

  const complianceEventsCount = (autoComplianceEvents7d.data ?? []).length;

  const outcomes = orgFunderHistory7d.data ?? [];
  const awardedCount = outcomes.filter((o) => o.outcome === "awarded").length;
  const declinedCount = outcomes.filter((o) => o.outcome === "declined").length;
  const withdrawnCount = outcomes.filter((o) => o.outcome === "withdrawn").length;
  const funderLearningsCount = funderLearningsTotal.count ?? 0;

  const audits = sectionAudits7d.data ?? [];
  const auditClean = audits.filter((a) => a.verdict === "clean").length;
  const auditFlagged = audits.filter((a) => a.verdict === "flagged").length;
  const auditBlocked = audits.filter((a) => a.verdict === "blocked").length;
  const auditUnaudited = audits.filter((a) => a.verdict === "unaudited").length;

  const scores = qualityScores7d.data ?? [];
  const scoresTotal = scores.length;
  const scoresSubmittable = scores.filter((s) => s.verdict === "submittable").length;
  const avgScore =
    scoresTotal > 0
      ? Math.round(
          scores.reduce((a, s) => a + (s.total_score as number), 0) / scoresTotal
        )
      : 0;

  const triage = triageEvents7d.data ?? [];
  const triageBySeverity: Record<string, number> = {};
  const triageOpen = triage.filter((t) => t.status === "open").length;
  for (const t of triage) {
    const s = (t.severity as string) ?? "unknown";
    triageBySeverity[s] = (triageBySeverity[s] ?? 0) + 1;
  }

  const tickets = supportTickets7d.data ?? [];
  const ticketsOpen = tickets.filter((t) => t.status === "open").length;
  const ticketsUrgent = tickets.filter((t) => t.urgency === "urgent").length;
  const ticketsByIntent: Record<string, number> = {};
  for (const t of tickets) {
    const i = (t.intent as string) ?? "other";
    ticketsByIntent[i] = (ticketsByIntent[i] ?? 0) + 1;
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10 max-w-6xl px-4 md:px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Health + review surfaces for every automated agent in the platform.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: COST WATCHDOG
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙</span>
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Cost Watchdog</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Hourly · sources: ai_generations, cost_watchdog_alerts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last 24h</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {fmtDollars(spend24hTotal)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {(spend24h.data ?? []).length.toLocaleString()} AI calls
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last 7d</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {fmtDollars(spend7dTotal)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {(spend7d.data ?? []).length.toLocaleString()} AI calls
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active alerts</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {(recentAlerts.data ?? []).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                unresolved (auto-close at 24h)
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend by action type — last 24h</CardTitle>
          </CardHeader>
          <CardContent>
            {topActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI activity in the last 24 hours.</p>
            ) : (
              <div className="space-y-2">
                {topActions.map((row) => (
                  <div
                    key={row.action}
                    className="flex items-center justify-between border-b border-border py-2 last:border-0"
                  >
                    <span className="font-mono text-sm text-warm-900 dark:text-warm-50">
                      {row.action}
                    </span>
                    <div className="flex gap-6 text-sm tabular-nums">
                      <span className="text-muted-foreground">{row.calls} calls</span>
                      <span className="font-medium text-warm-900 dark:text-warm-50 w-24 text-right">
                        {fmtDollars(row.cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active alerts</CardTitle>
            <CardDescription>
              Click &quot;Resolve&quot; to clear. Auto-resolve sweeps alerts older than 24h.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertsTable
              alerts={(recentAlerts.data ?? []).map((a) => ({
                id: a.id as string,
                alert_type: a.alert_type as string,
                org_id: (a.org_id as string | null) ?? null,
                severity: a.severity as "info" | "warning" | "critical",
                message: a.message as string,
                metadata: (a.metadata as Record<string, unknown>) ?? {},
                created_at: a.created_at as string,
                ago: fmtAgo(a.created_at as string),
              }))}
            />
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: GRANT DATA VERIFIER
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Grant Data Verifier</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Nightly · sources: grant_verification_log, grant_sources
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Grants flagged for review</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {flagged.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">pending manual resolve</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last run</CardDescription>
              <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50">
                {runs[0] ? fmtAgo(runs[0].checked_at) : "never"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {runs[0] ? `${runs[0].total} grants checked` : "No runs yet"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Archived in last 7d</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {runs.reduce((acc, r) => acc + r.archived, 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">expired one-time grants</p>
            </CardContent>
          </Card>
        </div>

        {runs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left py-2 font-medium">When</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-right py-2 font-medium">No change</th>
                      <th className="text-right py-2 font-medium">Archived</th>
                      <th className="text-right py-2 font-medium">URL flag</th>
                      <th className="text-right py-2 font-medium">Funder flag</th>
                      <th className="text-right py-2 font-medium">Multi flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.run_id} className="border-b border-border last:border-0">
                        <td className="py-2">{fmtAgo(r.checked_at)}</td>
                        <td className="py-2 text-right tabular-nums">{r.total}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {r.no_change}
                        </td>
                        <td className="py-2 text-right tabular-nums">{r.archived}</td>
                        <td className="py-2 text-right tabular-nums">{r.url_flagged}</td>
                        <td className="py-2 text-right tabular-nums">{r.funder_flagged}</td>
                        <td className="py-2 text-right tabular-nums">{r.multi_flagged}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review queue</CardTitle>
            <CardDescription>
              Grants flagged by the verifier. Resolve by clearing the flag, archiving manually, or
              suppressing future verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerifierReviewQueue flagged={flagged} />
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: FUNDER MATCH CRITIC (#3)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Funder Match Critic</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Per-match · source: match_kills
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Matches killed (7d)</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {kills.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">false-positive filter</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>User overrides (7d)</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {killsOverridden}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                signals critic was wrong
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Top kill reason</CardDescription>
              <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50">
                {Object.entries(killsByReason).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {Object.entries(killsByReason).sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0} kills
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: HALLUCINATION AUDITOR (#7)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡</span>
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Hallucination Auditor</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Per-section · source: section_audits
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Clean (7d)</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {auditClean}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Flagged</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600">
                {auditFlagged}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Blocked</CardDescription>
              <CardTitle className="text-3xl font-bold text-destructive">
                {auditBlocked}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Fail-open</CardDescription>
              <CardTitle className="text-3xl font-bold text-muted-foreground">
                {auditUnaudited}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: QUALITY SCORER (#8)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Quality Scorer</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Per-draft · source: draft_quality_scores
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Drafts scored (7d)</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {scoresTotal}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg score</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {avgScore}<span className="text-base font-normal text-muted-foreground">/100</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Submittable</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {scoresSubmittable}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                of {scoresTotal} scored
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: COMPLIANCE CALENDAR BUILDER (#4)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Compliance Calendar Builder</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Per-award · source: compliance_events
          </span>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Obligations auto-generated (7d)</CardDescription>
            <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
              {complianceEventsCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Fires on pipeline transition to &quot;awarded&quot;. Inserts reports,
              audits, renewals from RFP text.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: OUTCOME LEARNING AGENT (#5)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Outcome Learning Agent</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Per-outcome · sources: org_funder_history, funder_learnings
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Awarded (7d)</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {awardedCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Declined (7d)</CardDescription>
              <CardTitle className="text-3xl font-bold text-destructive">
                {declinedCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Withdrawn (7d)</CardDescription>
              <CardTitle className="text-3xl font-bold text-muted-foreground">
                {withdrawnCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total learnings</CardDescription>
              <CardTitle className="text-3xl font-bold text-[var(--color-brand-teal)]">
                {funderLearningsCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">compounds over time</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: SENTRY TRIAGE (#10)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚨</span>
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Sentry Triage</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Per-error · source: error_triage_events
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Events (7d)</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {triage.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Open</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {triageOpen}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Critical</CardDescription>
              <CardTitle className="text-3xl font-bold text-destructive">
                {triageBySeverity.critical ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>High</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600">
                {triageBySeverity.high ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        {triage.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No events yet. Triage fires when Sentry webhook is wired to
            /api/triage/sentry with SENTRY_WEBHOOK_SECRET header.
          </p>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: SUPPORT TRIAGE (#12)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Support Triage</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            Per-ticket · source: support_tickets
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tickets (7d)</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {tickets.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Open</CardDescription>
              <CardTitle className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {ticketsOpen}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Urgent</CardDescription>
              <CardTitle className="text-3xl font-bold text-destructive">
                {ticketsUrgent}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Top intent</CardDescription>
              <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50">
                {Object.entries(ticketsByIntent).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {Object.entries(ticketsByIntent).sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0} tickets
              </p>
            </CardContent>
          </Card>
        </div>
        {tickets.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No tickets yet. Triage fires when inbound forwarder posts to
            /api/triage/support with SUPPORT_WEBHOOK_SECRET header.
          </p>
        )}
      </section>

      {/* Background workstream agents (no dashboard card — ambient) */}
      <section className="text-sm text-muted-foreground border-t border-border pt-4">
        <p className="font-semibold text-warm-700 dark:text-warm-300 mb-1">
          Also live (no dashboard — runs ambiently):
        </p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>RLS Sweep (#9) — GitHub Action, fails CI on cross-org data leaks</li>
          <li>Smoke Test (#11) — GitHub Action, full-path signal on every deploy</li>
          <li>Onboarding Coach (#6) — deferred post-PMF</li>
        </ul>
      </section>
    </div>
  );
}
