import { createServerSupabaseClient } from "@/lib/supabase/server";
import { KanbanBoard, type PipelineItem } from "@/components/pipeline/kanban-board";
import { PipelineSummary } from "@/components/pipeline/pipeline-summary";
import { EmptyState } from "@/components/shared/empty-state";

export default async function PipelinePage() {
  const supabase = await createServerSupabaseClient();
  const { data: items } = await supabase
    .from("grant_pipeline")
    .select("*, grant_sources(name, funder_name, amount_max, deadline)")
    .order("created_at", { ascending: false });

  if (!items?.length) {
    return (
      <div className="p-6 max-w-6xl">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-6">Pipeline</h1>
        <EmptyState
          title="No grants in your pipeline"
          description="Save grants from your matches to start tracking your applications."
          actionLabel="Browse Matches"
          actionHref="/matches"
        />
      </div>
    );
  }

  const pipelineItems: PipelineItem[] = items.map((item: any) => ({
    id: item.id,
    stage: item.stage ?? "researching",
    grantName: item.grant_sources?.name ?? "Unknown Grant",
    funderName: item.grant_sources?.funder_name ?? "Unknown Funder",
    amount: item.grant_sources?.amount_max ?? null,
    deadline: item.grant_sources?.deadline ?? item.deadline ?? null,
    progress: 0,
    aiStatus: "Ready to start",
  }));

  return (
    <div className="p-6 max-w-full">
      <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-4">Pipeline</h1>
      <PipelineSummary items={pipelineItems} />
      <div className="mt-6">
        <KanbanBoard items={pipelineItems} onStageChange={async () => {}} />
      </div>
    </div>
  );
}
