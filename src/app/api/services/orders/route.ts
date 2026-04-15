import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
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
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No active org membership" }, { status: 403 });
  }

  const serviceType = req.nextUrl.searchParams.get("type");

  let query = db
    .from("service_orders")
    .select("id, service_type, status, report_data, scores, created_at, completed_at")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (serviceType) {
    query = query.eq("service_type", serviceType);
  }

  const { data: orders, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: orders ?? [] });
}
