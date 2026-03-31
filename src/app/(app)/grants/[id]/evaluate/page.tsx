import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Scorecard } from "@/components/grants/scorecard";
import { buildScorecard } from "@/lib/qualification/grant-scorecard";
import type {
  ScorecardGrant,
  ScorecardOrg,
} from "@/lib/qualification/grant-scorecard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EvaluateGrantPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Auth + org membership
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) notFound();
  const orgId = membership.org_id;

  // Fetch grant
  const { data: grant } = await supabase
    .from("grant_sources")
    .select(
      "id, name, source_type, eligibility_types, states, amount_min, amount_max, deadline, funder_id"
    )
    .eq("id", id)
    .single();

  if (!grant) notFound();

  // Fetch org
  const { data: org } = await supabase
    .from("organizations")
    .select("id, entity_type, state, annual_budget")
    .eq("id", orgId)
    .single();

  if (!org) notFound();

  // Fetch capabilities
  const { data: capabilities } = await supabase
    .from("org_capabilities")
    .select("prior_federal_grants, prior_foundation_grants, staff_count")
    .eq("org_id", orgId)
    .single();

  // Fetch existing match score for mission alignment
  const { data: matchScore } = await supabase
    .from("grant_matches")
    .select("match_score, score_breakdown")
    .eq("org_id", orgId)
    .eq("grant_source_id", id)
    .single();

  // Fetch active pipeline count for capacity estimation
  const { count: activePipelineCount } = await supabase
    .from("grant_pipeline")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .not("stage", "in", '("awarded","declined")');

  // Build typed inputs
  const scorecardGrant: ScorecardGrant = {
    id: grant.id,
    name: grant.name,
    source_type: grant.source_type,
    eligibility_types: grant.eligibility_types,
    states: grant.states,
    amount_min: grant.amount_min,
    amount_max: grant.amount_max,
    deadline: grant.deadline,
    funder_id: grant.funder_id,
  };

  // Extract mission alignment from score breakdown if available
  const missionAlignmentScore: number | null =
    matchScore?.score_breakdown?.mission_alignment ??
    (matchScore?.match_score ? matchScore.match_score * 10 : null);

  const scorecardOrg: ScorecardOrg = {
    id: org.id,
    entity_type: org.entity_type,
    state: org.state,
    annual_budget: org.annual_budget,
    capabilities: capabilities ?? undefined,
    missionAlignmentScore,
    activePipelineCount: activePipelineCount ?? 0,
  };

  // Check for existing saved scorecard
  const { data: existingScorecard } = await supabase
    .from("grant_scorecards")
    .select("criteria, total_score, priority, auto_disqualified, disqualify_reason")
    .eq("org_id", orgId)
    .eq("grant_source_id", id)
    .single();

  // Build scorecard (use existing criteria user scores if available)
  const result = buildScorecard(scorecardGrant, scorecardOrg);

  // Merge any saved user scores back in
  if (existingScorecard?.criteria) {
    const savedCriteria = existingScorecard.criteria as Array<{
      id: string;
      userScore: number | null;
    }>;
    savedCriteria.forEach((saved) => {
      if (saved.userScore !== null) {
        const criterion = result.criteria.find((c) => c.id === saved.id);
        if (criterion) {
          criterion.userScore = saved.userScore;
          criterion.finalScore = saved.userScore;
        }
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/grants/${id}`}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Grant Details
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Evaluate This Grant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI has pre-filled 6 of 9 criteria. Complete the 3 judgment calls to
          get your full pursuit score.
        </p>
      </div>

      <Scorecard initialResult={result} grantName={grant.name} />
    </div>
  );
}
