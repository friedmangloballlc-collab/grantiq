import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GoalProgress } from "@/components/roadmap/goal-progress";
import { DiversityScore } from "@/components/roadmap/diversity-score";
import { RoadmapTimeline } from "@/components/roadmap/roadmap-timeline";
import { EmptyState } from "@/components/shared/empty-state";

export default async function RoadmapPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6 max-w-6xl">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-6">
          Funding Roadmap
        </h1>
        <EmptyState
          title="Not signed in"
          description="Please sign in to view your funding roadmap."
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
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-6">
          Funding Roadmap
        </h1>
        <EmptyState
          title="No organization found"
          description="Complete your profile setup to generate your funding roadmap."
          actionLabel="Complete Profile"
          actionHref="/onboarding"
        />
      </div>
    );
  }

  const { data: roadmaps } = await db
    .from("funding_roadmaps")
    .select("*")
    .eq("org_id", orgId)
    .order("year")
    .order("quarter");

  if (!roadmaps?.length) {
    return (
      <div className="p-6 max-w-6xl">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-6">
          Funding Roadmap
        </h1>
        <EmptyState
          title="No roadmap yet"
          description="Run a grant match to generate your AI-powered 12-month funding strategy."
          actionLabel="Find Matches"
          actionHref="/matches"
        />
      </div>
    );
  }

  const quarters = roadmaps.map((rm: any) => ({
    id: rm.id,
    quarter: rm.quarter,
    year: rm.year,
    recommendedGrants: rm.recommended_grants ?? [],
    totalPotentialAmount: rm.total_potential_amount ?? 0,
  }));

  const totalPotential = quarters.reduce(
    (sum: number, q: any) => sum + q.totalPotentialAmount,
    0
  );

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
        12-Month Funding Roadmap
      </h1>
      <GoalProgress secured={0} goal={totalPotential || 500000} />
      <DiversityScore federal={3} state={2} foundation={4} corporate={1} />
      <RoadmapTimeline quarters={quarters} />
    </div>
  );
}
