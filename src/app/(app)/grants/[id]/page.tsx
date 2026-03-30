import { createServerSupabaseClient } from "@/lib/supabase/server";
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
        <p className="text-lg text-warm-500 mt-1">{grant.funder_name}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-warm-100 dark:bg-warm-800/50 rounded-lg">
          <div>
            <span className="text-xs text-warm-500">Amount</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {grant.amount_max
                ? `Up to $${(grant.amount_max / 1000).toFixed(0)}K`
                : "Varies"}
            </p>
          </div>
          <div>
            <span className="text-xs text-warm-500">Deadline</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {grant.deadline
                ? new Date(grant.deadline).toLocaleDateString()
                : "Rolling"}
            </p>
          </div>
          <div>
            <span className="text-xs text-warm-500">Category</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {grant.category || "General"}
            </p>
          </div>
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

      {/* Action Paths */}
      <div>
        <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-3">
          Ready to Apply?
        </h2>
        <ActionPaths grantId={id} />
      </div>

      {/* Layer 2 + 3: Expandable detail sections */}
      <Accordion multiple className="space-y-2">
        <AccordionItem
          value="description"
          className="border border-warm-200 dark:border-warm-800 rounded-lg px-4"
        >
          <AccordionTrigger className="text-sm font-medium">
            Full Description
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-warm-600 dark:text-warm-400 whitespace-pre-wrap">
              {grant.description || "No description available."}
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="eligibility"
          className="border border-warm-200 dark:border-warm-800 rounded-lg px-4"
        >
          <AccordionTrigger className="text-sm font-medium">
            Eligibility Details
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-warm-600 dark:text-warm-400">
              Eligible types:{" "}
              {grant.eligibility_types?.join(", ") || "See funder website"}
            </p>
            {grant.states?.length > 0 && (
              <p className="text-sm text-warm-600 dark:text-warm-400 mt-2">
                States: {grant.states.join(", ")}
              </p>
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
