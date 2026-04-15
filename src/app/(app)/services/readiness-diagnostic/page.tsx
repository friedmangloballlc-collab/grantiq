"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileSearch,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Shield,
  Target,
  BarChart3,
  FileText,
  Users,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IntakeForm, type IntakeData } from "@/components/services/intake-form";

interface AuditItem {
  item: string; status: string; gap: string; remediation: string; time: string; cost: string;
  what_to_do?: string; where_to_do_it?: string; who_does_it?: string;
  dependencies?: string; risk_of_skipping?: string; our_firm_covers?: string;
}

interface DiagnosticReport {
  executive_summary: {
    verdict: string;
    readiness_score: number;
    competitive_score: number;
    controls_score: number;
    audit_readiness_score: number;
    confidence: string;
    addressable_universe: { low: number; high: number; program_count: number };
    summary: string;
  };
  quick_wins: Array<{ action: string; where: string; time: string; cost: string }>;
  red_flags: Array<{ flag: string; blocked_categories: string[]; remediation: string; severity: string; what_to_do?: string; where_to_do_it?: string; who_does_it?: string; estimated_time?: string; estimated_cost?: string; dependencies?: string; risk_of_skipping?: string; our_firm_covers?: string }>;
  first_timer_reality_check: {
    track_record: string;
    operating_history: string;
    win_rate: string;
    timeline: string;
  };
  eligibility_by_category: Array<{ category: string; status: string; reason: string; path_to_yes?: string }>;
  demographic_eligibility: Record<string, string>;
  layered_audit: {
    layer1_universal: Array<AuditItem>;
    layer2_federal: Array<AuditItem>;
    layer3_nonprofit: Array<AuditItem>;
    layer4_forprofit: Array<AuditItem>;
    layer5_programmatic: Array<AuditItem>;
  };
  controls_assessment: Array<{ component: string; rating: number; findings: string }>;
  site_visit_simulation: Array<{ document: string; status: string; gap: string }>;
  funder_matches: Array<{ rank: number; funder: string; fit_score: number; award_range: string; cycle: string; first_timer_friendly: string; rationale: string }>;
  remediation_roadmap: Array<{ phase: string; actions: Array<{ action: string; owner: string; timeline: string; cost: string; dependency: string }> }>;
  recommended_tier: { tier: number; name: string; justification: string };
  restructuring_options?: Array<{ option: string; what_it_unlocks: string; cost: string; timeline: string; tradeoffs: string }>;
  bootstrap_path?: Array<{ action: string; cost: string; time: string; where: string }>;
  full_report_markdown: string;
}

interface ServiceOrder {
  id: string;
  status: string;
  report_data: DiagnosticReport | null;
  scores: Record<string, number> | null;
  created_at: string;
}

