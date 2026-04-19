import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check tier for library access
    const db = createAdminClient();
    const { data: membership } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const { data: sub } = await db
      .from("subscriptions")
      .select("tier, trial_ends_at")
      .eq("org_id", membership.org_id)
      .single();

    const tier = sub?.tier ?? "free";
    const trialActive = sub?.trial_ends_at ? new Date(sub.trial_ends_at) > new Date() : false;

    if (tier === "free" && !trialActive) {
      return NextResponse.json({ error: "Library requires Starter plan or above" }, { status: 403 });
    }

    // Tier-based result limits (per-query)
    const TIER_LIMITS: Record<string, number> = {
      starter: 50,
      pro: 200,
      growth: 500,
      enterprise: 1000,
    };
    const maxResults = TIER_LIMITS[tier] ?? (trialActive ? 200 : 50);

    // Tier-based per-day SEARCH-COUNT limits (Unit 8 / library-rate-limit
    // 2026-04-19). Defends against scraping. Free is already blocked
    // above; enterprise is unlimited (no cap entry).
    const DAILY_SEARCH_CAP: Record<string, number> = {
      starter: 50,
      pro: 200,
      growth: 1000,
    };
    const dailyCap = DAILY_SEARCH_CAP[tier];
    if (dailyCap !== undefined) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: searchesToday, error: auditError } = await db
        .from("library_search_audit")
        .select("*", { count: "exact", head: true })
        .eq("org_id", membership.org_id)
        .gte("searched_at", since);

      if (auditError) {
        // Fail-open on audit-table query error so legit users don't get
        // blocked by a transient DB hiccup. Log it.
        logger.error("library_search_audit query failed", { err: String(auditError) });
      } else if ((searchesToday ?? 0) >= dailyCap) {
        return NextResponse.json(
          {
            error: "Daily library search limit reached",
            tier,
            cap: dailyCap,
            used: searchesToday,
          },
          { status: 429 }
        );
      }

      // Best-effort audit insert — don't block the search on failure
      void db.from("library_search_audit").insert({
        org_id: membership.org_id,
        user_id: user.id,
      });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? null;
    const type = searchParams.get("type") ?? null;
    const state = searchParams.get("state") ?? null;
    const min = searchParams.get("min") ? Number(searchParams.get("min")) : null;
    const max = searchParams.get("max") ? Number(searchParams.get("max")) : null;
    const page = Math.max(0, Number(searchParams.get("page") ?? 0));
    const limit = Math.min(24, maxResults - page * 24);

    if (limit <= 0) {
      return NextResponse.json({ grants: [], total: 0, tier, maxResults });
    }

    // For-profit filter uses category search instead of source_type
    const isForProfit = type === "for_profit";
    const effectiveType = isForProfit ? null : (type && type !== "all" ? type : null);
    const effectiveQuery = isForProfit
      ? (q ? `${q} ForProfit` : "ForProfit")
      : (q && q.trim() !== "" ? q.trim() : null);

    const { data, error } = await db.rpc("search_grants", {
      query: effectiveQuery,
      p_type: effectiveType,
      p_state: state && state !== "all" ? state : null,
      p_amount_min: min,
      p_amount_max: max,
      p_limit: limit,
      p_offset: page * limit,
    });

    if (error) {
      logger.error("search_grants RPC error", { message: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      grants: data ?? [],
      page,
      limit,
      hasMore: (data ?? []).length === limit,
    });
  } catch (err) {
    logger.error("GET /api/library/search error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
