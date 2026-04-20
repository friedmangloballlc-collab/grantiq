// Unified admin surface for all GrantIQ agents.
//
// Add a new agent section here instead of creating a new admin page —
// keeps navigation clean as more agents ship.
//
// Currently covers:
//   - Cost Watchdog (docs/plans/2026-04-20-001)
//   - Grant Data Verifier (docs/plans/2026-04-20-005)
//
// Future sections will be added for:
//   - RFP Hallucination Auditor (when shipped — reads section_audits)
//   - Funder Match Critic (when shipped — reads match_kills)
//   - Application Quality Scorer (when shipped — reads draft_quality_scores)

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
  ] = await Promise.all([
    admin
      .from("ai_generations")
      .select("cost_cents, generation_type")
      .gte("created_at", twentyFourHoursAgo),

    admin
      .from("ai_generations")
      .select("cost_cents")
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
  ]);

  // ── Aggregate derived stats ────────────────────────────────────────────
  const spend24hTotal = (spend24h.data ?? []).reduce(
    (acc, r) => acc + (r.cost_cents ?? 0),
    0
  );
  const spend7dTotal = (spend7d.data ?? []).reduce(
    (acc, r) => acc + (r.cost_cents ?? 0),
    0
  );

  // Per-action breakdown for the 24h window
  const actionBreakdown: Record<string, { cents: number; calls: number }> = {};
  for (const r of spend24h.data ?? []) {
    const a = (r.generation_type as string) ?? "unknown";
    if (!actionBreakdown[a]) actionBreakdown[a] = { cents: 0, calls: 0 };
    actionBreakdown[a].cents += r.cost_cents ?? 0;
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

      {/* Placeholder for future agent sections */}
      <section className="text-sm text-muted-foreground border-t border-border pt-4">
        Future agents will add their own sections here as they ship:
        Hallucination Auditor · Match Critic · Quality Scorer · Compliance Calendar · Support Triage.
      </section>
    </div>
  );
}