const VERDICT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  eligible_now: { label: "Eligible Now", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  conditionally_eligible: { label: "Conditionally Eligible", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  eligible_after_remediation: { label: "Eligible After Remediation", icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  not_eligible: { label: "Not Eligible in Current Form", icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function ScoreCard({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{score}</div>
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className={cn("h-1.5 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s.includes("ready") || s === "✅") return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Ready</span>;
  if (s.includes("partial") || s === "⚠️") return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Partial</span>;
  if (s.includes("not") || s === "❌") return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Not Ready</span>;
  if (s.includes("available") || s === "🟢") return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Available</span>;
  if (s.includes("produce") || s === "🟡") return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Can Produce</span>;
  if (s.includes("cannot") || s === "🔴") return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Cannot Produce</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{status}</span>;
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left"
      >
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-base font-semibold flex-1">{title}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

export default function ReadinessDiagnosticPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      const res = await fetch("/api/services/orders?type=readiness_diagnostic");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOrders(); }, []);

  async function handleIntakeComplete(intakeData: IntakeData) {
    setGenerating(true);
    setError(null);
    try {
      // Step 1: Save intake data
      const saveRes = await fetch("/api/services/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intakeData),
      });
      if (!saveRes.ok) {
        const saveErr = await saveRes.json();
        setError(saveErr.error ?? "Failed to save intake data");
        return;
      }

      // Step 2: Generate diagnostic
      const res = await fetch("/api/services/readiness-diagnostic/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate diagnostic");
        return;
      }
      await loadOrders();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/services/readiness-diagnostic/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate diagnostic");
        return;
      }
      await loadOrders();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const latestOrder = orders[0];
  const report = latestOrder?.report_data as DiagnosticReport | null;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Grant Eligibility &amp; Readiness Diagnostic
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Comprehensive 10-step diagnostic for first-time grant seekers. Covers legal, financial,
          compliance, internal controls, audit readiness, funder matching, and remediation roadmap.
        </p>
        <p className="text-xs text-muted-foreground mt-2 italic">
          This is a Grant Readiness &amp; Eligibility Diagnostic. It is not a substitute for a
          licensed CPA-performed financial audit, Single Audit, or Form 990 preparation.
        </p>
      </div>

      {/* Intake Form — shown when no report exists */}
      {!report && (
        <div className="mb-8">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <IntakeForm
            serviceType="readiness_diagnostic"
            onComplete={handleIntakeComplete}
            submitting={generating}
          />
        </div>
      )}

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Executive Summary */}
          {report.executive_summary && (() => {
            const es = report.executive_summary;
            const v = VERDICT_CONFIG[es.verdict] ?? VERDICT_CONFIG.not_eligible;
            const VerdictIcon = v.icon;
            return (
              <>
                <div className={cn("rounded-lg p-6", v.bg)}>
                  <div className="flex items-start gap-4 mb-4">
                    <VerdictIcon className={cn("h-8 w-8 shrink-0", v.color)} />
                    <div>
                      <h2 className={cn("text-xl font-bold", v.color)}>{v.label}</h2>
                      <p className="text-sm text-foreground mt-1">{es.summary}</p>
                      <div className="text-xs text-muted-foreground mt-2">
                        Confidence: <span className="font-medium capitalize">{es.confidence}</span>
                        {es.addressable_universe && (
                          <> &middot; Grant Universe: <span className="font-medium">
                            {formatCurrency(es.addressable_universe.low)}–{formatCurrency(es.addressable_universe.high)}
                          </span> across ~{es.addressable_universe.program_count} programs</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 p-4 bg-background/80 rounded-lg">
                    <ScoreCard label="Readiness" score={es.readiness_score} />
                    <ScoreCard label="Competitive" score={es.competitive_score} />
                    <ScoreCard label="Controls" score={es.controls_score} />
                    <ScoreCard label="Audit Ready" score={es.audit_readiness_score} />
                  </div>
                </div>
              </>
            );
          })()}

          {/* Quick Wins */}
          {report.quick_wins?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  Quick Wins (Next 30 Days, Under $500)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.quick_wins.map((qw, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{qw.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {qw.where} &middot; {qw.time} &middot; {qw.cost}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Red Flags */}
          {report.red_flags?.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Risk &amp; Red Flag Screen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.red_flags.map((rf, i) => (
                    <div key={i} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm">{rf.flag}</p>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full shrink-0",
                          rf.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {rf.severity}
                        </span>
                      </div>
                      {rf.blocked_categories?.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Blocks: {rf.blocked_categories.join(", ")}
                        </p>
                      )}
                      {/* Full remediation block */}
                      <div className="mt-2 rounded bg-amber-50 dark:bg-amber-950/20 px-3 py-2 space-y-1 text-xs">
                        {rf.what_to_do && <p><span className="font-medium">What to do:</span> {rf.what_to_do}</p>}
                        {!rf.what_to_do && rf.remediation && <p><span className="font-medium">Fix:</span> {rf.remediation}</p>}
                        {rf.where_to_do_it && <p><span className="font-medium">Where:</span> {rf.where_to_do_it}</p>}
                        {rf.who_does_it && <p><span className="font-medium">Who:</span> {rf.who_does_it}</p>}
                        {(rf.estimated_time || rf.estimated_cost) && (
                          <p>{rf.estimated_time}{rf.estimated_time && rf.estimated_cost ? " · " : ""}{rf.estimated_cost}</p>
                        )}
                        {rf.dependencies && <p><span className="font-medium">Depends on:</span> {rf.dependencies}</p>}
                        {rf.risk_of_skipping && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Risk:</span> {rf.risk_of_skipping}</p>}
                        {rf.our_firm_covers && <p className="font-medium text-brand-teal">We cover this in: {rf.our_firm_covers}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* First-Timer Reality Check */}
          {report.first_timer_reality_check && (
            <Card className="border-blue-200 dark:border-blue-900">
              <CardHeader>
                <CardTitle className="text-base">First-Timer Reality Check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {Object.entries(report.first_timer_reality_check).map(([key, value]) => (
                    <div key={key}>
                      <p className="font-medium capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="text-muted-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Eligibility by Category — with Path to Yes */}
          {report.eligibility_by_category?.length > 0 && (
            <CollapsibleSection title="Grant Eligibility by Category" icon={Shield} defaultOpen>
              <div className="space-y-3">
                {report.eligibility_by_category.map((cat, i) => (
                  <div key={i} className="rounded border border-border p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={cat.status} />
                      <span className="font-medium flex-1">{cat.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{cat.reason}</p>
                    {cat.path_to_yes && cat.status !== "eligible" && (
                      <div className="mt-2 rounded bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Path to Yes: <span className="font-normal">{cat.path_to_yes}</span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Layered Audit */}
          {report.layered_audit && (
            <>
              {[
                { key: "layer1_universal", title: "Layer 1 — Universal Foundation", icon: Shield },
                { key: "layer2_federal", title: "Layer 2 — Federal Grant Layer", icon: FileText },
                { key: "layer3_nonprofit", title: "Layer 3 — Nonprofit Layer", icon: Users },
                { key: "layer4_forprofit", title: "Layer 4 — For-Profit Layer", icon: BarChart3 },
                { key: "layer5_programmatic", title: "Layer 5 — Programmatic & Competitive", icon: Target },
              ].map(({ key, title, icon }) => {
                const items = report.layered_audit[key as keyof typeof report.layered_audit];
                return (
                  <CollapsibleSection key={key} title={title} icon={icon}>
                    {items?.length ? (
                      <div className="space-y-3">
                        {items.map((item, i) => (
                          <div key={i} className="rounded border border-border p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge status={item.status} />
                              <span className="font-medium">{item.item}</span>
                            </div>
                            {item.gap && <p className="text-muted-foreground text-xs">{item.gap}</p>}
                            {/* Full "If Not Ready" remediation block */}
                            {item.status !== "ready" && (item.what_to_do || item.remediation) && (
                              <div className="mt-2 rounded bg-amber-50 dark:bg-amber-950/20 px-3 py-2 space-y-1">
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">If Not Ready:</p>
                                {item.what_to_do && <p className="text-xs"><span className="font-medium">What to do:</span> {item.what_to_do}</p>}
                                {!item.what_to_do && item.remediation && <p className="text-xs"><span className="font-medium">Fix:</span> {item.remediation}</p>}
                                {item.where_to_do_it && <p className="text-xs"><span className="font-medium">Where:</span> {item.where_to_do_it}</p>}
                                {item.who_does_it && <p className="text-xs"><span className="font-medium">Who:</span> {item.who_does_it}</p>}
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  {(item.time || item.cost) && (
                                    <span>{item.time}{item.time && item.cost ? " · " : ""}{item.cost}</span>
                                  )}
                                </div>
                                {item.dependencies && <p className="text-xs"><span className="font-medium">Depends on:</span> {item.dependencies}</p>}
                                {item.risk_of_skipping && <p className="text-xs text-red-600 dark:text-red-400"><span className="font-medium">Risk of skipping:</span> {item.risk_of_skipping}</p>}
                                {item.our_firm_covers && (
                                  <p className="text-xs font-medium text-brand-teal">We cover this in: {item.our_firm_covers}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not applicable to your organization type.</p>
                    )}
                  </CollapsibleSection>
                );
              })}
            </>
          )}

          {/* Controls Assessment */}
          {report.controls_assessment?.length > 0 && (
            <CollapsibleSection title="Internal Controls (COSO)" icon={Shield}>
              <div className="space-y-3">
                {report.controls_assessment.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="text-center min-w-[40px]">
                      <div className={cn(
                        "text-lg font-bold",
                        c.rating >= 4 ? "text-emerald-600" : c.rating >= 3 ? "text-amber-600" : "text-red-600"
                      )}>
                        {c.rating}/5
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{c.component}</p>
                      <p className="text-xs text-muted-foreground">{c.findings}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Site Visit Simulation */}
          {report.site_visit_simulation?.length > 0 && (
            <CollapsibleSection title="Audit & Site-Visit Simulation" icon={FileText}>
              <div className="space-y-2">
                {report.site_visit_simulation.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-border last:border-0">
                    <StatusBadge status={doc.status} />
                    <span className="flex-1">{doc.document}</span>
                    {doc.gap && <span className="text-xs text-muted-foreground max-w-[250px] text-right">{doc.gap}</span>}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Funder Matches */}
          {report.funder_matches?.length > 0 && (
            <CollapsibleSection title="Top Funder Matches (First-Timer Friendly)" icon={Target} defaultOpen>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Funder / Program</th>
                      <th className="py-2 pr-3">Fit</th>
                      <th className="py-2 pr-3">Award Range</th>
                      <th className="py-2 pr-3">Cycle</th>
                      <th className="py-2">First-Timer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.funder_matches.map((f) => (
                      <tr key={f.rank} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3 font-medium">{f.rank}</td>
                        <td className="py-2 pr-3">
                          <p className="font-medium">{f.funder}</p>
                          <p className="text-xs text-muted-foreground">{f.rationale}</p>
                        </td>
                        <td className="py-2 pr-3">{f.fit_score}/10</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{f.award_range}</td>
                        <td className="py-2 pr-3 text-xs">{f.cycle}</td>
                        <td className="py-2 text-xs">{f.first_timer_friendly}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Remediation Roadmap */}
          {report.remediation_roadmap?.length > 0 && (
            <CollapsibleSection title="Sequenced Remediation Roadmap" icon={Target}>
              <div className="space-y-6">
                {report.remediation_roadmap.map((phase, pi) => (
                  <div key={pi}>
                    <h4 className="font-semibold text-sm mb-3">{phase.phase}</h4>
                    <div className="space-y-2 pl-4 border-l-2 border-border">
                      {phase.actions.map((a, ai) => (
                        <div key={ai} className="text-sm">
                          <p className="font-medium">{a.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.owner} &middot; {a.timeline} &middot; {a.cost}
                            {a.dependency && <> &middot; Depends on: {a.dependency}</>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Restructuring Options — for "Not Eligible" verdicts */}
          {report.restructuring_options && report.restructuring_options.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  Restructuring Options
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  If grants aren&apos;t the right fit today, here are structural changes that could unlock eligibility.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-2 pr-3">Option</th>
                        <th className="py-2 pr-3">Unlocks</th>
                        <th className="py-2 pr-3">Cost</th>
                        <th className="py-2 pr-3">Timeline</th>
                        <th className="py-2">Tradeoffs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.restructuring_options.map((ro, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="py-2 pr-3 font-medium">{ro.option}</td>
                          <td className="py-2 pr-3 text-xs">{ro.what_it_unlocks}</td>
                          <td className="py-2 pr-3 text-xs whitespace-nowrap">{ro.cost}</td>
                          <td className="py-2 pr-3 text-xs whitespace-nowrap">{ro.timeline}</td>
                          <td className="py-2 text-xs text-muted-foreground">{ro.tradeoffs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bootstrap Path — for low-budget orgs */}
          {report.bootstrap_path && report.bootstrap_path.length > 0 && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  Bootstrap Path — Get Grant-Ready on a Tight Budget
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  No-cost and low-cost actions you can take right now. When you&apos;re ready to move faster, come back for Tier 2 or 3.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.bootstrap_path.map((bp, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{bp.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {bp.where} &middot; {bp.time} &middot; {bp.cost}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommended Service Tier */}
          {report.recommended_tier && (
            <Card className="border-[var(--color-brand-teal)]">
              <CardContent className="py-6">
                <h3 className="font-semibold text-base mb-2">
                  Our Recommendation: Tier {report.recommended_tier.tier} — {report.recommended_tier.name}
                </h3>
                <p className="text-sm text-muted-foreground">{report.recommended_tier.justification}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 pt-4">
            {report.full_report_markdown && (
              <a href="/services/report" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Download PDF
                </Button>
              </a>
            )}
            <Button variant="outline" onClick={handleRegenerate} disabled={generating} className="gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate Diagnostic
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
