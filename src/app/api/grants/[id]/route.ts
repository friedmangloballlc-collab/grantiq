import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin-client lookups bypass the RLS chicken-and-egg on org_members
    // (same pattern as /api/pipeline). User identity is still JWT-verified.
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

    const { data: grant, error: grantError } = await admin
      .from("grant_sources")
      .select("*")
      .eq("id", id)
      .single();

    if (grantError || !grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    const { data: match } = await admin
      .from("grant_matches")
      .select("*")
      .eq("org_id", membership.org_id)
      .eq("grant_source_id", id)
      .maybeSingle();

    return NextResponse.json({ grant, match: match ?? null });
  } catch (err) {
    logger.error("GET /api/grants/[id] error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
