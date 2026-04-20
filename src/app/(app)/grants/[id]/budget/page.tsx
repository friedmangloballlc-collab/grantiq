import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calculator } from "lucide-react";
import { BudgetBuilder } from "@/components/budget/budget-builder";
import { AIDisclosure } from "@/components/shared/ai-disclosure";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GrantBudgetPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Admin-client bypass for RLS on grant_sources (same pattern as
  // commits 28425fd + 30a1850). auth.getUser stays on user-scoped client.
  const admin = createAdminClient();

  const { data: grant } = await admin
    .from("grant_sources")
    .select("id, name, funder_name, source_type, amount_min, amount_max")
    .eq("id", id)
    .single();

  if (!grant) notFound();

  // Fetch org name for narrative context
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let orgName: string | undefined;
  if (user) {
    const { data: membership } = await admin
      .from("org_members")
      .select("org_id, organizations(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();
    // @ts-expect-error - Supabase join type
    orgName = membership?.organizations?.name ?? undefined;
  }

  return (
    <div className="max-w-4xl px-4 md:px-6 py-6 space-y-6">
      {/* Back link */}
      <Link
        href={`/grants/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-warm-500 hover:text-warm-700 dark:hover:text-warm-300 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to grant
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-5 h-5 text-brand-teal" />
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-teal">
            Budget Builder
          </span>
        </div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          {grant.name}
        </h1>
        <p className="text-warm-500 mt-1">
          {grant.funder_name}
          {grant.amount_max && (
            <span className="ml-2 text-warm-400">
              &middot; Up to ${(grant.amount_max / 1000).toFixed(0)}K
            </span>
          )}
        </p>
      </div>

      {/* Instructions */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1">How to use the Budget Builder</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-600 dark:text-blue-400">
          <li>Add line items to each budget category below</li>
          <li>Enter description, quantity, and unit cost — totals auto-calculate</li>
          <li>Select your indirect cost rate (default: 10% federal de minimis)</li>
          <li>Click &quot;Generate Budget Narrative&quot; to have AI write the justification</li>
          <li>Export as CSV or copy the narrative for your application</li>
        </ul>
      </div>

      {/* Budget Builder client component */}
      <BudgetBuilder
        grantId={grant.id}
        grantName={grant.name}
        funderName={grant.funder_name}
        sourceType={grant.source_type ?? "foundation"}
        amountMax={grant.amount_max ?? null}
        amountMin={grant.amount_min ?? null}
        orgName={orgName}
      />

      <AIDisclosure type="draft" />
    </div>
  );
}
