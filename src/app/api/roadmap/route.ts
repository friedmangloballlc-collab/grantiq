import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// GET /api/roadmap — fetch existing funding_roadmaps for the org.
// NOTE: POST /api/ai/roadmap triggers AI generation; this route only reads saved data.
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin-client bypass for RLS chicken-and-egg (commit 28425fd pattern)
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

    const { data, error } = await admin
      .from("funding_roadmaps")
      .select("*")
      .eq("org_id", membership.org_id)
      .order("generated_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ roadmaps: data ?? [] });
  } catch (err) {
    logger.error("GET /api/roadmap error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
