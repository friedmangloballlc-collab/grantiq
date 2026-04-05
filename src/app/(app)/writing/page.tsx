import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Plus, Clock, CheckCircle2, AlertCircle, Loader2, Bot, Users, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  | "expert_review"
  | "completed"
  | "failed";

interface GrantDraft {
  id: string;
  tier: string;
  grant_type: string;
  status: DraftStatus;
  price_cents: number;
  created_at: string;
  grant_sources?: { name: string; funder_name: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusProgress(status: DraftStatus): number {
  const steps: DraftStatus[] = [
    "rfp_parsed",
    "funder_analyzed",
    "drafting",
    "draft_complete",
    "coherence_checked",
    "auditing",
    "audit_complete",
    "rewriting",
    "rewrite_complete",
    "review_simulated",
    "compliance_checked",
    "expert_review",
    "completed",
  ];
  const idx = steps.indexOf(status);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / steps.length) * 100);
}

function statusLabel(status: DraftStatus): string {
  const labels: Record<DraftStatus, string> = {
    rfp_parsed: "RFP Parsed",
    funder_analyzed: "Funder Analyzed",
    drafting: "Drafting…",
    draft_complete: "Draft Complete",
    coherence_checked: "Coherence Checked",
    auditing: "Auditing…",
    audit_complete: "Audit Complete",
    rewriting: "Rewriting…",
    rewrite_complete: "Rewrite Complete",
    review_simulated: "Review Simulated",
    compliance_checked: "Compliance Checked",
    expert_review: "Expert Review",
    completed: "Complete",
    failed: "Failed",
  };
  return labels[status] ?? status;
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

function StatusIcon({ status }: { status: DraftStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "failed") return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (status.endsWith("ing") || status === "drafting" || status === "auditing" || status === "rewriting")
    return <Loader2 className="h-4 w-4 text-[var(--color-brand-teal)] animate-spin" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WritingDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let drafts: GrantDraft[] = [];
  let orgId: string | null = null;

  if (user) {
    const admin = createAdminClient();

    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    orgId = membership?.org_id ?? null;

    if (orgId) {
      const { data } = await admin
        .from("grant_drafts")
        .select(
          "id, tier, grant_type, status, price_cents, created_at, grant_sources(name, funder_name)"
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);

      drafts = (data ?? []) as unknown as GrantDraft[];
    }
  }

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Writing Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your applications through AI drafting, expert review, and final submission.
          </p>
        </div>
        <Button
          className="bg-[var(--color-brand-teal)] text-white hover:bg-[var(--color-brand-teal)]/90"
          render={<Link href="/matches"><Plus className="h-4 w-4" /> New Application</Link>}
        />
      </div>

      {/* Workflow indicator */}
      <div className="flex items-center gap-2 p-4 mb-6 rounded-xl border border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
          <Bot className="h-4 w-4 text-[var(--color-brand-teal)]" />
          <span>AI Draft</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
          <Users className="h-4 w-4 text-[var(--color-brand-teal)]" />
          <span>Expert Review</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
          <Send className="h-4 w-4 text-[var(--color-brand-teal)]" />
          <span>Ready to Submit</span>
        </div>
      </div>

      {/* Empty state */}
      {drafts.length === 0 && (
        <div className="border border-dashed border-border rounded-xl">
          <EmptyState variant="writing" />
        </div>
      )}

      {/* Drafts list */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          {drafts.map((draft) => {
            const progress = statusProgress(draft.status);
            const gs = draft.grant_sources as
              | { name: string; funder_name: string }
              | null
              | undefined;

            return (
              <Link key={draft.id} href={`/writing/${draft.id}`}>
                <Card className="hover:ring-2 hover:ring-[var(--color-brand-teal)]/30 transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm truncate">
                          {gs?.name ?? "Untitled Grant"}
                        </CardTitle>
                        <CardDescription className="mt-0.5">
                          {gs?.funder_name ?? "Unknown Funder"} ·{" "}
                          {tierLabel(draft.tier)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusIcon status={draft.status} />
                        <span className="text-xs text-muted-foreground">
                          {statusLabel(draft.status)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {/* Progress bar */}
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-brand-teal)] rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {progress}%
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        Started{" "}
                        {formatDistanceToNow(new Date(draft.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
