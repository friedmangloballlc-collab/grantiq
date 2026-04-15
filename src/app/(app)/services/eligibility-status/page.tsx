"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  DollarSign,
  Target,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EligibilityReport {
  verdict: string;
  summary: string;
  readiness_score: number;
  eligible_categories: Array<{ category: string; status: string; reason: string }>;
  blockers: Array<{ issue: string; severity: string; fix: string; estimated_time: string; estimated_cost: string }>;
  quick_wins: Array<{ action: string; where: string; time: string; cost: string }>;
  estimated_addressable_universe: { low: number; high: number; program_count: number };
  demographic_eligibility: Record<string, string>;
}

interface ServiceOrder {
  id: string;
  status: string;
  report_data: EligibilityReport | null;
  scores: Record<string, number> | null;
  created_at: string;
}

const VERDICT_DISPLAY: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
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

export default function EligibilityStatusPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      const res = await fetch("/api/services/orders?type=eligibility_status");
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

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/services/eligibility-status/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate report");
        return;
      }
      // Reload orders to show the new report
      await loadOrders();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const latestOrder = orders[0];
  const report = latestOrder?.report_data as EligibilityReport | null;

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
          Grant Eligibility Status
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          AI-powered assessment of your grant readiness. Get a clear verdict on whether your organization qualifies for grants.
        </p>
      </div>

      {/* Generate / Regenerate CTA */}
      {!report && (
        <Card className="mb-8">
          <CardContent className="py-10 text-center">
            <ClipboardCheck className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Check Your Eligibility</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              We&apos;ll analyze your organization profile against grant requirements across federal,
              state, foundation, and corporate programs. Takes about 30 seconds.
            </p>
            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}
            <Button onClick={handleGenerate} disabled={generating} size="lg" className="gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Run Eligibility Check
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Verdict Banner */}
          {(() => {
            const v = VERDICT_DISPLAY[report.verdict] ?? VERDICT_DISPLAY.not_eligible;
            const VerdictIcon = v.icon;
            return (
              <div className={cn("rounded-lg p-6 flex items-start gap-4", v.bg)}>
                <VerdictIcon className={cn("h-8 w-8 shrink-0 mt-0.5", v.color)} />
                <div>
                  <h2 className={cn("text-xl font-bold", v.color)}>{v.label}</h2>
                  <p className="text-sm text-foreground mt-1">{report.summary}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Readiness Score: </span>
                      <span className="font-semibold">{report.readiness_score}/100</span>
                    </div>
                    {report.estimated_addressable_universe && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Grant Universe: </span>
                        <span className="font-semibold">
                          {formatCurrency(report.estimated_addressable_universe.low)}–{formatCurrency(report.estimated_addressable_universe.high)}
                        </span>
                        <span className="text-muted-foreground"> across ~{report.estimated_addressable_universe.program_count} programs</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

          {/* Eligible Categories */}
          {report.eligible_categories?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Eligibility by Grant Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.eligible_categories.map((cat, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        cat.status === "eligible" ? "bg-emerald-100 text-emerald-700" :
                        cat.status === "conditional" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {cat.status === "eligible" ? "Eligible" : cat.status === "conditional" ? "Conditional" : "Not Eligible"}
                      </span>
                      <span className="font-medium flex-1">{cat.category}</span>
                      <span className="text-xs text-muted-foreground max-w-[300px] text-right">{cat.reason}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blockers */}
          {report.blockers?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Blockers to Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.blockers.map((b, i) => (
                    <div key={i} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-sm">{b.issue}</p>
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                          b.severity === "critical" ? "bg-red-100 text-red-700" :
                          b.severity === "moderate" ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {b.severity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{b.fix}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {b.estimated_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> {b.estimated_cost}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Demographic Eligibility */}
          {report.demographic_eligibility && Object.keys(report.demographic_eligibility).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Demographic & Designation Eligibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(report.demographic_eligibility).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        value === "yes" ? "bg-emerald-500" :
                        value === "verify" ? "bg-amber-500" :
                        "bg-gray-300"
                      )} />
                      <span className="text-muted-foreground">{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <span className="font-medium ml-auto">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regenerate */}
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate Report
                </>
              )}
            </Button>
          </div>

          {/* Upsell to Full Diagnostic */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="py-6 text-center">
              <h3 className="font-semibold mb-2">Need a Deeper Analysis?</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                The Grant Eligibility &amp; Readiness Diagnostic provides a comprehensive 10-step
                assessment including internal controls, audit simulation, funder matching, and a
                full remediation roadmap.
              </p>
              <a href="/services/readiness-diagnostic">
                <Button variant="outline" className="gap-2">
                  View Full Diagnostic
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
