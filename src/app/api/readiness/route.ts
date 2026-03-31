import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// GET /api/readiness — fetch the latest readiness_scores for the org.
// NOTE: POST /api/ai/readiness triggers AI scoring; this route only reads saved scores.
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    // Return the most recent score plus history (last 10)
    const { data, error } = await supabase
      .from("readiness_scores")
      .select("*")
      .eq("org_id", membership.org_id)
      .order("scored_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const latest = data?.[0] ?? null;
    const history = data ?? [];

    return NextResponse.json({ latest, history });
  } catch (err) {
    logger.error("GET /api/readiness error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
