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
  ChevronRight,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  HelpCircle,
  Target,
} from "lucide-react";
import { CopyButton } from "@/components/writing/copy-button";
import { ReviewGateButton } from "@/components/writing/review-gate-button";
import { LiveDraftProgress } from "@/components/writing/live-draft-progress";
import { LiveDraftStream } from "@/components/writing/live-draft-stream";

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
  current_step: string | null;
  progress_pct: number | null;
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

// Agent #7 — Hallucination Auditor output (from section_audits table)
type SectionAuditVerdict = "clean" | "flagged" | "blocked" | "unaudited";

interface SectionAuditClaim {
  claim_text: string;
  status: "grounded" | "ungrounded";
  source_quote: string | null;
  missing_source: string | null;
  is_hard_fact: boolean;
}

interface SectionAuditRow {
  id: string;
  section_name: string;
  claims_total: number;
  claims_grounded: number;
  claims_ungrounded: number;
  verdict: SectionAuditVerdict;
  claims_detail: SectionAuditClaim[];
  resolved_by_user: boolean;
  created_at: string;
}

// Agent #8 — Quality Scorer output (from draft_quality_scores table)
type QualityVerdict = "submittable" | "needs_work" | "not_ready";

interface CriterionScore {
  criterion: string;
  max: number;
  score: number;
  evidence_quoted: string | null;
  strengths: string[];
  gaps: string[];
  improvements: string[];
}

interface RankedImprovement {
  criterion: string;
  action: string;
  point_impact: number;
}

interface QualityScoreRow {
  id: string;
  total_score: number;
  max_possible: number;
  verdict: QualityVerdict;
  rubric_source: "explicit_from_rfp" | "inferred";
  criteria_detail: CriterionScore[];
  improvements_ranked: RankedImprovement[];
  created_at: string;
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

