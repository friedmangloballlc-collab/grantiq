import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUsageLimit } from "@/lib/ai/usage";
import { scoreGrantBatch, type OrgProfile, type GrantForScoring, type CallContext } from "@/lib/ai/engines/match";
import { applyHardFilters, type HardFilterInput } from "@/lib/matching/hard-filter";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60; // Allow up to 60s for AI scoring

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed: rateLimitAllowed } = checkRateLimit(`match:${user.id}`, 5, 60000);
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return NextResponse.json({ error: "org_id is required" }, { status: 400 });
    }

    // Verify user belongs to this org
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const db = createAdminClient();

    // Get org's subscription tier
    const { data: sub } = await db
      .from("subscriptions")
      .select("tier")
      .eq("org_id", org_id)
      .eq("status", "active")
      .single();

    const tier = sub?.tier ?? "free";

    // Check usage
    const usage = await checkUsageLimit(org_id, "match", tier);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: "Usage limit reached",
          used: usage.used,
          limit: usage.limit,
          upgrade_message: `You've used all ${usage.limit} matching runs this month. Upgrade for more.`,
        },
        { status: 429 }
      );
    }

    // ── Fetch org profile ──────────────────────────────────────────────
    const [orgResult, profileResult, capResult] = await Promise.all([
      db.from("organizations").select("name, entity_type, annual_budget, employee_count").eq("id", org_id).single(),
      db.from("org_profiles").select("mission_statement, state, city, program_areas, population_served, grant_history_level, industry, naics_primary, funding_amount_min, funding_amount_max, federal_certifications, sam_registration_status, match_funds_capacity").eq("org_id", org_id).single(),
      db.from("org_capabilities").select("has_sam_registration").eq("org_id", org_id).single(),
    ]);

    const org = orgResult.data;
    const profile = profileResult.data;

    if (!org || !profile) {
      return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
    }

    const orgProfile: OrgProfile = {
      name: org.name ?? "Organization",
      entity_type: org.entity_type ?? "other",
      mission_statement: profile.mission_statement ?? "",
      state: profile.state ?? null,
      city: profile.city ?? null,
      annual_budget: org.annual_budget ?? null,
      employee_count: org.employee_count ?? null,
      program_areas: profile.program_areas ?? [],
      population_served: profile.population_served ?? [],
      grant_history_level: profile.grant_history_level ?? null,
      has_501c3: (org.entity_type ?? "").includes("501c3"),
      has_sam_registration: capResult.data?.has_sam_registration ?? false,
      has_audit: false,
      years_operating: 1,
      prior_federal_grants: 0,
      prior_foundation_grants: 0,
      industry: profile.industry ?? null,
    };

    // ── Fetch candidate grants ─────────────────────────────────────────
    // Use keyword search based on mission + program areas, then hard filter
    const searchTerms = [
      ...(profile.program_areas ?? []).slice(0, 3),
      profile.industry ?? "",
      org.entity_type ?? "",
    ].filter(Boolean).join(" ");

    // Get grants via search function (handles full-text search) — run both in parallel
    const [{ data: searchResults }, { data: broadResults }] = await Promise.all([
      db.rpc("search_grants", {
        query: searchTerms.length > 3 ? searchTerms : null,
        p_type: null,
        p_state: profile.state ?? null,
        p_amount_min: null,
        p_amount_max: null,
        p_limit: 200,
        p_offset: 0,
      }),
      // Also get a broader set without state filter
      db.rpc("search_grants", {
        query: null,
        p_type: null,
        p_state: null,
        p_amount_min: null,
        p_amount_max: null,
        p_limit: 200,
        p_offset: 0,
      }),
    ]);

    // Combine and deduplicate
    const allCandidates = new Map<string, GrantForScoring>();
    for (const g of [...(searchResults ?? []), ...(broadResults ?? [])]) {
      if (!allCandidates.has(g.id)) {
        allCandidates.set(g.id, {
          id: g.id,
          name: g.name,
          funder_name: g.funder_name,
          source_type: g.source_type,
          amount_min: g.amount_min,
          amount_max: g.amount_max,
          description: g.description,
          deadline: g.deadline,
          states: g.states ?? [],
          eligibility_types: [],
        });
      }
    }

    const candidates = Array.from(allCandidates.values());

    // Apply hard filters
    const hardFilterInput: HardFilterInput = {
      entity_type: org.entity_type ?? "other",
      state: profile.state ?? null,
      annual_budget: org.annual_budget ?? null,
      has_501c3: orgProfile.has_501c3,
      has_sam_registration: orgProfile.has_sam_registration,
      has_audit: false,
      years_operating: 1,
      naics_primary: profile.naics_primary ?? null,
      funding_amount_min: profile.funding_amount_min ?? null,
      funding_amount_max: profile.funding_amount_max ?? null,
      sam_registration_status: profile.sam_registration_status ?? null,
      federal_certifications: Array.isArray(profile.federal_certifications) ? profile.federal_certifications as string[] : [],
      match_funds_capacity: profile.match_funds_capacity ?? null,
    };

    const filtered = applyHardFilters(
      candidates.map((c) => ({ ...c, status: "open", similarity: 1 })),
      hardFilterInput
    );

    if (filtered.length === 0) {
      return NextResponse.json({
        matches: [],
        total: 0,
        message: "No grants matched your profile. Try updating your organization details.",
      });
    }

    // Limit to top candidates for AI scoring (controls cost)
    const maxToScore = tier === "free" ? 20 : tier === "starter" ? 40 : 60;
    const toScore: GrantForScoring[] = filtered.slice(0, maxToScore).map((g) => ({
      id: g.id,
      name: g.name,
      funder_name: g.funder_name,
      source_type: g.source_type,
      amount_min: g.amount_min,
      amount_max: g.amount_max,
      description: (typeof g.description === "string" ? g.description : null) as string | null,
      deadline: g.deadline,
      states: g.states,
      eligibility_types: g.eligibility_types,
    }));

    // ── AI scoring ─────────────────────────────────────────────────────
    const ctx: CallContext = { orgId: org_id, userId: user.id, tier };
    const result = await scoreGrantBatch(ctx, orgProfile, toScore);

    // ── Store matches ──────────────────────────────────────────────────
    const matchRows = result.scored_grants.map((sg) => ({
      org_id,
      grant_source_id: sg.grant_id,
      match_score: sg.match_score,
      match_reasons: [sg.match_rationale],
      risk_factors: sg.missing_requirements,
      computed_at: new Date().toISOString(),
    }));

    if (matchRows.length > 0) {
      await db.from("grant_matches").delete().eq("org_id", org_id);
      const { error: insertError } = await db.from("grant_matches").insert(matchRows);
      if (insertError) {
        logger.error("Failed to store matches", { message: insertError.message });
      }
    }

    // Record usage
    await db.from("ai_usage").insert({
      org_id,
      user_id: user.id,
      action_type: "match",
      tokens_used: result.scored_grants.length * 500,
      cost_cents: result.scored_grants.length * 2,
    });

    // Return top matches sorted by score
    const topMatches = result.scored_grants
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, tier === "free" ? 5 : 50)
      .map((sg) => {
        const grant = toScore.find((g) => g.id === sg.grant_id);
        return {
          grant_id: sg.grant_id,
          grant_name: grant?.name ?? "Unknown",
          funder_name: grant?.funder_name ?? "Unknown",
          source_type: grant?.source_type ?? "unknown",
          amount_max: grant?.amount_max ?? null,
          deadline: grant?.deadline ?? null,
          match_score: sg.match_score,
          rationale: sg.match_rationale,
          missing_requirements: sg.missing_requirements,
          recommended_action: sg.recommended_action,
        };
      });

    return NextResponse.json({
      matches: topMatches,
      total: result.scored_grants.length,
      scored: toScore.length,
      filtered: filtered.length,
      tier_limit: tier === "free" ? 5 : 50,
    });
  } catch (err) {
    logger.error("POST /api/ai/match error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
