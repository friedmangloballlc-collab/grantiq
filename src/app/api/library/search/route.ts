import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? null;
    const type = searchParams.get("type") ?? null;
    const state = searchParams.get("state") ?? null;
    const min = searchParams.get("min") ? Number(searchParams.get("min")) : null;
    const max = searchParams.get("max") ? Number(searchParams.get("max")) : null;
    const page = Math.max(0, Number(searchParams.get("page") ?? 0));
    const limit = 24;

    const { data, error } = await supabase.rpc("search_grants", {
      query: q && q.trim() !== "" ? q.trim() : null,
      p_type: type && type !== "all" ? type : null,
      p_state: state && state !== "all" ? state : null,
      p_amount_min: min,
      p_amount_max: max,
      p_limit: limit,
      p_offset: page * limit,
    });

    if (error) {
      console.error("search_grants RPC error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      grants: data ?? [],
      page,
      limit,
      hasMore: (data ?? []).length === limit,
    });
  } catch (err) {
    console.error("GET /api/library/search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
