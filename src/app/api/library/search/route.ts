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

    // Tier-based result limits
    const TIER_LIMITS: Record<string, number> = {
      starter: 50,
      pro: 200,
      growth: 500,
      enterprise: 1000,
    };
    const maxResults = TIER_LIMITS[tier] ?? (trialActive ? 200 : 50);

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
