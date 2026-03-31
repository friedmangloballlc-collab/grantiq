import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { analyzeWinLoss } from "@/lib/analytics/win-loss";
import Link from "next/link";
import { Lock, FileText, BarChart2, Users } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { PrintButton } from "@/components/shared/print-button";

// ---- Helper formatters ----
function fmt$(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number): string {
  return `${n}%`;
}

// ---- Print styles (injected via <style> for @media print) ----
const PRINT_STYLES = `
@media print {
  .no-print { display: none !important; }
  .print-break-before { page-break-before: always; }
  body { font-family: Georgia, serif; color: #111; background: white; }
  .report-card { border: 1px solid #ccc !important; border-radius: 4px !important; padding: 16px !important; margin-bottom: 16px; }
  h1, h2, h3 { color: #111; }
}
`;

export default async function ReportsPage() {
  const ctx = await getOrgContext();

  const tier = ctx?.tier ?? "free";
  const canAccess = tier === "applicant" || tier === "growth" || tier === "enterprise";

  if (!canAccess) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Reports</h1>
          <p className="text-sm text-warm-500 mt-1">
            Pre-built reporting templates for boards, funders, and internal review.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-900/50 py-20 px-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warm-200 dark:bg-warm-800">
            <Lock className="h-6 w-6 text-warm-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50">
              Reports require Applicant plan
            </h2>
            <p className="mt-1 text-sm text-warm-500 max-w-sm">
              Generate board-ready reports, monthly activity summaries, and funder relationship overviews.
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
  let pipelineData: { stage: string; count: number }[] = [];
  let matchCount = 0;
  const now = new Date();
  const currentMonth = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  if (ctx) {
    const admin = createAdminClient();
    try {
      analysis = await analyzeWinLoss(ctx.orgId, admin);
    } catch {
      analysis = null;
    }

    try {
      // Pipeline stage counts
      const { data: pipeline } = await admin
        .from("grant_pipeline")
        .select("stage")
        .eq("org_id", ctx.orgId);

      const stageCounts: Record<string, number> = {};
      for (const row of pipeline ?? []) {
        const s = (row.stage as string) ?? "Unknown";
        stageCounts[s] = (stageCounts[s] ?? 0) + 1;
      }
      pipelineData = Object.entries(stageCounts).map(([stage, count]) => ({ stage, count }));

      const { count } = await admin
        .from("grant_matches")
        .select("id", { count: "exact", head: true })
        .eq("org_id", ctx.orgId);
      matchCount = count ?? 0;
    } catch {
      // silently ignore
    }
  }

  const orgName = ctx?.orgName ?? "Your Organization";
  const totalPipeline = pipelineData.reduce((s, r) => s + r.count, 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <div className="space-y-8 max-w-5xl">
        {/* Page header */}
        <div className="no-print">
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Reports</h1>
          <p className="text-sm text-warm-500 mt-1">
            Pre-built templates. Use your browser&apos;s Print function (Ctrl/Cmd + P) to print or save as PDF.
          </p>
        </div>

        {/* Template selector (no-print) */}
        <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              id: "board",
              icon: FileText,
              label: "Board Report",
              desc: "Executive summary for board presentations",
              anchor: "#report-board",
            },
            {
              id: "monthly",
              icon: BarChart2,
              label: "Monthly Activity Report",
              desc: "Detailed metrics for the current month",
              anchor: "#report-monthly",
            },
            {
              id: "funder",
              icon: Users,
              label: "Funder Relationship Report",
              desc: "Status of all active funder relationships",
              anchor: "#report-funder",
            },
          ].map((t) => (
            <a
              key={t.id}
              href={t.anchor}
              className="flex flex-col gap-2 rounded-xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-900 p-4 hover:border-[var(--color-brand-teal)] transition-colors"
            >
              <t.icon className="h-5 w-5 text-[var(--color-brand-teal)]" />
              <p className="text-sm font-semibold text-warm-800 dark:text-warm-100">{t.label}</p>
              <p className="text-xs text-warm-500">{t.desc}</p>
            </a>
          ))}
        </div>

        {/* ===== BOARD REPORT ===== */}
        <section id="report-board" className="space-y-4">
          <div className="flex items-center justify-between no-print">
            <h2 className="text-lg font-bold text-warm-800 dark:text-warm-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-warm-400" />
              Board Report
            </h2>
            <div className="flex gap-2">
              <ExportButton type="analytics" label="Export Data" size="sm" />
              <PrintButton />
            </div>
          </div>

          <div className="report-card rounded-xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-900 p-6 space-y-6">
            {/* Header */}
            <div className="border-b border-warm-100 dark:border-warm-800 pb-4">
              <p className="text-xs uppercase tracking-wider text-warm-400 mb-1">Prepared for Board Review</p>
              <h3 className="text-xl font-bold text-warm-900 dark:text-warm-50">{orgName}</h3>
              <p className="text-sm text-warm-500">Grant Activity Report — {currentMonth}</p>
            </div>

            {/* Executive Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                Executive Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Grants Identified", value: matchCount.toLocaleString() },
                  { label: "Active Pipeline", value: totalPipeline.toLocaleString() },
                  { label: "Total Submitted", value: (analysis?.totalSubmitted ?? 0).toLocaleString() },
                  { label: "Total Awarded", value: analysis?.totalAwarded ? fmt$(analysis.totalAwarded) : "$0" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{s.value}</p>
                    <p className="text-xs text-warm-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Grant Outcomes */}
            {analysis && analysis.totalSubmitted > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                  Grant Outcomes
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-warm-100 dark:border-warm-800">
                        <th className="text-left py-2 pr-4 text-xs text-warm-500 font-medium">Metric</th>
                        <th className="text-right py-2 text-xs text-warm-500 font-medium">Value</th>
                        <th className="text-right py-2 pl-4 text-xs text-warm-500 font-medium">Benchmark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-50 dark:divide-warm-800">
                      <tr>
                        <td className="py-2 pr-4 text-warm-700 dark:text-warm-300">Win Rate</td>
                        <td className="py-2 text-right font-semibold text-warm-900 dark:text-warm-50">{fmtPct(analysis.winRate)}</td>
                        <td className="py-2 pl-4 text-right text-warm-400">22% avg</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-warm-700 dark:text-warm-300">Total Won</td>
                        <td className="py-2 text-right font-semibold text-warm-900 dark:text-warm-50">{analysis.totalWon} of {analysis.totalSubmitted}</td>
                        <td className="py-2 pl-4 text-right text-warm-400">—</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-warm-700 dark:text-warm-300">Avg Award</td>
                        <td className="py-2 text-right font-semibold text-warm-900 dark:text-warm-50">{analysis.avgAwardAmount > 0 ? fmt$(analysis.avgAwardAmount) : "—"}</td>
                        <td className="py-2 pl-4 text-right text-warm-400">—</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-warm-700 dark:text-warm-300">Cumulative Awarded</td>
                        <td className="py-2 text-right font-semibold text-warm-900 dark:text-warm-50">{analysis.totalAwarded > 0 ? fmt$(analysis.totalAwarded) : "—"}</td>
                        <td className="py-2 pl-4 text-right text-warm-400">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pipeline Summary */}
            {pipelineData.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                  Pipeline Status
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-warm-100 dark:border-warm-800">
                        <th className="text-left py-2 pr-4 text-xs text-warm-500 font-medium">Stage</th>
                        <th className="text-right py-2 text-xs text-warm-500 font-medium">Count</th>
                        <th className="text-right py-2 pl-4 text-xs text-warm-500 font-medium">% of Pipeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-50 dark:divide-warm-800">
                      {pipelineData
                        .sort((a, b) => b.count - a.count)
                        .map((row) => (
                          <tr key={row.stage}>
                            <td className="py-2 pr-4 text-warm-700 dark:text-warm-300 capitalize">{row.stage}</td>
                            <td className="py-2 text-right font-semibold text-warm-900 dark:text-warm-50">{row.count}</td>
                            <td className="py-2 pl-4 text-right text-warm-400">
                              {totalPipeline > 0 ? Math.round((row.count / totalPipeline) * 100) : 0}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis && analysis.improvementSuggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                  Strategic Recommendations
                </h4>
                <ul className="space-y-2">
                  {analysis.improvementSuggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-warm-700 dark:text-warm-300">
                      <span className="text-[var(--color-brand-teal)] font-bold mt-0.5">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[10px] text-warm-300 dark:text-warm-600 pt-2 border-t border-warm-100 dark:border-warm-800">
              Generated by GrantIQ · {now.toLocaleDateString("en-US", { dateStyle: "long" })} · Data is org-scoped and confidential.
            </p>
          </div>
        </section>

        {/* ===== MONTHLY ACTIVITY REPORT ===== */}
        <section id="report-monthly" className="space-y-4 print-break-before">
          <div className="flex items-center justify-between no-print">
            <h2 className="text-lg font-bold text-warm-800 dark:text-warm-100 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-warm-400" />
              Monthly Activity Report
            </h2>
            <div className="flex gap-2">
              <ExportButton type="pipeline" label="Export Pipeline" size="sm" />
              <PrintButton />
            </div>
          </div>

          <div className="report-card rounded-xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-900 p-6 space-y-6">
            <div className="border-b border-warm-100 dark:border-warm-800 pb-4">
              <p className="text-xs uppercase tracking-wider text-warm-400 mb-1">Monthly Activity Report</p>
              <h3 className="text-xl font-bold text-warm-900 dark:text-warm-50">{orgName}</h3>
              <p className="text-sm text-warm-500">{currentMonth}</p>
            </div>

            {/* Current month metrics from trend data */}
            {analysis && analysis.monthlyWinRates.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                  Monthly Win Rate Trend
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-warm-100 dark:border-warm-800">
                        <th className="text-left py-2 pr-4 text-xs text-warm-500 font-medium">Month</th>
                        <th className="text-right py-2 text-xs text-warm-500 font-medium">Submitted</th>
                        <th className="text-right py-2 pl-4 text-xs text-warm-500 font-medium">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-50 dark:divide-warm-800">
                      {analysis.monthlyWinRates
                        .slice(-6)
                        .map((row) => (
                          <tr key={row.month}>
                            <td className="py-2 pr-4 text-warm-700 dark:text-warm-300">{row.month}</td>
                            <td className="py-2 text-right text-warm-900 dark:text-warm-50">{row.submitted}</td>
                            <td className="py-2 pl-4 text-right font-semibold text-warm-900 dark:text-warm-50">
                              {fmtPct(row.winRate)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-warm-400 text-center py-4">
                No monthly activity data yet. Submit grants and log outcomes to populate this report.
              </p>
            )}

            {/* Grant type breakdown */}
            {analysis && analysis.winRateByType.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                  Performance by Grant Type
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-warm-100 dark:border-warm-800">
                        <th className="text-left py-2 pr-4 text-xs text-warm-500 font-medium">Type</th>
                        <th className="text-right py-2 text-xs text-warm-500 font-medium">Won</th>
                        <th className="text-right py-2 text-xs text-warm-500 font-medium">Total</th>
                        <th className="text-right py-2 pl-4 text-xs text-warm-500 font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-50 dark:divide-warm-800">
                      {analysis.winRateByType.map((row) => (
                        <tr key={row.type}>
                          <td className="py-2 pr-4 text-warm-700 dark:text-warm-300">{row.type}</td>
                          <td className="py-2 text-right text-warm-900 dark:text-warm-50">{row.won}</td>
                          <td className="py-2 text-right text-warm-900 dark:text-warm-50">{row.total}</td>
                          <td className="py-2 pl-4 text-right font-semibold text-warm-900 dark:text-warm-50">
                            {fmtPct(row.rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-[10px] text-warm-300 dark:text-warm-600 pt-2 border-t border-warm-100 dark:border-warm-800">
              Generated by GrantIQ · {now.toLocaleDateString("en-US", { dateStyle: "long" })}
            </p>
          </div>
        </section>

        {/* ===== FUNDER RELATIONSHIP REPORT ===== */}
        <section id="report-funder" className="space-y-4 print-break-before">
          <div className="flex items-center justify-between no-print">
            <h2 className="text-lg font-bold text-warm-800 dark:text-warm-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-warm-400" />
              Funder Relationship Report
            </h2>
            <div className="flex gap-2">
              <ExportButton type="pipeline" label="Export Pipeline" size="sm" />
              <PrintButton />
            </div>
          </div>

          <div className="report-card rounded-xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-900 p-6 space-y-6">
            <div className="border-b border-warm-100 dark:border-warm-800 pb-4">
              <p className="text-xs uppercase tracking-wider text-warm-400 mb-1">Funder Relationship Report</p>
              <h3 className="text-xl font-bold text-warm-900 dark:text-warm-50">{orgName}</h3>
              <p className="text-sm text-warm-500">{currentMonth}</p>
            </div>

            {/* Win rate by type as funder proxy */}
            {analysis && analysis.winRateByType.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                  Relationship Summary by Funder Type
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-warm-100 dark:border-warm-800">
                        <th className="text-left py-2 pr-4 text-xs text-warm-500 font-medium">Funder Type</th>
                        <th className="text-right py-2 text-xs text-warm-500 font-medium">Applications</th>
                        <th className="text-right py-2 text-xs text-warm-500 font-medium">Awards</th>
                        <th className="text-right py-2 pl-4 text-xs text-warm-500 font-medium">Relationship Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-50 dark:divide-warm-800">
                      {analysis.winRateByType.map((row) => {
                        const health =
                          row.rate >= 30
                            ? { label: "Strong", color: "#22c55e" }
                            : row.rate >= 15
                            ? { label: "Growing", color: "#f59e0b" }
                            : { label: "Early Stage", color: "#9ca3af" };
                        return (
                          <tr key={row.type}>
                            <td className="py-2 pr-4 text-warm-700 dark:text-warm-300">{row.type}</td>
                            <td className="py-2 text-right text-warm-900 dark:text-warm-50">{row.total}</td>
                            <td className="py-2 text-right text-warm-900 dark:text-warm-50">{row.won}</td>
                            <td className="py-2 pl-4 text-right">
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ color: health.color, backgroundColor: health.color + "18" }}
                              >
                                {health.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-warm-400 text-center py-4">
                No funder relationship data yet. Log grant outcomes to see relationship health by funder type.
              </p>
            )}

            {/* Rejection pattern insights */}
            {analysis && analysis.topRejectionReasons.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider">
                  Common Rejection Patterns
                </h4>
                <div className="space-y-2">
                  {analysis.topRejectionReasons.map((r) => (
                    <div key={r.reason} className="flex items-center justify-between text-sm">
                      <span className="text-warm-700 dark:text-warm-300">{r.reason}</span>
                      <span className="font-semibold text-warm-900 dark:text-warm-50">
                        {r.count} {r.count === 1 ? "time" : "times"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-warm-300 dark:text-warm-600 pt-2 border-t border-warm-100 dark:border-warm-800">
              Generated by GrantIQ · {now.toLocaleDateString("en-US", { dateStyle: "long" })}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
