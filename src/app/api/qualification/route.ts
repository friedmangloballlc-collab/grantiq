import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAZScore } from "@/lib/qualification/az-score";
import { logger } from "@/lib/logger";

// GET /api/qualification — returns the A-Z qualification score for the authenticated user's org.
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    // Resolve org membership
    const { data: membership } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    const orgId = membership.org_id;

    // Fetch all data sources in parallel
    const [orgResult, profileResult, capabilitiesResult, subscriptionResult] = await Promise.all([
      db.from("organizations").select("annual_budget, entity_type, employee_count").eq("id", orgId).single(),
      db.from("org_profiles").select("business_stage, grant_history_level, program_areas, documents_ready, mission_statement").eq("org_id", orgId).single(),
      db.from("org_capabilities").select("has_sam_registration").eq("org_id", orgId).single(),
      db.from("subscriptions").select("tier").eq("org_id", orgId).eq("status", "active").limit(1).single(),
    ]);

    const result = calculateAZScore(
      orgResult.data ?? null,
      profileResult.data ?? null,
      capabilitiesResult.data ?? null,
      subscriptionResult.data ?? null
    );

    return NextResponse.json(result);
  } catch (err) {
    logger.error("GET /api/qualification error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
