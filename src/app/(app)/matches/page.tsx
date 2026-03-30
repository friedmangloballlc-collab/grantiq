import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MatchCard } from "@/components/grants/match-card";
import { EmptyState } from "@/components/shared/empty-state";

export default async function MatchesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Grant Matches</h1>
        <EmptyState
          title="Not signed in"
          description="Please sign in to view your grant matches."
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
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Grant Matches</h1>
        <EmptyState
          title="No organization found"
          description="Complete your profile setup to start seeing grant matches."
          actionLabel="Complete Profile"
          actionHref="/onboarding"
        />
      </div>
    );
  }

  const { data: matches } = await db
    .from("grant_matches")
    .select("*, grant_sources(*)")
    .eq("org_id", orgId)
    .order("match_score", { ascending: false })
    .limit(50);

  if (!matches?.length) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Grant Matches
        </h1>
        <EmptyState
          title="No matches yet"
          description="Complete your organization profile to get AI-powered grant matches."
          actionLabel="Complete Profile"
          actionHref="/onboarding"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
            Grant Matches
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            {matches.length} grants matched to your profile
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match: any) => (
          <MatchCard
            key={match.id}
            id={match.grant_source_id}
            grantName={match.grant_sources?.name ?? "Unknown Grant"}
            funderName={match.grant_sources?.funder_name ?? "Unknown Funder"}
            sourceType={match.grant_sources?.source_type ?? "federal"}
            amountMax={match.grant_sources?.amount_max}
            deadline={match.grant_sources?.deadline}
            matchScore={Math.round(match.match_score)}
            scoreBreakdown={match.scores ?? match.score_breakdown ?? {}}
            missingRequirements={match.missing_requirements ?? []}
          />
        ))}
      </div>
    </div>
  );
}
