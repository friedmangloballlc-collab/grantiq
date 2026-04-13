import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { vectorRecall } from "@/lib/matching/vector-recall";
import { applyHardFilters, type HardFilterInput } from "@/lib/matching/hard-filter";
import { computeWeightedScore } from "@/lib/matching/weighted-score";
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

    // ── Step 1: Generate compound profile embedding ─────────────────────
    // Combine multiple profile fields for richer semantic matching
    let embeddingGenerated = false;

    const embeddingParts = [
      missionText ? `Mission: ${missionText}` : "",
      profile.project_description ? `Project: ${profile.project_description}` : "",
      Array.isArray(profile.target_beneficiaries) && profile.target_beneficiaries.length > 0
        ? `Serves: ${(profile.target_beneficiaries as string[]).map((b: string) => b.replace(/_/g, " ")).join(", ")}`
        : "",
      Array.isArray(profile.impact_metrics) && profile.impact_metrics.length > 0
        ? `Impact: ${(profile.impact_metrics as string[]).map((m: string) => m.replace(/_/g, " ")).join(", ")}`
        : "",
      profile.industry ? `Industry: ${profile.industry.replace(/_/g, " ")}` : "",
      profile.funding_use ? `Funding needs: ${profile.funding_use.replace(/_/g, " ")}` : "",
      org.entity_type ? `Organization type: ${org.entity_type.replace(/_/g, " ")}` : "",
      org.state ? `Located in ${org.city ? org.city + ", " : ""}${org.state}` : "",
      profile.naics_primary ? `NAICS code: ${profile.naics_primary}` : "",
      Array.isArray(profile.program_areas) && profile.program_areas.length > 0
        ? `Programs: ${profile.program_areas.join(", ")}`
        : "",
      profile.business_stage ? `Stage: ${profile.business_stage.replace(/_/g, " ")}` : "",
      profile.technology_readiness_level ? `Technology readiness: TRL ${profile.technology_readiness_level}` : "",
      profile.past_federal_funding_level && profile.past_federal_funding_level !== "none"
        ? `Past federal funding: ${profile.past_federal_funding_level.replace(/_/g, " ")}`
        : "",
    ].filter(Boolean).join(". ");

    if (embeddingParts.length > 10 && !org.mission_embedding) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: embeddingParts,
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

    if (org.mission_embedding || missionText || profile.industry) {
      try {
        const profileHash = computeProfileHash({ ...capabilities, ...profile });

        let vectorResults: Awaited<ReturnType<typeof vectorRecall>> = [];

        if (org.mission_embedding) {
          // Primary: vector recall — top 200 by cosine similarity
          vectorResults = await vectorRecall(org.mission_embedding);
        }

        // Fallback: if no embedding or vector returned 0, use keyword search
        if (vectorResults.length === 0) {
          const searchTerms = [
            profile.industry ?? "",
            profile.funding_use ?? "",
            org.entity_type ?? "",
            missionText?.slice(0, 200) ?? "",
          ].filter(Boolean).join(" ").trim();

          if (searchTerms.length > 3) {
            const { data: searchResults } = await db.rpc("search_grants", {
              query: searchTerms,
              p_type: null,
              p_state: org.state ?? null,
              p_amount_min: null,
              p_amount_max: null,
              p_limit: 200,
              p_offset: 0,
            });

            // Convert search results to vector recall format (similarity = 0.5 default)
            vectorResults = (searchResults ?? []).map((g: Record<string, unknown>) => ({
              id: g.id as string,
              name: (g.name as string) ?? "",
              funder_name: (g.funder_name as string) ?? "",
              source_type: (g.source_type as string) ?? "federal",
              category: (g.category as string) ?? null,
              eligibility_types: (g.eligibility_types as string[]) ?? [],
              states: (g.states as string[]) ?? [],
              amount_min: g.amount_min as number | null,
              amount_max: g.amount_max as number | null,
              deadline: g.deadline as string | null,
              deadline_type: null,
              description: g.description as string | null,
              status: "open",
              url: null,
              cfda_number: null,
              cost_sharing_required: false,
              funder_id: null,
              similarity: 0.5, // Default similarity for keyword matches
            }));
          }
        }

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
            past_federal_funding_level: profile.past_federal_funding_level ?? null,
            audited_financials: capabilities.audit_status === "has",
            audit_status: (capabilities.audit_status as "has" | "could_obtain" | "cannot" | null) ?? null,
            technology_readiness_level: profile.technology_readiness_level ?? null,
            industry: profile.industry ?? null,
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
            // Weighted scoring: 70% similarity + 15% eligibility + 15% location
            const computedAt = new Date().toISOString();

            const orgScoreContext = {
              entity_type: org.entity_type ?? "other",
              state: org.state ?? null,
              industry: profile.industry ?? null,
              sam_registration_status: profile.sam_registration_status ?? null,
              funding_amount_min: profile.funding_amount_min ?? null,
              funding_amount_max: profile.funding_amount_max ?? null,
              naics_primary: profile.naics_primary ?? null,
              federal_certifications: Array.isArray(profile.federal_certifications)
                ? profile.federal_certifications as string[] : [],
              target_beneficiaries: Array.isArray(profile.target_beneficiaries)
                ? profile.target_beneficiaries as string[] : [],
            };

            const scored = filteredCandidates.map((c) => {
              const cAny = c as Record<string, unknown>;
              const grantFields = {
                similarity: c.similarity,
                eligibility_types: c.eligibility_types ?? [],
                states: c.states ?? [],
                source_type: c.source_type,
                category: cAny.category as string | null ?? null,
                requires_sam: cAny.requires_sam as boolean | null ?? null,
                amount_min: c.amount_min,
                amount_max: c.amount_max,
                eligible_naics: cAny.eligible_naics as string[] | null ?? null,
                required_certification: cAny.required_certification as string | null ?? null,
                target_beneficiaries: cAny.target_beneficiaries as string[] | null ?? null,
              };
              const score = computeWeightedScore(grantFields, orgScoreContext);
              return { candidate: c, score };
            });

            // Sort by weighted score, take top 50
            scored.sort((a, b) => b.score.total - a.score.total);
            const top50 = scored.slice(0, 50);

            const matchRows = top50.map(({ candidate: c, score }) => ({
              org_id: orgId,
              grant_source_id: c.id,
              match_score: score.total,
              score_breakdown: {
                similarity: score.similarity_score,
                eligibility: score.eligibility_score,
                location: score.location_score,
                fit: score.fit_score,
              },
              match_reasons: { why_it_matches: ["Weighted match: similarity + eligibility + location"] },
              missing_requirements: [] as string[],
              model_version: "weighted-v1",
              embedding_similarity: c.similarity,
              computed_at: computedAt,
              profile_hash: profileHash,
            }));

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
      } catch (err) {
        matchError = err instanceof Error ? err.message : String(err);
        logger.error("Inline match_grants failed", { err: matchError });
      }
    }

    // ── Step 3: Readiness scoring — fire and forget (don't block response) ─
    const readinessPromise = (async () => {
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
          past_federal_funding_level: profile.past_federal_funding_level ?? null,
          audit_status: (capabilities.audit_status as "has" | "could_obtain" | "cannot" | null) ?? null,
          technology_readiness_level: profile.technology_readiness_level ?? null,
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
        logger.error("Background readiness scoring failed", { err: String(err) });
      }
    })();

    // Don't await — let it run in background. Response returns immediately with matches.
    void readinessPromise;

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
      debug: {
        orgId,
        hasMission: !!missionText,
        missionLength: missionText?.length ?? 0,
        embeddingInputLength: embeddingParts.length,
        hasEmbedding: !!org.mission_embedding,
        embeddingGenerated,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        matchCount,
        matchError,
        readinessScoring: "background",
      },
    });
  } catch (err) {
    logger.error("Onboarding complete error", { err: String(err) });
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
