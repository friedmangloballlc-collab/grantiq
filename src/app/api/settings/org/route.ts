import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { org_id, industry, business_stage, funding_use, ...orgFields } = body;

    if (!org_id) {
      return NextResponse.json({ error: "org_id is required" }, { status: 400 });
    }

    const db = createAdminClient();

    // Verify user is owner or admin
    const { data: membership } = await db
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update organizations table
    const orgUpdate: Record<string, unknown> = {};
    const allowedOrgFields = [
      "name", "entity_type", "mission_statement", "state", "city",
      "website_url", "founded_year", "annual_budget", "employee_count",
    ];
    for (const key of allowedOrgFields) {
      if (key in orgFields) {
        orgUpdate[key] = orgFields[key] ?? null;
      }
    }

    if (Object.keys(orgUpdate).length > 0) {
      const { error: orgError } = await db
        .from("organizations")
        .update(orgUpdate)
        .eq("id", org_id);
      if (orgError) {
        logger.error("Settings org update failed", { message: orgError.message });
        return NextResponse.json({ error: orgError.message }, { status: 500 });
      }
    }

    // Update org_profiles table
    const profileUpdate: Record<string, unknown> = {};
    if (industry !== undefined) profileUpdate.industry = industry ?? null;
    if (business_stage !== undefined) profileUpdate.business_stage = business_stage ?? null;
    if (funding_use !== undefined) profileUpdate.funding_use = funding_use ?? null;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await db
        .from("org_profiles")
        .update(profileUpdate)
        .eq("org_id", org_id);
      if (profileError) {
        logger.error("Settings profile update failed", { message: profileError.message });
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("PATCH /api/settings/org error", { err: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
