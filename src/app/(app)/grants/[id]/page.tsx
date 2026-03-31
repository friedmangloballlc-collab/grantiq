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
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GrantDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: grant } = await supabase
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
    const admin = createAdminClient();
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

  return (
    <div className="max-w-4xl space-y-8">
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

      {/* Action Paths */}
      <div>
        <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-3">
          Ready to Apply?
        </h2>
        <ActionPaths grantId={id} />
      </div>

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
            <p className="text-sm text-warm-500">
              Requirements will be populated from grant_requirements table.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Sticky bottom actions */}
      <GrantActionButtons grantId={id} />
    </div>
  );
}
