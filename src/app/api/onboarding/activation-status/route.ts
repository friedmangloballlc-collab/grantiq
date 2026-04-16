import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ completed: [] });

  const db = createAdminClient();
  const { data: membership } = await db
    .from("org_members").select("org_id").eq("user_id", user.id).eq("status", "active").limit(1).single();
  if (!membership) return NextResponse.json({ completed: [] });

  const orgId = membership.org_id;
  const completed: string[] = [];

  // Check each milestone
  const [serviceOrders, pipeline, matches] = await Promise.all([
    db.from("service_orders").select("service_type").eq("org_id", orgId).eq("status", "completed"),
    db.from("grant_pipeline").select("id").eq("org_id", orgId).limit(1),
    db.from("grant_matches").select("id").eq("org_id", orgId).limit(1),
  ]);

  const completedServices = new Set((serviceOrders.data ?? []).map((s) => s.service_type));

  if (completedServices.has("eligibility_status")) completed.push("eligibility_check");
  if (completedServices.has("readiness_diagnostic")) completed.push("run_diagnostic");
  if ((matches.data ?? []).length > 0) completed.push("view_matches");
  if ((pipeline.data ?? []).length > 0) completed.push("save_pipeline");

  // Check if they've visited multiple features (calendar, vault, compliance, portfolio)
  const featureChecks = await Promise.all([
    db.from("compliance_events").select("id").eq("org_id", orgId).limit(1),
    db.from("document_vault").select("id").eq("org_id", orgId).limit(1),
  ]);
  if (featureChecks.some((r) => (r.data ?? []).length > 0)) completed.push("use_second_feature");

  // Also count service orders for non-standard types as "second feature"
  if (completedServices.size >= 2 && !completed.includes("use_second_feature")) {
    completed.push("use_second_feature");
  }

  return NextResponse.json({ completed });
}
