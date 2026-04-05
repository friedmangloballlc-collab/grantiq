import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type PipelineItem } from "@/components/pipeline/kanban-board";
import { PipelineBoardWrapper } from "@/components/pipeline/pipeline-board-wrapper";
import { PipelineSummary } from "@/components/pipeline/pipeline-summary";
import { StageGuide } from "@/components/pipeline/stage-guide";
import { EmptyState } from "@/components/shared/empty-state";
import { AddGrantDialog } from "@/components/pipeline/add-grant-dialog";

export default async function PipelinePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6 max-w-6xl">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-6">Pipeline</h1>
        <EmptyState
          title="Not signed in"
          description="Please sign in to view your pipeline."
          actionLabel="Sign In"
          actionHref="/login"
        />
      </div>
    );
  }

  const db = createAdminClient();

  const { data: membership } = await db
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();

  const orgId = membership?.org_id;

  if (!orgId) {
    return (
      <div className="p-6 max-w-6xl">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-6">Pipeline</h1>
        <EmptyState
          title="No organization found"
          description="Complete your profile setup to start tracking your pipeline."
          actionLabel="Complete Profile"
          actionHref="/onboarding"
        />
      </div>
    );
  }

  const { data: items } = await db
    .from("grant_pipeline")
    .select("*, grant_sources(name, funder_name, amount_max, deadline)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (!items?.length) {
    return (
      <div className="p-6 max-w-6xl">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-6">Pipeline</h1>
        <EmptyState variant="pipeline" />
      </div>
    );
  }

  // Normalize legacy stage values to the 8-stage schema
  const STAGE_MIGRATION: Record<string, string> = {
    researching: "identified",
    preparing: "qualified",
    writing: "in_development",
  };

  const pipelineItems: PipelineItem[] = items.map((item: any) => {
    const rawStage = item.stage ?? "identified";
    const stage = STAGE_MIGRATION[rawStage] ?? rawStage;
    return {
      id: item.id,
      stage,
      grantName: item.grant_sources?.name ?? "Unknown Grant",
      funderName: item.grant_sources?.funder_name ?? "Unknown Funder",
      amount: item.grant_sources?.amount_max ?? null,
      deadline: item.grant_sources?.deadline ?? item.deadline ?? null,
      progress: 0,
      aiStatus: "Ready to start",
      loiStatus: item.loi_status ?? null,
    };
  });

  return (
    <div className="px-4 md:px-6 py-6 max-w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Pipeline</h1>
        <AddGrantDialog />
      </div>
      <PipelineSummary items={pipelineItems} />
      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <PipelineBoardWrapper items={pipelineItems} />
        </div>
        <div className="lg:w-80 shrink-0">
          <StageGuide />
        </div>
      </div>
    </div>
  );
}
