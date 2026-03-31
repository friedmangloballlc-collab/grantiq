import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// GET /api/engagements — list active service engagements for the user's org
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

    const { data: membership } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    const { data, error } = await db
      .from("service_engagements")
      .select("*")
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ engagements: data ?? [] });
  } catch (err) {
    logger.error("GET /api/engagements error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/engagements — create a new service engagement (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    // Admin check: only org admins or service role may create engagements
    const { data: membership } = await db
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    if (membership.role !== "admin" && membership.role !== "owner") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json() as {
      service_type: string;
      package_name: string;
      price_cents: number;
      assigned_advisor?: string;
      notes?: string;
      org_id?: string;
    };

    const targetOrgId = body.org_id ?? membership.org_id;

    const { data, error } = await db
      .from("service_engagements")
      .insert({
        org_id: targetOrgId,
        user_id: user.id,
        service_type: body.service_type,
        package_name: body.package_name,
        price_cents: body.price_cents,
        assigned_advisor: body.assigned_advisor ?? null,
        notes: body.notes ?? null,
        status: "active",
        current_step: 1,
        step_statuses: {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ engagement: data }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/engagements error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
