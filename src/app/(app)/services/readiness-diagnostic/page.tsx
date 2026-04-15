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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IntakeForm, type IntakeData } from "@/components/services/intake-form";

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
  red_flags: Array<{ flag: string; blocked_categories: string[]; remediation: string; severity: string }>;
  first_timer_reality_check: {
    track_record: string;
    operating_history: string;
    win_rate: string;
    timeline: string;
  };
  eligibility_by_category: Array<{ category: string; status: string; reason: string }>;
  demographic_eligibility: Record<string, string>;
  layered_audit: {
    layer1_universal: Array<{ item: string; status: string; gap: string; remediation: string; time: string; cost: string }>;
    layer2_federal: Array<{ item: string; status: string; gap: string; remediation: string; time: string; cost: string }>;
    layer3_nonprofit: Array<{ item: string; status: string; gap: string; remediation: string; time: string; cost: string }>;
    layer4_forprofit: Array<{ item: string; status: string; gap: string; remediation: string; time: string; cost: string }>;
    layer5_programmatic: Array<{ item: string; status: string; gap: string; remediation: string; time: string; cost: string }>;
  };
  controls_assessment: Array<{ component: string; rating: number; findings: string }>;
  site_visit_simulation: Array<{ document: string; status: string; gap: string }>;
  funder_matches: Array<{ rank: number; funder: string; fit_score: number; award_range: string; cycle: string; first_timer_friendly: string; rationale: string }>;
  remediation_roadmap: Array<{ phase: string; actions: Array<{ action: string; owner: string; timeline: string; cost: string; dependency: string }> }>;
  recommended_tier: { tier: number; name: string; justification: string };
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
                      <p className="text-sm text-muted-foreground">{rf.remediation}</p>
                      {rf.blocked_categories?.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Blocks: {rf.blocked_categories.join(", ")}
                        </p>
                      )}
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

          {/* Eligibility by Category */}
          {report.eligibility_by_category?.length > 0 && (
            <CollapsibleSection title="Grant Eligibility by Category" icon={Shield} defaultOpen>
              <div className="space-y-2">
                {report.eligibility_by_category.map((cat, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
                    <StatusBadge status={cat.status} />
                    <span className="font-medium flex-1">{cat.category}</span>
                    <span className="text-xs text-muted-foreground max-w-[300px] text-right">{cat.reason}</span>
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
                            {item.remediation && <p className="text-xs mt-1"><span className="font-medium">Fix:</span> {item.remediation}</p>}
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              {item.time && <span>{item.time}</span>}
                              {item.cost && <span>{item.cost}</span>}
                            </div>
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

          {/* Regenerate */}
          <div className="flex justify-center pt-4">
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
