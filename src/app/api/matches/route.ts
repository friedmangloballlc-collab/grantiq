import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { critiqueMatch } from "@/lib/ai/agents/match-critic";
import type {
  CriticOrgProfile,
  CriticGrantMatch,
} from "@/lib/ai/agents/match-critic/types";

// Shape of rows coming from grant_matches with joined grant_sources
interface MatchRow {
  id: string;
  org_id: string;
  grant_source_id: string;
  match_score: number;
  grant_sources?: {
    id: string;
    name: string;
    funder_name: string;
    source_type: string | null;
    category: string | null;
    amount_min: number | null;
    amount_max: number | null;
    eligibility_types: string[] | null;
    states: string[] | null;
    description: string | null;
  } | null;
  [key: string]: unknown;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin client for membership + data fetches (bypasses RLS
    // chicken-and-egg; user.id is JWT-verified above).
    const admin = createAdminClient();

    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    const orgId = membership.org_id as string;

    // Load all data needed for matches + match-critic Stage 1 in parallel:
    // 1. Raw matches (primary matcher output)
    // 2. Org profile (for critic geography/size/entity checks)
    // 3. Existing match_kills (to skip already-killed matches)
    const [matchesResult, orgResult, orgProfileResult, killsResult] = await Promise.all([
      admin
        .from("grant_matches")
        .select("*, grant_sources(*)")
        .eq("org_id", orgId)
        .order("match_score", { ascending: false })
        .limit(100),
      admin
        .from("organizations")
        .select("name, entity_type, state, city, annual_budget, employee_count, mission_statement")
        .eq("id", orgId)
        .single(),
      admin
        .from("org_profiles")
        .select("population_served, program_areas")
        .eq("org_id", orgId)
        .maybeSingle(),
      admin
        .from("match_kills")
        .select("grant_source_id, kill_reason")
        .eq("org_id", orgId),
    ]);

    if (matchesResult.error) {
      return NextResponse.json({ error: matchesResult.error.message }, { status: 500 });
    }

    const rawMatches = (matchesResult.data ?? []) as MatchRow[];
    const killedSet = new Set(
      (killsResult.data ?? []).map((k) => k.grant_source_id as string)
    );

    // Filter out already-killed matches immediately — no critic rerun needed.
    const candidates = rawMatches.filter((m) => !killedSet.has(m.grant_source_id));

    // If org profile is missing we can't run the critic reliably —
    // return all candidates as-is (fail-open).
    const org = orgResult.data;
    if (!org) {
      return NextResponse.json({ matches: candidates });
    }

    const orgProfile: CriticOrgProfile = {
      name: org.name ?? "",
      entity_type: org.entity_type ?? null,
      state: org.state ?? null,
      city: org.city ?? null,
      annual_budget: org.annual_budget ?? null,
      employee_count: org.employee_count ?? null,
      population_served: orgProfileResult.data?.population_served ?? [],
      program_areas: orgProfileResult.data?.program_areas ?? [],
      mission_statement: org.mission_statement ?? null,
    };

    // Look up subscription tier for aiCall gates in Stage 2
    const { data: sub } = await admin
      .from("subscriptions")
      .select("tier")
      .eq("org_id", orgId)
      .maybeSingle();
    const tier = (sub?.tier as string | undefined) ?? "free";

    // Full critique: Stage 1 hard checks (zero cost, <1ms per match) →
    // Stage 2 LLM mission-mismatch check (Haiku, ~800ms, only runs for
    // Stage-1 survivors). Run all critiques in parallel via Promise.all
    // so the total wall time is ~max(individual latency), not the sum.
    const newKills: Array<{
      org_id: string;
      grant_source_id: string;
      primary_score: number | null;
      kill_reason: string;
      kill_confidence: number;
      critic_notes: string;
      critic_model: string;
    }> = [];
    const survivors: MatchRow[] = [];

    const criticContext = {
      org_id: orgId,
      user_id: user.id,
      subscription_tier: tier,
    };

    const critiquePromises = candidates.map(async (match) => {
      if (!match.grant_sources) {
        return { match, verdict: null };
      }
      const grant: CriticGrantMatch = {
        id: match.grant_sources.id,
        name: match.grant_sources.name,
        funder_name: match.grant_sources.funder_name,
        source_type: match.grant_sources.source_type,
        category: match.grant_sources.category,
        amount_min: match.grant_sources.amount_min,
        amount_max: match.grant_sources.amount_max,
        eligibility_types: match.grant_sources.eligibility_types ?? [],
        states: match.grant_sources.states ?? [],
        description: match.grant_sources.description,
      };
      const verdict = await critiqueMatch({
        org: orgProfile,
        grant,
        context: criticContext,
      });
      return { match, verdict };
    });

    const critiqued = await Promise.all(critiquePromises);

    for (const { match, verdict } of critiqued) {
      if (!verdict) {
        // No grant_sources data — keep it (fail-safe)
        survivors.push(match);
        continue;
      }
      if (verdict.verdict === "KILL") {
        newKills.push({
          org_id: orgId,
          grant_source_id: match.grant_source_id,
          primary_score: match.match_score ?? null,
          kill_reason: verdict.killReason ?? "other",
          kill_confidence: verdict.confidence,
          critic_notes: verdict.notes,
          critic_model:
            verdict.stage === "hard_check"
              ? "match.critic.hard_checks.v1"
              : "match.critic.v1",
        });
      } else {
        survivors.push(match);
      }
    }

    // Persist new kills (best-effort; don't block the response on this)
    if (newKills.length > 0) {
      admin
        .from("match_kills")
        .insert(newKills)
        .then(({ error }) => {
          if (error) {
            logger.warn("match_kills insert failed", { err: error.message });
          }
        });
    }

    return NextResponse.json({ matches: survivors });
  } catch (err) {
    logger.error("GET /api/matches error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
