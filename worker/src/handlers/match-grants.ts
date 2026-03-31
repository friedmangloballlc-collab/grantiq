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
 *    - Before AI scoring, check match_cache for already-scored grants with the
 *      same org profile hash (within 24 hours). Cached entries bypass the AI
 *      call entirely and are served from the cache table.
 *    - After scoring, newly computed results are written back to match_cache.
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

    // 3. Stage 1: Vector Recall — top 200 by cosine similarity
    const vectorResults = await vectorRecall(org.mission_embedding);

    if (vectorResults.length === 0) {
      return { status: "completed", matches_found: 0, matches_scored: 0 };
    }

    // 4. Stage 2: Hard Filter — eligibility, geography, deadlines
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

    // 5. match_cache lookup — find grants already scored for this org+profile_hash
    //    within the last 24 hours to avoid redundant AI calls.
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const candidateIds = filteredCandidates.map((c) => c.id);

    const { data: cachedEntries } = await db
      .from("match_cache")
      .select("grant_id, match_score, match_reasoning, vector_similarity, ai_score, created_at")
      .eq("org_id", org_id)
      .eq("org_profile_hash", profileHash)
      .in("grant_id", candidateIds)
      .gte("created_at", twentyFourHoursAgo);

    const cachedByGrantId = new Map(
      (cachedEntries ?? []).map((entry) => [entry.grant_id, entry])
    );

    const cachedGrantIds = new Set(cachedByGrantId.keys());
    const uncachedCandidates = filteredCandidates.filter((c) => !cachedGrantIds.has(c.id));

    console.log(
      `match_grants: ${cachedGrantIds.size} cached, ${uncachedCandidates.length} need AI scoring`
    );

    // 6. Stage 3: AI Scoring — only score grants not already in match_cache
    type ScoredGrant = {
      grant_id: string;
      match_score: number;
      score_breakdown: Record<string, unknown>;
      why_it_matches: string[];
      missing_requirements: string[];
      win_probability: "low" | "moderate" | "high" | "very_high";
      recommended_action: string;
    };
    let newlyScoredGrants: ScoredGrant[] = [];

    if (uncachedCandidates.length > 0) {
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
        uncachedCandidates.map((c) => ({
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

      newlyScoredGrants = scoringResult.scored_grants;

      // Write newly scored grants into match_cache for future reuse
      if (newlyScoredGrants.length > 0) {
        const cacheRows = newlyScoredGrants.map((scored) => {
          const vectorMatch = uncachedCandidates.find((c) => c.id === scored.grant_id);
          return {
            org_id,
            org_profile_hash: profileHash,
            grant_id: scored.grant_id,
            match_score: scored.match_score,
            match_reasoning: scored.why_it_matches?.join("\n") ?? null,
            vector_similarity: vectorMatch?.similarity ?? null,
            ai_score: scored.match_score,
          };
        });
        const { error: cacheError } = await db
          .from("match_cache")
          .upsert(cacheRows, { onConflict: "org_id,grant_id,org_profile_hash" });
        if (cacheError) {
          // Non-fatal: log and continue — results are still saved to grant_matches
          console.warn("match_grants: failed to write match_cache:", cacheError.message);
        }
      }
    }

    // 7. Merge cached + newly scored results, then upsert into grant_matches
    await db.from("grant_matches").delete().eq("org_id", org_id);

    const computedAt = new Date().toISOString();

    // Rows from newly scored grants
    const newMatchRows = newlyScoredGrants.map((scored) => {
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

    // Rows restored from match_cache (re-use previously scored data)
    const cachedMatchRows = Array.from(cachedByGrantId.values()).map((cached) => {
      const vectorMatch = filteredCandidates.find((c) => c.id === cached.grant_id);
      return {
        org_id,
        grant_source_id: cached.grant_id,
        match_score: cached.match_score,
        score_breakdown: {},
        match_reasons: { why_it_matches: cached.match_reasoning ? [cached.match_reasoning] : [] },
        missing_requirements: [] as string[],
        win_probability: null,
        difficulty_rating: null,
        recommended_quarter: null,
        model_version: "claude-sonnet-4-20250514",
        embedding_similarity: cached.vector_similarity ?? vectorMatch?.similarity ?? null,
        last_computed: computedAt,
        computed_at: computedAt,
        profile_hash: profileHash,
      };
    });

    const allMatchRows = [...newMatchRows, ...cachedMatchRows];

    if (allMatchRows.length > 0) {
      const { error: insertError } = await db.from("grant_matches").insert(allMatchRows);
      if (insertError) {
        console.error("Failed to insert match results:", insertError);
        return {
          status: "failed",
          matches_found: filteredCandidates.length,
          matches_scored: newlyScoredGrants.length + cachedGrantIds.size,
          error: `Failed to save results: ${insertError.message}`,
        };
      }
    }

    return {
      status: "completed",
      matches_found: filteredCandidates.length,
      matches_scored: newlyScoredGrants.length + cachedGrantIds.size,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("match_grants handler failed:", message);
    return { status: "failed", matches_found: 0, matches_scored: 0, error: message };
  }
}
