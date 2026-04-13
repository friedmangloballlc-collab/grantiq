import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ReadinessGauge } from "@/components/grants/readiness-gauge";
import { ActionPaths } from "@/components/shared/action-paths";
import { AIDisclosure } from "@/components/shared/ai-disclosure";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { GrantActionButtons } from "@/components/grants/grant-action-buttons";
import Link from "next/link";
import { ClipboardList, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationChecklist } from "@/components/pipeline/application-checklist";
import { ReportIssueButton } from "@/components/grants/report-issue-button";
import { TRLPrompt } from "@/components/shared/deferred-question-prompt";
import type { ReadinessCategory } from "@/components/grants/readiness-gauge";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OrgRow {
  entity_type: string | null;
  state: string | null;
  annual_budget: number | null;
}

interface OrgProfileRow {
  grant_history_level: string | null;
  outcomes_tracking: boolean | null;
}

interface OrgCapabilitiesRow {
  has_501c3: boolean | null;
  has_audit: boolean | null;
  has_sam_registration: boolean | null;
  years_operating: number | null;
  prior_federal_grants: number | null;
  prior_foundation_grants: number | null;
  annual_budget: number | null;
}

interface GrantRow {
  source_type: string | null;
  eligibility_types: string[] | null;
  states: string[] | null;
  amount_min: number | null;
  amount_max: number | null;
}

// ─── Readiness Computation ─────────────────────────────────────────────────────

/**
 * Computes grant readiness categories for the ReadinessGauge from real org data.
 *
 * Returns { categories, overallScore } based on four dimensions:
 *   1. Eligibility   — org entity_type vs grant eligibility_types
 *   2. Geography     — org state vs grant states (empty = national)
 *   3. Documents     — 501c3 letter, audit, SAM registration presence
 *   4. Financials    — org annual_budget vs grant amount ranges
 *
 * Status rules:
 *   "ready"           — requirement clearly met
 *   "needs_attention" — requirement is likely met but uncertain / sub-optimal
 *   "blocker"         — requirement is clearly not met
 */
