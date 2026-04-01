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

  const readinessCategories = [
    {
      name: "Eligibility",
      status: "ready" as const,
      message: "Your entity type qualifies",
    },
    {
      name: "Financials",
      status: "needs_attention" as const,
      message: "Audit may be required",
      fixAction: { label: "Upload Audit", href: "/settings" },
    },
    {
      name: "Track Record",
      status: "ready" as const,
      message: "Prior grant history meets threshold",
    },
    {
      name: "Capacity",
      status: "ready" as const,
      message: "Staff capacity sufficient",
    },
    {
      name: "Narrative Strength",
      status: "needs_attention" as const,
      message: "Mission statement could be stronger",
      fixAction: { label: "Improve", href: "/settings" },
    },
    {
      name: "Documents",
      status: "blocker" as const,
      message: "Missing required board list",
      fixAction: { label: "Upload", href: "/settings" },
    },
  ];

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

      {/* Readiness Gauge */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardContent className="p-6">
          <ReadinessGauge overallScore={68} categories={readinessCategories} />
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
                Apply through GrantAQ so we can track your application, manage deadlines, and log your outcome. This helps us improve your match accuracy over time.
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
