import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    // Fetch the grant source
    const { data: grant, error: grantError } = await supabase
      .from("grant_sources")
      .select("*")
      .eq("id", id)
      .single();

    if (grantError || !grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    // Fetch match data for this org + grant if it exists
    const { data: match } = await supabase
      .from("grant_matches")
      .select("*")
      .eq("org_id", membership.org_id)
      .eq("grant_source_id", id)
      .maybeSingle();

    return NextResponse.json({ grant, match: match ?? null });
  } catch (err) {
    console.error("GET /api/grants/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