export function computeGrantReadiness(
  org: OrgRow | null,
  profile: OrgProfileRow | null,
  capabilities: OrgCapabilitiesRow | null,
  grant: GrantRow | null
): { categories: ReadinessCategory[]; overallScore: number } {
  const categories: ReadinessCategory[] = [];

  // ── 1. Eligibility ──────────────────────────────────────────────────────────
  const eligibilityTypes: string[] = grant?.eligibility_types ?? [];
  const entityType = (org?.entity_type ?? "").toLowerCase();

  // Map db entity_type values to common eligibility keywords funders use
  const entityKeywords: string[] = [];
  if (entityType.includes("nonprofit") || entityType.includes("501c3") || entityType.includes("501c")) {
    entityKeywords.push("nonprofit", "501c3", "501(c)(3)", "tax-exempt", "not-for-profit");
  }
  if (entityType === "government agency") {
    entityKeywords.push("government", "public agency", "municipal", "tribal");
  }
  if (entityType.includes("tribal")) {
    entityKeywords.push("tribal", "native american", "indigenous");
  }
  if (entityType.includes("llc") || entityType.includes("corporation") || entityType.includes("for-profit")) {
    entityKeywords.push("for-profit", "business", "company");
  }
  if (entityType.includes("fiscal sponsor")) {
    entityKeywords.push("nonprofit", "fiscal sponsor", "fiscally sponsored");
  }

  let eligibilityStatus: ReadinessCategory["status"];
  let eligibilityMessage: string;

  if (eligibilityTypes.length === 0) {
    // Grant has no restriction listed — assume open eligibility
    eligibilityStatus = "ready";
    eligibilityMessage = "No eligibility restrictions listed";
  } else {
    const normalizedTypes = eligibilityTypes.map((t) => t.toLowerCase());
    const matches = entityKeywords.some((kw) =>
      normalizedTypes.some((et) => et.includes(kw) || kw.includes(et))
    );
    if (matches) {
      eligibilityStatus = "ready";
      eligibilityMessage = "Your entity type qualifies";
    } else if (!org?.entity_type) {
      eligibilityStatus = "needs_attention";
      eligibilityMessage = "Complete your profile to verify eligibility";
    } else {
      eligibilityStatus = "blocker";
      eligibilityMessage = `Your entity type may not qualify — eligible: ${eligibilityTypes.slice(0, 2).join(", ")}`;
    }
  }

  categories.push({
    name: "Eligibility",
    status: eligibilityStatus,
    message: eligibilityMessage,
    ...(eligibilityStatus !== "ready" && {
      fixAction: { label: "Update Profile", href: "/settings" },
    }),
  });

  // ── 2. Geography ────────────────────────────────────────────────────────────
  const grantStates: string[] = grant?.states ?? [];
  const orgState = (org?.state ?? "").toUpperCase().trim();

  let geoStatus: ReadinessCategory["status"];
  let geoMessage: string;

  if (grantStates.length === 0) {
    geoStatus = "ready";
    geoMessage = "National funding — no state restriction";
  } else if (!orgState) {
    geoStatus = "needs_attention";
    geoMessage = "Add your state to confirm geographic eligibility";
  } else {
    const normalizedGrantStates = grantStates.map((s) => s.toUpperCase().trim());
    if (normalizedGrantStates.includes(orgState)) {
      geoStatus = "ready";
      geoMessage = `Your state (${orgState}) is eligible`;
    } else {
      geoStatus = "blocker";
      geoMessage = `Funder restricts to: ${grantStates.slice(0, 3).join(", ")}${grantStates.length > 3 ? ` +${grantStates.length - 3} more` : ""}`;
    }
  }

  categories.push({
    name: "Geography",
    status: geoStatus,
    message: geoMessage,
    ...(geoStatus === "needs_attention" && {
      fixAction: { label: "Update Profile", href: "/settings" },
    }),
  });

  // ── 3. Documents ────────────────────────────────────────────────────────────
  const sourceType = (grant?.source_type ?? "").toLowerCase();
  const has501c3 = capabilities?.has_501c3 ?? false;
  const hasAudit = capabilities?.has_audit ?? false;
  const hasSam = capabilities?.has_sam_registration ?? false;

  // Federal grants: SAM.gov registration is a hard blocker
  if (sourceType === "federal") {
    if (!hasSam) {
      categories.push({
        name: "Documents",
        status: "blocker",
        message: "SAM.gov registration required for federal grants",
        fixAction: { label: "Register SAM.gov", href: "/vault" },
      });
    } else if (!hasAudit && (org?.annual_budget ?? 0) > 750_000) {
      categories.push({
        name: "Documents",
        status: "needs_attention",
        message: "Federal audit may be required (budget > $750K)",
        fixAction: { label: "Upload Audit", href: "/vault" },
      });
    } else {
      categories.push({
        name: "Documents",
        status: "ready",
        message: "SAM.gov registered — federal requirements met",
      });
    }
  } else if (sourceType === "foundation" || sourceType === "state") {
    // Foundation/state: 501(c)(3) letter is typically required
    if (!has501c3) {
      categories.push({
        name: "Documents",
        status: "blocker",
        message: "501(c)(3) determination letter required",
        fixAction: { label: "Upload Letter", href: "/vault" },
      });
    } else if (!hasAudit) {
      categories.push({
        name: "Documents",
        status: "needs_attention",
        message: "Audited financials strengthen this application",
        fixAction: { label: "Upload Audit", href: "/vault" },
      });
    } else {
      categories.push({
        name: "Documents",
        status: "ready",
        message: "501(c)(3) letter and audit on file",
      });
    }
  } else {
    // Corporate or unknown
    const hasAnyDoc = has501c3 || hasAudit;
    categories.push({
      name: "Documents",
      status: hasAnyDoc ? "ready" : "needs_attention",
      message: hasAnyDoc
        ? "Key documents on file"
        : "Upload org documents to strengthen your application",
      ...(!hasAnyDoc && { fixAction: { label: "Upload Docs", href: "/vault" } }),
    });
  }

  // ── 4. Financials ───────────────────────────────────────────────────────────
  const orgBudget = org?.annual_budget ?? capabilities?.annual_budget ?? null;
  const grantMin = grant?.amount_min ?? null;
  const grantMax = grant?.amount_max ?? null;

  let financialsStatus: ReadinessCategory["status"];
  let financialsMessage: string;

  if (!orgBudget) {
    financialsStatus = "needs_attention";
    financialsMessage = "Add your annual budget to assess financial fit";
  } else if (grantMax && orgBudget < grantMax * 0.15) {
    // Org budget is under 15% of max award — very small relative to grant
    financialsStatus = "needs_attention";
    financialsMessage = "Your budget is small relative to this grant's scale";
  } else if (grantMin && orgBudget < grantMin) {
    // Org budget is below the minimum grant amount — likely a mismatch
    financialsStatus = "needs_attention";
    financialsMessage = `Grant minimum ($${(grantMin / 1000).toFixed(0)}K) may exceed typical org budget ratios`;
  } else {
    financialsStatus = "ready";
    financialsMessage = "Budget scale appears appropriate for this grant";
  }

  categories.push({
    name: "Financials",
    status: financialsStatus,
    message: financialsMessage,
    ...(financialsStatus === "needs_attention" && {
      fixAction: { label: "Update Budget", href: "/settings" },
    }),
  });

  // ── 5. Track Record ─────────────────────────────────────────────────────────
  const priorFederal = capabilities?.prior_federal_grants ?? 0;
  const priorFoundation = capabilities?.prior_foundation_grants ?? 0;
  const historyLevel = profile?.grant_history_level ?? null;
  const yearsOp = capabilities?.years_operating ?? 0;

  let trackStatus: ReadinessCategory["status"];
  let trackMessage: string;

  const totalGrants = priorFederal + priorFoundation;

  if (sourceType === "federal" && priorFederal === 0 && yearsOp < 2) {
    trackStatus = "needs_attention";
    trackMessage = "No prior federal grants — consider a foundation grant first";
  } else if (totalGrants > 0 || historyLevel === "intermediate" || historyLevel === "experienced") {
    trackStatus = "ready";
    trackMessage = totalGrants > 0
      ? `${totalGrants} prior grant${totalGrants > 1 ? "s" : ""} on record`
      : "Grant history meets threshold";
  } else if (historyLevel === "beginner" || yearsOp >= 1) {
    trackStatus = "needs_attention";
    trackMessage = "Early-stage history — document past projects to build credibility";
  } else {
    trackStatus = "needs_attention";
    trackMessage = "Complete your organization profile to assess track record";
  }

  categories.push({
    name: "Track Record",
    status: trackStatus,
    message: trackMessage,
    ...(trackStatus === "needs_attention" && {
      fixAction: { label: "Update History", href: "/settings" },
    }),
  });

  // ── Compute overall score ────────────────────────────────────────────────────
  const weights: Record<ReadinessCategory["status"], number> = {
    ready: 20,
    needs_attention: 10,
    blocker: 0,
  };
  const rawScore = categories.reduce((sum, c) => sum + weights[c.status], 0);
  // Scale to 0–100 based on number of categories (each max 20 points)
  const maxScore = categories.length * 20;
  const overallScore = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;

  return { categories, overallScore };
}

