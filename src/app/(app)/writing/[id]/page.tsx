import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { CopyButton } from "@/components/writing/copy-button";

// ─── Types ─────────────────────────────────────────────────────────────────────

type DraftStatus =
  | "rfp_parsed"
  | "funder_analyzed"
  | "drafting"
  | "draft_complete"
  | "coherence_checked"
  | "auditing"
  | "audit_complete"
  | "rewriting"
  | "rewrite_complete"
  | "review_simulated"
  | "compliance_checked"
  | "completed"
  | "failed";

interface DraftSection {
  section_title: string;
  content: string;
  word_count?: number;
  score?: number;
}

interface AuditIssue {
  severity: "high" | "medium" | "low";
  section?: string;
  issue: string;
  suggestion: string;
}

interface AuditReport {
  overall_score: number;
  issues: AuditIssue[];
  strengths: string[];
  summary: string;
}

interface ReviewSimulation {
  panel_score: number;
  likely_funded: boolean;
  reviewer_notes: string[];
  risk_flags: string[];
}

interface ComplianceReport {
  compliant: boolean;
  issues: string[];
  checklist: { item: string; passed: boolean }[];
}

interface GrantDraft {
  id: string;
  tier: string;
  grant_type: string;
  status: DraftStatus;
  price_cents: number;
  is_full_confidence: boolean;
  created_at: string;
  updated_at: string;
  sections?: DraftSection[];
  audit_report?: AuditReport;
  review_simulation?: ReviewSimulation;
  compliance_report?: ComplianceReport;
  stripe_payment_intent_id?: string | null;
  grant_sources?: { name: string; funder_name: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PIPELINE_STEPS: { key: DraftStatus; label: string }[] = [
  { key: "rfp_parsed", label: "RFP Parsed" },
  { key: "funder_analyzed", label: "Funder Research" },
  { key: "drafting", label: "Drafting" },
  { key: "draft_complete", label: "Draft Ready" },
  { key: "coherence_checked", label: "Coherence Check" },
  { key: "auditing", label: "Audit" },
  { key: "audit_complete", label: "Audit Done" },
  { key: "rewriting", label: "Rewrite" },
  { key: "rewrite_complete", label: "Rewrite Done" },
  { key: "review_simulated", label: "Review Sim" },
  { key: "compliance_checked", label: "Compliance" },
  { key: "completed", label: "Complete" },
];

function currentStepIndex(status: DraftStatus): number {
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function tierLabel(tier: string): string {
  const labels: Record<string, string> = {
    tier1_ai_only: "AI-Assisted",
    tier2_ai_audit: "Professional",
    tier3_expert: "Full Confidence",
    full_confidence: "Full Confidence",
  };
  return labels[tier] ?? tier;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}

export default async function DraftViewerPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { payment } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const admin = createAdminClient();

  // Fetch the draft + joined grant info
  const { data: draft, error } = await admin
    .from("grant_drafts")
    .select(
      "id, tier, grant_type, status, price_cents, is_full_confidence, created_at, updated_at, sections, audit_report, review_simulation, compliance_report, stripe_payment_intent_id, grant_sources(name, funder_name)"
    )
    .eq("id", id)
    .single();

  if (error || !draft) notFound();

  const d = draft as unknown as GrantDraft;
  const gs = d.grant_sources as unknown as { name: string; funder_name: string } | null;
  const currentIdx = currentStepIndex(d.status);
  const isTier2Plus = d.tier === "tier2_ai_audit" || d.tier === "tier3_expert" || d.tier === "full_confidence";
  const isTier3 = d.tier === "tier3_expert" || d.tier === "full_confidence";

  // Build combined text for copy
  const allText = (d.sections ?? [])
    .map((s) => `## ${s.section_title}\n\n${s.content}`)
    .join("\n\n---\n\n");

  return (
    <div className="px-6 py-8 max-w-4xl space-y-8">
      {/* Payment pending banner */}
      {payment === "pending" && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          <CreditCard className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              Payment setup coming soon.
            </span>{" "}
            <span className="text-amber-700 dark:text-amber-400">
              Your draft has been created. Payment processing will be enabled
              once Stripe is configured.
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">
          {gs?.funder_name ?? "Unknown Funder"}
        </p>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{gs?.name ?? "Grant Application"}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs bg-[var(--color-brand-teal)]/10 text-[var(--color-brand-teal)] font-medium px-2.5 py-1 rounded-full">
              {tierLabel(d.tier)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatPrice(d.price_cents)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {d.status === "failed" ? (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              Writing failed. Please contact support.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-center gap-1 min-w-max pb-2">
                {PIPELINE_STEPS.map((step, idx) => {
                  const done = idx < currentIdx;
                  const active = idx === currentIdx;
                  return (
                    <div key={step.key} className="flex items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`h-2.5 w-2.5 rounded-full transition-colors ${
                            done
                              ? "bg-[var(--color-brand-teal)]"
                              : active
                              ? "bg-[var(--color-brand-teal)] ring-4 ring-[var(--color-brand-teal)]/20"
                              : "bg-muted"
                          }`}
                        />
                        <span
                          className={`text-[10px] whitespace-nowrap ${
                            active
                              ? "text-[var(--color-brand-teal)] font-semibold"
                              : done
                              ? "text-muted-foreground"
                              : "text-muted-foreground/50"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {idx < PIPELINE_STEPS.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-0.5 mb-3" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* In-progress message */}
      {d.status !== "completed" && d.status !== "failed" && (
        <div className="flex items-center gap-3 bg-[var(--color-brand-teal)]/5 border border-[var(--color-brand-teal)]/20 rounded-lg px-4 py-3">
          <Clock className="h-4 w-4 text-[var(--color-brand-teal)] shrink-0" />
          <p className="text-sm text-muted-foreground">
            Your application is being generated. This page will show content as
            each section completes. Refresh to check for updates.
          </p>
        </div>
      )}

      {/* Draft sections */}
      {d.sections && d.sections.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Draft Sections</h2>
            {allText && <CopyButton text={allText} label="Copy All" />}
          </div>
          {d.sections.map((section, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{section.section_title}</CardTitle>
                  <div className="flex items-center gap-3">
                    {section.score !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        Score: {section.score}/10
                      </span>
                    )}
                    {section.word_count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {section.word_count} words
                      </span>
                    )}
                    <CopyButton text={section.content} label="Copy" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">
                  {section.content}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Audit Report — tier 2+ */}
      {isTier2Plus && d.audit_report && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Audit Report</h2>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Overall Score</CardTitle>
                <span className="text-2xl font-bold text-[var(--color-brand-teal)]">
                  {d.audit_report.overall_score}
                  <span className="text-sm font-normal text-muted-foreground">/100</span>
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {d.audit_report.summary && (
                <p className="text-sm text-muted-foreground">{d.audit_report.summary}</p>
              )}
              {d.audit_report.strengths && d.audit_report.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Strengths
                  </p>
                  <ul className="space-y-1">
                    {d.audit_report.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.audit_report.issues && d.audit_report.issues.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Issues to Address
                  </p>
                  <div className="space-y-2">
                    {d.audit_report.issues.map((issue, i) => (
                      <div
                        key={i}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          issue.severity === "high"
                            ? "bg-destructive/10 border border-destructive/20"
                            : issue.severity === "medium"
                            ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                            : "bg-muted border border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-semibold uppercase ${
                              issue.severity === "high"
                                ? "text-destructive"
                                : issue.severity === "medium"
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {issue.severity}
                          </span>
                          {issue.section && (
                            <span className="text-xs text-muted-foreground">
                              · {issue.section}
                            </span>
                          )}
                        </div>
                        <p className="font-medium">{issue.issue}</p>
                        <p className="text-muted-foreground mt-0.5">{issue.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Review Simulation — tier 3 */}
      {isTier3 && d.review_simulation && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Review Panel Simulation</h2>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Panel Score</CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-[var(--color-brand-teal)]">
                    {d.review_simulation.panel_score}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      d.review_simulation.likely_funded
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {d.review_simulation.likely_funded
                      ? "Likely Funded"
                      : "Needs Improvement"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {d.review_simulation.reviewer_notes && d.review_simulation.reviewer_notes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Reviewer Notes
                  </p>
                  <ul className="space-y-1.5">
                    {d.review_simulation.reviewer_notes.map((note, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-[var(--color-brand-teal)] mt-1">·</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.review_simulation.risk_flags && d.review_simulation.risk_flags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Risk Flags
                  </p>
                  <ul className="space-y-1.5">
                    {d.review_simulation.risk_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Compliance Report */}
      {d.compliance_report && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Compliance Check</h2>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Compliance Status</CardTitle>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    d.compliance_report.compliant
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {d.compliance_report.compliant ? "Compliant" : "Issues Found"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {d.compliance_report.issues && d.compliance_report.issues.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Issues
                  </p>
                  <ul className="space-y-1.5">
                    {d.compliance_report.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.compliance_report.checklist && d.compliance_report.checklist.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Checklist
                  </p>
                  <ul className="space-y-1.5">
                    {d.compliance_report.checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {item.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        )}
                        <span className={item.passed ? "" : "text-destructive"}>
                          {item.item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