  // Fetch the draft + joined grant info + agent outputs in parallel.
  // section_audits (#7) and draft_quality_scores (#8) are wired into
  // the writing pipeline — surface them here so paying users see what
  // they paid for.
  const [draftResult, auditsResult, scoreResult] = await Promise.all([
    admin
      .from("grant_drafts")
      .select(
        "id, tier, grant_type, status, current_step, progress_pct, price_cents, is_full_confidence, created_at, updated_at, sections, audit_report, review_simulation, compliance_report, stripe_payment_intent_id, grant_sources(name, funder_name)"
      )
      .eq("id", id)
      .single(),
    admin
      .from("section_audits")
      .select(
        "id, section_name, claims_total, claims_grounded, claims_ungrounded, verdict, claims_detail, resolved_by_user, created_at"
      )
      .eq("draft_id", id)
      .order("created_at", { ascending: true }),
    admin
      .from("draft_quality_scores")
      .select(
        "id, total_score, max_possible, verdict, rubric_source, criteria_detail, improvements_ranked, created_at"
      )
      .eq("draft_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { data: draft, error } = draftResult;
  if (error || !draft) notFound();

  const sectionAudits = (auditsResult.data ?? []) as unknown as SectionAuditRow[];
  const qualityScore = (scoreResult.data ?? null) as unknown as QualityScoreRow | null;

  // Build a lookup from section_title → audit row so section cards can
  // render their own badge inline.
  const auditBySection = new Map<string, SectionAuditRow>();
  for (const a of sectionAudits) {
    auditBySection.set(a.section_name.toLowerCase().trim(), a);
  }

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
              Payment pending.
            </span>{" "}
            <span className="text-amber-700 dark:text-amber-400">
              Your draft has been created. Contact{" "}
              <a href="mailto:hello@grantaq.com" className="underline">hello@grantaq.com</a>{" "}
              to complete payment and unlock your draft.
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

      {/* Live in-progress widget — subscribes to grant_drafts updates
          via Supabase Realtime (publication enabled in 00056). Renders
          nothing once status is terminal. */}
      {d.status !== "completed" && d.status !== "failed" && (
        <LiveDraftProgress
          draftId={d.id}
          initialStatus={d.status}
          initialStep={d.current_step}
          initialProgress={d.progress_pct}
        />
      )}

      {/* Token-by-token streaming view — subscribes to per-draft Realtime
          broadcast channel populated by the worker's draft-broadcaster
          while sections generate. Auto-renders nothing if no broadcasts
          have arrived yet (cold start) or once persisted sections are
          available below. */}
      {d.status === "drafting" && !d.sections?.length && (
        <LiveDraftStream draftId={d.id} />
      )}

      {/* Draft sections */}
      {d.sections && d.sections.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Draft Sections</h2>
            {allText && (
              <ReviewGateButton
                text={allText}
                draftId={d.id}
                label="Copy All"
                action="copy_all"
              />
            )}
          </div>
          {d.sections.map((section, idx) => {
            const audit = auditBySection.get(
              section.section_title.toLowerCase().trim()
            );
            return (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{section.section_title}</CardTitle>
                      {audit && <AuditBadge audit={audit} />}
                    </div>
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
                  {audit && audit.claims_ungrounded > 0 && (
                    <UngroundedClaimsList claims={audit.claims_detail} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* Quality Score (Agent #8) — all tiers, fresh from draft_quality_scores */}
      {qualityScore && <QualityScoreCard score={qualityScore} />}

      {/* Hallucination summary (Agent #7) — all tiers, if any audits exist */}
      {sectionAudits.length > 0 && <AuditSummaryCard audits={sectionAudits} />}

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

// ─── Agent Output Components ─────────────────────────────────────────────────

function AuditBadge({ audit }: { audit: SectionAuditRow }) {
  const cfg = {
    clean: {
      icon: ShieldCheck,
      text: "Verified",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    flagged: {
      icon: ShieldAlert,
      text: `${audit.claims_ungrounded} flagged`,
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    blocked: {
      icon: ShieldOff,
      text: `${audit.claims_ungrounded} blocked`,
      className: "bg-destructive/10 text-destructive",
    },
    unaudited: {
      icon: HelpCircle,
      text: "Not audited",
      className: "bg-muted text-muted-foreground",
    },
  }[audit.verdict];

  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}
      title={`${audit.claims_grounded}/${audit.claims_total} claims grounded in source material`}
    >
      <Icon className="h-3 w-3" />
      {cfg.text}
    </span>
  );
}

function UngroundedClaimsList({ claims }: { claims: SectionAuditClaim[] }) {
  const ungrounded = claims.filter((c) => c.status === "ungrounded");
  if (ungrounded.length === 0) return null;
  return (
    <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2">
        Claims without source support ({ungrounded.length})
      </p>
      <ul className="space-y-2">
        {ungrounded.map((c, i) => (
          <li key={i} className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              &ldquo;{c.claim_text}&rdquo;
              {c.is_hard_fact && (
                <span className="ml-2 text-xs font-semibold uppercase text-destructive">
                  hard fact
                </span>
              )}
            </p>
            {c.missing_source && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {c.missing_source}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuditSummaryCard({ audits }: { audits: SectionAuditRow[] }) {
  const totalClaims = audits.reduce((a, r) => a + r.claims_total, 0);
  const totalUngrounded = audits.reduce((a, r) => a + r.claims_ungrounded, 0);
  const blocked = audits.filter((a) => a.verdict === "blocked").length;
  const flagged = audits.filter((a) => a.verdict === "flagged").length;
  const clean = audits.filter((a) => a.verdict === "clean").length;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Hallucination Audit</h2>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Per-section fact-check</CardTitle>
            <span className="text-xs text-muted-foreground">
              {totalClaims - totalUngrounded}/{totalClaims} claims grounded
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {clean}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">clean</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {flagged}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                flagged
              </p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-2xl font-bold text-destructive">{blocked}</p>
              <p className="text-xs text-destructive">blocked</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function QualityScoreCard({ score }: { score: QualityScoreRow }) {
  const verdictCfg = {
    submittable: {
      label: "Ready to submit",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    needs_work: {
      label: "Needs work",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    not_ready: {
      label: "Not ready",
      className: "bg-destructive/10 text-destructive",
    },
  }[score.verdict];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Quality Score</h2>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Against funder rubric</CardTitle>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${verdictCfg.className}`}
              >
                {verdictCfg.label}
              </span>
              <span className="text-2xl font-bold text-[var(--color-brand-teal)]">
                {score.total_score}
                <span className="text-sm font-normal text-muted-foreground">
                  /{score.max_possible}
                </span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Rubric source:{" "}
            {score.rubric_source === "explicit_from_rfp"
              ? "extracted from RFP"
              : "inferred from funder context"}
          </p>

          {score.criteria_detail && score.criteria_detail.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Criteria breakdown
              </p>
              <div className="space-y-2">
                {score.criteria_detail.map((c, i) => {
                  const pct = c.max > 0 ? Math.round((c.score / c.max) * 100) : 0;
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{c.criterion}</span>
                        <span className="text-sm tabular-nums">
                          {c.score}/{c.max}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 80
                              ? "bg-green-500"
                              : pct >= 50
                              ? "bg-amber-500"
                              : "bg-destructive"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {c.gaps && c.gaps.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {c.gaps.slice(0, 3).map((g, gi) => (
                            <li
                              key={gi}
                              className="text-xs text-muted-foreground"
                            >
                              · {g}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {score.improvements_ranked && score.improvements_ranked.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Top improvements (ranked by point impact)
              </p>
              <ul className="space-y-2">
                {score.improvements_ranked.slice(0, 5).map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Target className="h-4 w-4 text-[var(--color-brand-teal)] mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p>
                        <span className="font-medium">+{imp.point_impact} pts</span>{" "}
                        <span className="text-muted-foreground">
                          · {imp.criterion}
                        </span>
                      </p>
                      <p className="text-muted-foreground">{imp.action}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
