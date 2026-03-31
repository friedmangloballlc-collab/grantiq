import { createAdminClient } from "../../../src/lib/supabase/admin";
import { assessReadiness } from "../../../src/lib/ai/engines/readiness";
import { computeProfileHash } from "../../../src/lib/ai/cache";

interface ScoreReadinessPayload {
  org_id: string;
  user_id: string;
  tier: string;
}

interface ScoreReadinessResult {
  status: "completed" | "failed";
  overall_score: number | null;
  tier_label: string | null;
  error?: string;
}

/**
 * score_readiness job handler
 *
 * Fetches org capabilities, runs Readiness Engine, stores results in readiness_scores table.
 */
export async function handleScoreReadiness(
  payload: ScoreReadinessPayload
): Promise<ScoreReadinessResult> {
  const db = createAdminClient();
  const { org_id, user_id, tier } = payload;

  try {
    // 1. Fetch org data + capabilities + profile
    const { data: org, error: orgError } = await db
      .from("organizations")
      .select("*, org_profiles(*), org_capabilities(*)")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return { status: "failed", overall_score: null, tier_label: null, error: "Organization not found" };
    }

    const capabilities = org.org_capabilities?.[0] ?? org.org_capabilities ?? {};
    const profile = org.org_profiles?.[0] ?? org.org_profiles ?? {};

    // 2. Check profile hash cache — skip AI call if profile hasn't changed
    const profileHash = computeProfileHash({ ...capabilities, ...profile });

    const { data: latestScore } = await db
      .from("readiness_scores")
      .select("overall_score, tier_label, profile_hash")
      .eq("org_id", org_id)
      .order("scored_at", { ascending: false })
      .limit(1)
      .single();

    if (latestScore && latestScore.profile_hash === profileHash) {
      console.log(`score_readiness: cache hit for org ${org_id}, skipping AI call`);
      return {
        status: "completed",
        overall_score: latestScore.overall_score,
        tier_label: latestScore.tier_label,
      };
    }

    // 3. Run Readiness Engine
    const result = await assessReadiness(
      { orgId: org_id, userId: user_id, tier },
      {
        name: org.name,
        entity_type: org.entity_type,
        mission_statement: org.mission_statement ?? "",
        state: org.state,
        annual_budget: org.annual_budget ?? capabilities.annual_budget,
        employee_count: org.employee_count,
        years_operating: capabilities.years_operating ?? 0,
        has_501c3: capabilities.has_501c3 ?? false,
        has_ein: capabilities.has_ein ?? false,
        has_sam_registration: capabilities.has_sam_registration ?? false,
        has_grants_gov: capabilities.has_grants_gov ?? false,
        has_audit: capabilities.has_audit ?? false,
        has_fiscal_sponsor: capabilities.has_fiscal_sponsor ?? false,
        has_grant_writer: capabilities.has_grant_writer ?? false,
        prior_federal_grants: capabilities.prior_federal_grants ?? 0,
        prior_foundation_grants: capabilities.prior_foundation_grants ?? 0,
        sam_gov_status: capabilities.sam_gov_status ?? "none",
        grants_gov_status: capabilities.grants_gov_status ?? "not_registered",
        program_areas: profile.program_areas ?? [],
        population_served: profile.population_served ?? [],
        grant_history_level: profile.grant_history_level ?? null,
        outcomes_tracking: profile.outcomes_tracking ?? false,
      }
    );

    // 4. Store results in readiness_scores table
    const { error: insertError } = await db.from("readiness_scores").insert({
      org_id,
      criteria: result.criteria,
      overall_score: result.overall_score,
      gaps: result.top_3_gaps.map((g) => g.gap_description),
      recommendations: result.top_3_gaps.map((g) => g.fix_action),
      profile_hash: profileHash,
      scored_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Failed to save readiness score:", insertError);
      return {
        status: "failed",
        overall_score: result.overall_score,
        tier_label: result.tier_label,
        error: `Results computed but failed to save: ${insertError.message}`,
      };
    }

    return {
      status: "completed",
      overall_score: result.overall_score,
      tier_label: result.tier_label,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("score_readiness handler failed:", message);
    return { status: "failed", overall_score: null, tier_label: null, error: message };
  }
}