// ─── Page ───────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GrantDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const admin = createAdminClient();

  // Use admin client for grant_sources (public catalog, no RLS)
  const { data: grant } = await admin
    .from("grant_sources")
    .select("*")
    .eq("id", id)
    .single();

  if (!grant) notFound();

  // Fetch subscription tier for feature gating
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let tier = "free";
  if (user) {
    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();
    if (membership?.org_id) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("tier")
        .eq("org_id", membership.org_id)
        .single();
      tier = sub?.tier ?? "free";
    }
  }
  const isFree = tier === "free";

  // Fetch org data for dynamic readiness computation
  let orgRow: OrgRow | null = null;
  let profileRow: OrgProfileRow | null = null;
  let capabilitiesRow: OrgCapabilitiesRow | null = null;

  if (user) {
    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (membership?.org_id) {
      const [{ data: org }, { data: profile }, { data: capabilities }] = await Promise.all([
        admin
          .from("organizations")
          .select("entity_type, state, annual_budget")
          .eq("id", membership.org_id)
          .single(),
        admin
          .from("org_profiles")
          .select("grant_history_level, outcomes_tracking, technology_readiness_level")
          .eq("org_id", membership.org_id)
          .single(),
        admin
          .from("org_capabilities")
          .select("has_501c3, has_audit, has_sam_registration, years_operating, prior_federal_grants, prior_foundation_grants, annual_budget")
          .eq("org_id", membership.org_id)
          .single(),
      ]);
      orgRow = org as OrgRow | null;
      profileRow = profile as OrgProfileRow | null;
      capabilitiesRow = capabilities as OrgCapabilitiesRow | null;
    }
  }

  const { categories: readinessCategories, overallScore: readinessScore } =
    computeGrantReadiness(orgRow, profileRow, capabilitiesRow, {
      source_type: grant.source_type ?? null,
      eligibility_types: grant.eligibility_types ?? null,
      states: grant.states ?? null,
      amount_min: grant.amount_min ?? null,
      amount_max: grant.amount_max ?? null,
    });

  const sourceType = grant.source_type ?? "federal";
  const sourceTypeColors: Record<string, string> = {
    federal: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    state:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
    foundation:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    corporate:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  };
  const badgeClass =
    sourceTypeColors[sourceType.toLowerCase()] ??
    "bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300";

  // Fetch requirements from grant_requirements table
  const { data: requirements } = await admin
    .from("grant_requirements")
    .select("*")
    .eq("grant_source_id", id);

  // Check if grant is already in user's pipeline
  let inPipeline = false;
  let pipelineStage = "";
  if (user) {
    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();
    if (membership?.org_id) {
      const { data: pipelineItem } = await admin
        .from("grant_pipeline")
        .select("stage")
        .eq("org_id", membership.org_id)
        .eq("grant_source_id", id)
        .limit(1)
        .single();
      if (pipelineItem) {
        inPipeline = true;
        pipelineStage = pipelineItem.stage;
      }
    }
  }

  const requirementLabels: Record<string, string> = {
    "501c3": "501(c)(3) Tax-Exempt Status",
    "budget_threshold": "Budget Threshold",
    "geographic": "Geographic Requirement",
    "years_operating": "Minimum Years Operating",
    "audit_required": "Financial Audit Required",
    "matching_funds": "Matching Funds Required",
    "sam_registration": "SAM.gov Registration",
  };

  return (
    <div className="max-w-4xl space-y-8 px-4 md:px-6 py-6">
      {/* Layer 1: Summary — always visible */}
      <div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium mb-2 ${badgeClass}`}
        >
          {sourceType}
        </span>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          {grant.name}
        </h1>
        {grant.funder_name ? (
          <Link
            href={`/funders/${encodeURIComponent(grant.funder_name)}`}
            className="text-lg text-warm-500 mt-1 hover:text-brand-teal transition-colors inline-block"
          >
            {grant.funder_name}
          </Link>
        ) : (
          <p className="text-lg text-warm-500 mt-1">Unknown Funder</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-warm-100 dark:bg-warm-800/50 rounded-lg">
          {/* Amount — always visible (basic info) */}
          <div>
            <span className="text-xs text-warm-500">Amount</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {grant.amount_max
                ? `Up to $${(grant.amount_max / 1000).toFixed(0)}K`
                : "Varies"}
            </p>
          </div>
          {/* Deadline — exact date blurred for Free */}
          <div>
            <span className="text-xs text-warm-500">Deadline</span>
            {isFree && grant.deadline ? (
              <p className="text-sm font-medium text-warm-900 dark:text-warm-50 blur-sm select-none">
                {new Date(grant.deadline).toLocaleDateString()}
              </p>
            ) : (
              <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
                {grant.deadline
                  ? new Date(grant.deadline).toLocaleDateString()
                  : "Rolling"}
              </p>
            )}
          </div>
          {/* Category — always visible (basic info) */}
          <div>
            <span className="text-xs text-warm-500">Category</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {grant.category || "General"}
            </p>
          </div>
          {/* Recurrence — always visible (basic info) */}
          <div>
            <span className="text-xs text-warm-500">Recurrence</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {grant.recurrence || "One-time"}
            </p>
          </div>
        </div>
      </div>

      {/* TRL Deferred Prompt — shown when grant requires TRL and org hasn't set it */}
      {grant.required_trl_min != null && !(profileRow as unknown as Record<string, unknown>)?.technology_readiness_level && (
        <TRLPrompt requiredTrl={grant.required_trl_min} />
      )}

      {/* Readiness Gauge */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardContent className="p-6">
          <ReadinessGauge overallScore={readinessScore} categories={readinessCategories} />
          <div className="mt-4">
            <AIDisclosure type="readiness" />
          </div>
        </CardContent>
      </Card>

      {/* Evaluate CTA */}
      <div className="flex items-center gap-3 p-4 bg-warm-50 dark:bg-warm-800/30 border border-warm-200 dark:border-warm-700 rounded-lg">
        <ClipboardList className="h-5 w-5 text-brand-teal shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
            Is this grant worth pursuing?
          </p>
          <p className="text-xs text-warm-500">
            Run a 9-criteria scorecard. AI pre-fills 6 — you complete the rest.
          </p>
        </div>
        <Link
          href={`/grants/${id}/evaluate`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-teal text-white text-sm font-medium hover:bg-brand-teal-dark transition-colors whitespace-nowrap"
        >
          Evaluate This Grant
        </Link>
      </div>

      {/* Apply Through GrantAQ */}
      <Card className="border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-2">
            {inPipeline ? "Application In Progress" : "Ready to Apply?"}
          </h2>
          {inPipeline ? (
            <div>
              <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">
                This grant is in your pipeline (stage: <span className="font-medium capitalize">{pipelineStage.replace(/_/g, " ")}</span>).
                Track your progress and submit through GrantAQ to log your outcome.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/pipeline"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-teal text-white text-sm font-medium hover:bg-brand-teal-dark transition-colors"
                >
                  Go to Pipeline
                </Link>
                <Link
                  href={`/grants/${id}/write`}
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-brand-teal text-brand-teal text-sm font-medium hover:bg-brand-teal/10 transition-colors"
                >
                  Write Application
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">
                Apply through GrantAQ — our AI drafts your application, then an expert grant writer reviews and refines it. We track everything so you know exactly where you stand.
              </p>
              <div className="flex gap-3">
                <GrantActionButtons grantId={id} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Paths */}
      <ActionPaths grantId={id} />

      {/* Build Budget CTA */}
      <div className="flex items-center gap-3 p-4 bg-warm-50 dark:bg-warm-800/30 border border-warm-200 dark:border-warm-700 rounded-lg">
        <Calculator className="h-5 w-5 text-brand-teal shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
            Build your project budget
          </p>
          <p className="text-xs text-warm-500">
            Line-item budget builder with indirect cost calculator and AI-generated narrative.
          </p>
        </div>
        <Link
          href={`/grants/${id}/budget`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-teal text-white text-sm font-medium hover:bg-brand-teal-dark transition-colors whitespace-nowrap"
        >
          Build Budget
        </Link>
      </div>

      {/* Application Checklist */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardContent className="p-6">
          <ApplicationChecklist
            grant={{
              id: grant.id,
              name: grant.name,
              funder_name: grant.funder_name,
              source_type: (grant.source_type as "federal" | "state" | "foundation" | "corporate") ?? "foundation",
              amount_max: grant.amount_max ?? null,
              amount_min: grant.amount_min ?? null,
              deadline: grant.deadline ?? null,
              eligibility_types: grant.eligibility_types ?? [],
              category: grant.category ?? null,
            }}
          />
        </CardContent>
      </Card>

      {/* Layer 2 + 3: Expandable detail sections */}
      <Accordion multiple className="space-y-2">
        {/* Full Description — blurred for Free */}
        <AccordionItem
          value="description"
          className="border border-warm-200 dark:border-warm-800 rounded-lg px-4"
        >
          <AccordionTrigger className="text-sm font-medium">
            Full Description
            {isFree && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                (Starter+ required)
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            {isFree ? (
              <div className="relative">
                <p className="text-sm text-warm-600 dark:text-warm-400 whitespace-pre-wrap blur-sm select-none">
                  {grant.description || "No description available."}
                </p>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    size="sm"
                    className="bg-[var(--color-brand-teal)] text-white"
                    render={<Link href="/upgrade">Upgrade to read full description</Link>}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-warm-600 dark:text-warm-400 whitespace-pre-wrap">
                {grant.description || "No description available."}
              </p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Eligibility Details — blurred for Free */}
        <AccordionItem
          value="eligibility"
          className="border border-warm-200 dark:border-warm-800 rounded-lg px-4"
        >
          <AccordionTrigger className="text-sm font-medium">
            Eligibility Details
            {isFree && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                (Starter+ required)
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            {isFree ? (
              <div className="relative">
                <div className="blur-sm select-none space-y-2">
                  <p className="text-sm text-warm-600 dark:text-warm-400">
                    Eligible types: Nonprofit 501c3, Government, Tribal
                  </p>
                  <p className="text-sm text-warm-600 dark:text-warm-400">
                    States: CA, TX, NY, FL, GA
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    size="sm"
                    className="bg-[var(--color-brand-teal)] text-white"
                    render={<Link href="/upgrade">Upgrade to view eligibility</Link>}
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-warm-600 dark:text-warm-400">
                  Eligible types:{" "}
                  {grant.eligibility_types?.join(", ") || "See funder website"}
                </p>
                {grant.states?.length > 0 && (
                  <p className="text-sm text-warm-600 dark:text-warm-400 mt-2">
                    States: {grant.states.join(", ")}
                  </p>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="requirements"
          className="border border-warm-200 dark:border-warm-800 rounded-lg px-4"
        >
          <AccordionTrigger className="text-sm font-medium">
            Application Requirements
          </AccordionTrigger>
          <AccordionContent>
            {requirements && requirements.length > 0 ? (
              <div className="space-y-3">
                {requirements.map((req: { id: string; requirement_type: string; requirement_value: unknown; is_hard_requirement: boolean }) => {
                  const value = (req.requirement_value ?? {}) as Record<string, string>;
                  return (
                    <div key={req.id} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${req.is_hard_requirement ? "bg-red-500" : "bg-amber-500"}`} />
                      <div>
                        <p className="font-medium text-warm-900 dark:text-warm-50">
                          {requirementLabels[req.requirement_type] || req.requirement_type}
                          {req.is_hard_requirement && (
                            <span className="ml-2 text-xs text-red-500 font-normal">Required</span>
                          )}
                        </p>
                        {value.description && (
                          <p className="text-warm-500 text-xs mt-0.5">{value.description}</p>
                        )}
                        {value.minimum && (
                          <p className="text-warm-500 text-xs mt-0.5">Minimum: {value.minimum}</p>
                        )}
                        {value.states && (
                          <p className="text-warm-500 text-xs mt-0.5">States: {value.states}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-warm-500">
                  Common requirements for <span className="font-medium">{grant.source_type}</span> grants:
                </p>
                <ul className="space-y-2 text-sm text-warm-600 dark:text-warm-400">
                  {grant.source_type === "federal" && (
                    <>
                      <li className="flex items-start gap-2"><span className="text-red-500 mt-1">&#x2022;</span> SAM.gov registration (required)</li>
                      <li className="flex items-start gap-2"><span className="text-red-500 mt-1">&#x2022;</span> UEI number (required)</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Audited financial statements (if budget &gt; $750K)</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Project narrative and work plan</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Budget and budget justification</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Letters of support / commitment</li>
                    </>
                  )}
                  {grant.source_type === "foundation" && (
                    <>
                      <li className="flex items-start gap-2"><span className="text-red-500 mt-1">&#x2022;</span> 501(c)(3) determination letter (usually required)</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Organization budget (current year)</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Board of directors list</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Project description and goals</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Most recent annual report or Form 990</li>
                    </>
                  )}
                  {grant.source_type === "state" && (
                    <>
                      <li className="flex items-start gap-2"><span className="text-red-500 mt-1">&#x2022;</span> State registration / good standing certificate</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Proof of operation in the state</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Project budget with state match (if applicable)</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Organizational capacity statement</li>
                    </>
                  )}
                  {grant.source_type === "corporate" && (
                    <>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Organization overview and mission</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Impact metrics and outcomes data</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Project proposal and timeline</li>
                      <li className="flex items-start gap-2"><span className="text-amber-500 mt-1">&#x2022;</span> Budget summary</li>
                    </>
                  )}
                </ul>
                <p className="text-xs text-warm-400 italic">
                  Specific requirements for this grant will be shown once extracted from the funder&apos;s website.
                </p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        {/* Grant Details — new enrichment fields */}
        <AccordionItem
          value="details"
          className="border border-warm-200 dark:border-warm-800 rounded-lg px-4"
        >
          <AccordionTrigger className="text-sm font-medium">
            Grant Details
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {grant.cfda_number && (
                <div>
                  <span className="text-xs text-warm-500">CFDA/ALN Number</span>
                  <p className="text-warm-900 dark:text-warm-50">{grant.cfda_number}</p>
                </div>
              )}
              {grant.opportunity_number && (
                <div>
                  <span className="text-xs text-warm-500">Opportunity Number</span>
                  <p className="text-warm-900 dark:text-warm-50">{grant.opportunity_number}</p>
                </div>
              )}
              {grant.naics_code && (
                <div>
                  <span className="text-xs text-warm-500">NAICS Code</span>
                  <p className="text-warm-900 dark:text-warm-50">{grant.naics_code}</p>
                </div>
              )}
              {grant.eligible_naics?.length > 0 && (
                <div>
                  <span className="text-xs text-warm-500">Eligible NAICS</span>
                  <p className="text-warm-900 dark:text-warm-50">{grant.eligible_naics.join(", ")}</p>
                </div>
              )}
              {grant.estimated_funding && (
                <div>
                  <span className="text-xs text-warm-500">Estimated Total Funding</span>
                  <p className="text-warm-900 dark:text-warm-50">${Number(grant.estimated_funding).toLocaleString()}</p>
                </div>
              )}
              {grant.estimated_awards_count && (
                <div>
                  <span className="text-xs text-warm-500">Expected Awards</span>
                  <p className="text-warm-900 dark:text-warm-50">{grant.estimated_awards_count}</p>
                </div>
              )}
              {grant.amount_min != null && grant.amount_max != null && (
                <div>
                  <span className="text-xs text-warm-500">Award Range</span>
                  <p className="text-warm-900 dark:text-warm-50">${Number(grant.amount_min).toLocaleString()} – ${Number(grant.amount_max).toLocaleString()}</p>
                </div>
              )}
              {grant.open_date && (
                <div>
                  <span className="text-xs text-warm-500">Open Date</span>
                  <p className="text-warm-900 dark:text-warm-50">{new Date(grant.open_date).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-warm-500">SAM.gov Required</span>
                <p className="text-warm-900 dark:text-warm-50">{grant.requires_sam ? "Yes" : "No"}</p>
              </div>
              <div>
                <span className="text-xs text-warm-500">Cost Sharing</span>
                <p className="text-warm-900 dark:text-warm-50">{grant.cost_sharing_required ? "Yes" : "No"}</p>
              </div>
              {grant.match_required_pct != null && grant.match_required_pct > 0 && (
                <div>
                  <span className="text-xs text-warm-500">Matching Funds Required</span>
                  <p className="text-warm-900 dark:text-warm-50">{grant.match_required_pct}%</p>
                </div>
              )}
              {grant.required_certification && (
                <div>
                  <span className="text-xs text-warm-500">Required Certification</span>
                  <p className="text-warm-900 dark:text-warm-50">{grant.required_certification.toUpperCase()}</p>
                </div>
              )}
              {grant.set_aside_code && (
                <div>
                  <span className="text-xs text-warm-500">Set-Aside</span>
                  <p className="text-warm-900 dark:text-warm-50">{grant.set_aside_code}</p>
                </div>
              )}
              {grant.funding_activity_category && (
                <div>
                  <span className="text-xs text-warm-500">Funding Category</span>
                  <p className="text-warm-900 dark:text-warm-50">{grant.funding_activity_category}</p>
                </div>
              )}
              {grant.new_applicant_friendly && (
                <div className="col-span-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                    New Applicant Friendly
                  </span>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Bottom action — add to pipeline if not already */}
      {!inPipeline && <GrantActionButtons grantId={id} />}

      {/* Report incorrect info */}
      <div className="flex justify-center pt-4">
        <ReportIssueButton grantId={id} />
      </div>
    </div>
  );
}
