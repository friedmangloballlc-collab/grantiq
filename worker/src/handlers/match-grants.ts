import { createAdminClient } from "../../../src/lib/supabase/admin";
import { vectorRecall } from "../../../src/lib/matching/vector-recall";
import { applyHardFilters, type HardFilterInput } from "../../../src/lib/matching/hard-filter";
import { scoreGrantBatch } from "../../../src/lib/ai/engines/match";
import { computeProfileHash } from "../../../src/lib/ai/cache";

interface MatchGrantsPayload {
  org_id: string;
  user_id: string;
  tier: string;
}

interface MatchGrantsResult {
  status: "completed" | "failed";
  matches_found: number;
  matches_scored: number;
  error?: string;
}

/**
 * match_grants job handler
 *
 * Full 3-stage pipeline:
 * 1. Vector Recall: pgvector top-200 by mission similarity
 * 2. Hard Filter: SQL eligibility checks → ~40-80 candidates
 * 3. AI Scoring: Claude Sonnet scores each on 6 dimensions → final ranked list
 *
 * Results written to grant_matches table.
 */
export async function handleMatchGrants(
  payload: MatchGrantsPayload
): Promise<MatchGrantsResult> {
  const db = createAdminClient();
  const { org_id, user_id, tier } = payload;

  try {
    // 1. Fetch org profile + capabilities
    const { data: org, error: orgError } = await db
      .from("organizations")
      .select("*, org_profiles(*), org_capabilities(*)")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return { status: "failed", matches_found: 0, matches_scored: 0, error: "Organization not found" };
    }

    if (!org.mission_embedding) {
      return {
        status: "failed",
        matches_found: 0,
        matches_scored: 0,
        error: "Organization mission embedding not generated yet. Complete your profile first.",
      };
    }

    // 2. Cache check — skip full pipeline if profile unchanged within last 24 hours
    const capabilities = org.org_capabilities?.[0] ?? org.org_capabilities ?? {};
    const orgProfile = org.org_profiles?.[0] ?? org.org_profiles ?? {};
    const profileHash = computeProfileHash({ ...capabilities, ...orgProfile });

    const { data: latestMatch } = await db
      .from("grant_matches")
      .select("computed_at, profile_hash")
      .eq("org_id", org_id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .single();

    if (latestMatch && latestMatch.profile_hash === profileHash && latestMatch.computed_at) {
      const computedAt = new Date(latestMatch.computed_at).getTime();
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (computedAt > twentyFourHoursAgo) {
        console.log(`match_grants: cache hit for org ${org_id}, skipping full pipeline`);
        const { count } = await db
          .from("grant_matches")
          .select("*", { count: "exact", head: true })
          .eq("org_id", org_id);
        return {
          status: "completed",
          matches_found: count ?? 0,
          matches_scored: count ?? 0,
        };
      }
    }

    // 4. Stage 1: Vector Recall — top 200 by cosine similarity
    const vectorResults = await vectorRecall(org.mission_embedding);

    if (vectorResults.length === 0) {
      return { status: "completed", matches_found: 0, matches_scored: 0 };
    }

    // 5. Stage 2: Hard Filter — eligibility, geography, deadlines
    const filterInput: HardFilterInput = {
      entity_type: org.entity_type,
      state: org.state,
      annual_budget: org.annual_budget ?? capabilities.annual_budget,
      has_501c3: capabilities.has_501c3 ?? false,
      has_sam_registration: capabilities.has_sam_registration ?? false,
      has_audit: capabilities.has_audit ?? false,
      years_operating: capabilities.years_operating ?? 0,
    };

    const filteredCandidates = applyHardFilters(vectorResults, filterInput);

    if (filteredCandidates.length === 0) {
      return { status: "completed", matches_found: 0, matches_scored: 0 };
    }

    // 6. Stage 3: AI Scoring — Claude Sonnet scores each grant
    const scoringResult = await scoreGrantBatch(
      { orgId: org_id, userId: user_id, tier },
      {
        name: org.name,
        entity_type: org.entity_type,
        mission_statement: org.mission_statement ?? "",
        state: org.state,
        city: org.city,
        annual_budget: org.annual_budget,
        employee_count: org.employee_count,
        program_areas: orgProfile.program_areas ?? [],
        population_served: orgProfile.population_served ?? [],
        grant_history_level: orgProfile.grant_history_level ?? null,
        has_501c3: capabilities.has_501c3 ?? false,
        has_sam_registration: capabilities.has_sam_registration ?? false,
        has_audit: capabilities.has_audit ?? false,
        years_operating: capabilities.years_operating ?? 0,
        prior_federal_grants: capabilities.prior_federal_grants ?? 0,
        prior_foundation_grants: capabilities.prior_foundation_grants ?? 0,
        industry: orgProfile.industry ?? null,
      },
      filteredCandidates.map((c) => ({
        id: c.id,
        name: c.name,
        funder_name: c.funder_name,
        source_type: c.source_type,
        amount_min: c.amount_min,
        amount_max: c.amount_max,
        description: c.description,
        deadline: c.deadline,
        states: c.states,
        eligibility_types: c.eligibility_types,
      }))
    );

    // 7. Upsert results into grant_matches table
    // Delete old matches for this org first, then insert new ones
    await db.from("grant_matches").delete().eq("org_id", org_id);

    const computedAt = new Date().toISOString();
    const matchRows = scoringResult.scored_grants.map((scored) => {
      const vectorMatch = filteredCandidates.find((c) => c.id === scored.grant_id);
      return {
        org_id,
        grant_source_id: scored.grant_id,
        match_score: scored.match_score,
        score_breakdown: scored.score_breakdown,
        match_reasons: { why_it_matches: scored.why_it_matches },
        missing_requirements: scored.missing_requirements,
        win_probability: scored.win_probability,
        difficulty_rating: scored.recommended_action === "skip" ? "very_hard" : "moderate",
        recommended_quarter: null, // Strategy Engine fills this
        model_version: "claude-sonnet-4-20250514",
        embedding_similarity: vectorMatch?.similarity ?? null,
        last_computed: computedAt,
        computed_at: computedAt,
        profile_hash: profileHash,
      };
    });

    if (matchRows.length > 0) {
      const { error: insertError } = await db.from("grant_matches").insert(matchRows);
      if (insertError) {
        console.error("Failed to insert match results:", insertError);
        return {
          status: "failed",
          matches_found: filteredCandidates.length,
          matches_scored: scoringResult.scored_grants.length,
          error: `Failed to save results: ${insertError.message}`,
        };
      }
    }

    return {
      status: "completed",
      matches_found: filteredCandidates.length,
      matches_scored: scoringResult.scored_grants.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("match_grants handler failed:", message);
    return { status: "failed", matches_found: 0, matches_scored: 0, error: message };
  }
}
