import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { vectorRecall } from "@/lib/matching/vector-recall";
import { applyHardFilters, type HardFilterInput } from "@/lib/matching/hard-filter";
import { scoreGrantBatch, type OrgProfile, type GrantForScoring } from "@/lib/ai/engines/match";
import { assessReadiness } from "@/lib/ai/engines/readiness";
import { computeProfileHash } from "@/lib/ai/cache";
import type { OrgProfileFields } from "@/lib/ai/schemas/readiness";

export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    // Get org_id from org_members
    const { data: membership, error: memberErr } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (memberErr || !membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgId = membership.org_id;

    // ── Fetch full org data ──────────────────────────────────────────────
    const { data: org, error: orgError } = await db
      .from("organizations")
      .select("*, org_profiles(*), org_capabilities(*)")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const capabilities = org.org_capabilities?.[0] ?? org.org_capabilities ?? {};
    const profile = org.org_profiles?.[0] ?? org.org_profiles ?? {};
    const missionText = org.mission_statement ?? "";

    // ── Step 1: Generate mission embedding ───────────────────────────────
    let embeddingGenerated = false;
    if (missionText && !org.mission_embedding) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: missionText,
        });
        const embedding = embeddingResponse.data[0]?.embedding ?? null;

        if (embedding) {
          await db
            .from("organizations")
            .update({ mission_embedding: embedding })
            .eq("id", orgId);
          org.mission_embedding = embedding;
          embeddingGenerated = true;
        }
      } catch (embeddingErr) {
        logger.error("Embedding generation failed", { err: String(embeddingErr) });
      }
    }

    // ── Step 2: Run grant matching INLINE ─────────────────────────────────
    let matchCount = 0;
    let matchError: string | null = null;

    if (org.mission_embedding) {
      try {
        const profileHash = computeProfileHash({ ...capabilities, ...profile });

        // Vector recall — top 200 by cosine similarity
        const vectorResults = await vectorRecall(org.mission_embedding);

        if (vectorResults.length > 0) {
          // Hard filters
          const filterInput: HardFilterInput = {
            entity_type: org.entity_type,
            state: org.state,
            annual_budget: org.annual_budget ?? capabilities.annual_budget,
            has_501c3: capabilities.has_501c3 ?? false,
            has_sam_registration: capabilities.has_sam_registration ?? false,
            has_audit: capabilities.has_audit ?? false,
            years_operating: capabilities.years_operating ?? 0,
            naics_primary: profile.naics_primary ?? null,
            funding_amount_min: profile.funding_amount_min ?? null,
            funding_amount_max: profile.funding_amount_max ?? null,
            sam_registration_status: profile.sam_registration_status ?? null,
            federal_certifications: Array.isArray(profile.federal_certifications)
              ? profile.federal_certifications as string[]
              : [],
            match_funds_capacity: profile.match_funds_capacity ?? null,
          };

          const candidatesWithDefaults = vectorResults.map((v) => ({
            ...v,
            eligible_naics: [] as string[],
            requires_sam: false,
            required_certification: null as string | null,
            match_required_pct: null as number | null,
          }));
          const filteredCandidates = applyHardFilters(candidatesWithDefaults, filterInput);

          if (filteredCandidates.length > 0) {
            // Limit to top 40 for AI scoring (controls cost for free tier)
            const toScore: GrantForScoring[] = filteredCandidates.slice(0, 40).map((c) => ({
              id: c.id,
              name: c.name,
              funder_name: c.funder_name,
              source_type: c.source_type,
              amount_min: c.amount_min,
              amount_max: c.amount_max,
              description: c.description as string | null,
              deadline: c.deadline,
              states: c.states,
              eligibility_types: c.eligibility_types,
            }));

            const orgProfile: OrgProfile = {
              name: org.name,
              entity_type: org.entity_type,
              mission_statement: missionText,
              state: org.state,
              city: org.city,
              annual_budget: org.annual_budget,
              employee_count: org.employee_count,
              program_areas: profile.program_areas ?? [],
              population_served: profile.population_served ?? [],
              grant_history_level: profile.grant_history_level ?? null,
              has_501c3: capabilities.has_501c3 ?? false,
              has_sam_registration: capabilities.has_sam_registration ?? false,
              has_audit: capabilities.has_audit ?? false,
              years_operating: capabilities.years_operating ?? 0,
              prior_federal_grants: capabilities.prior_federal_grants ?? 0,
              prior_foundation_grants: capabilities.prior_foundation_grants ?? 0,
              industry: profile.industry ?? null,
            };

            const scoringResult = await scoreGrantBatch(
              { orgId, userId: user.id, tier: "free" },
              orgProfile,
              toScore
            );

            // Store matches
            const computedAt = new Date().toISOString();
            const matchRows = scoringResult.scored_grants.map((sg) => {
              const vectorMatch = filteredCandidates.find((c) => c.id === sg.grant_id);
              return {
                org_id: orgId,
                grant_source_id: sg.grant_id,
                match_score: sg.match_score,
                score_breakdown: {},
                match_reasons: { why_it_matches: [sg.match_rationale] },
                missing_requirements: sg.missing_requirements,
                model_version: "claude-sonnet-4-20250514",
                embedding_similarity: vectorMatch?.similarity ?? null,
                computed_at: computedAt,
                profile_hash: profileHash,
              };
            });

            if (matchRows.length > 0) {
              await db.from("grant_matches").delete().eq("org_id", orgId);
              const { error: insertErr } = await db.from("grant_matches").insert(matchRows);
              if (insertErr) {
                matchError = insertErr.message;
                logger.error("Failed to store matches", { message: insertErr.message });
              } else {
                matchCount = matchRows.length;
              }
            }
          }
        }
      } catch (err) {
        matchError = err instanceof Error ? err.message : String(err);
        logger.error("Inline match_grants failed", { err: matchError });
      }
    }

    // ── Step 3: Run readiness scoring INLINE ──────────────────────────────
    let readinessScore: number | null = null;
    let readinessError: string | null = null;

    try {
      const profileFields: OrgProfileFields = {
        sam_registration_status: profile.sam_registration_status ?? null,
        federal_certifications: Array.isArray(profile.federal_certifications)
          ? profile.federal_certifications as string[]
          : [],
        naics_primary: profile.naics_primary ?? null,
        match_funds_capacity: profile.match_funds_capacity ?? null,
        funding_amount_min: profile.funding_amount_min ?? null,
        funding_amount_max: profile.funding_amount_max ?? null,
      };

      const result = await assessReadiness(
        { orgId, userId: user.id, tier: "free" },
        {
          name: org.name,
          entity_type: org.entity_type,
          mission_statement: missionText,
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
          naics_primary: profile.naics_primary ?? null,
          federal_certifications: Array.isArray(profile.federal_certifications)
            ? profile.federal_certifications as string[]
            : [],
          sam_registration_status: profile.sam_registration_status ?? null,
          match_funds_capacity: profile.match_funds_capacity ?? null,
          funding_amount_min: profile.funding_amount_min ?? null,
          funding_amount_max: profile.funding_amount_max ?? null,
        },
        profileFields
      );

      readinessScore = result.overall_score;

      const profileHash = computeProfileHash({ ...capabilities, ...profile });
      await db.from("readiness_scores").insert({
        org_id: orgId,
        criteria: result.criteria,
        overall_score: result.overall_score,
        gaps: result.top_3_gaps.map((g) => g.gap_description),
        recommendations: result.top_3_gaps.map((g) => g.fix_action),
        profile_hash: profileHash,
        scored_at: new Date().toISOString(),
      });
    } catch (err) {
      readinessError = err instanceof Error ? err.message : String(err);
      logger.error("Inline score_readiness failed", { err: readinessError });
    }

    // ── Step 4: Enqueue welcome email (keep as job — not time-critical) ──
    await db.from("job_queue").insert({
      job_type: "send_sequence_emails",
      payload: { trigger: "signup", user_id: user.id },
      status: "pending",
      priority: 8,
      max_attempts: 3,
      scheduled_for: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) logger.error("Failed to enqueue sequence email job", { message: error.message });
    });

    return NextResponse.json({
      success: true,
      embeddingGenerated,
      matchCount,
      matchError,
      readinessScore,
      readinessError,
    });
  } catch (err) {
    logger.error("Onboarding complete error", { err: String(err) });
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
