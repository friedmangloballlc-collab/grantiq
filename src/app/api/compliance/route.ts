import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateComplianceEvents } from "@/lib/compliance/generate-events";
import { logger } from "@/lib/logger";

/** GET — fetch compliance events for the user's org */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();
    const { data: membership } = await db
      .from("org_members").select("org_id").eq("user_id", user.id).eq("status", "active").limit(1).single();
    if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

    // Update statuses based on current date
    const today = new Date().toISOString().split("T")[0];
    await db.from("compliance_events")
      .update({ status: "overdue" })
      .eq("org_id", membership.org_id)
      .eq("status", "upcoming")
      .lt("due_date", today);

    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    await db.from("compliance_events")
      .update({ status: "due_soon" })
      .eq("org_id", membership.org_id)
      .eq("status", "upcoming")
      .lte("due_date", sevenDays);

    const { data: events } = await db
      .from("compliance_events")
      .select("*")
      .eq("org_id", membership.org_id)
      .neq("status", "dismissed")
      .order("due_date", { ascending: true });

    return NextResponse.json({ events: events ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** POST — generate/regenerate compliance events from org profile */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();
    const { data: membership } = await db
      .from("org_members").select("org_id").eq("user_id", user.id).eq("status", "active").limit(1).single();
    if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

    const orgId = membership.org_id;

    // Fetch org data
    const [orgRes, profRes, capRes] = await Promise.all([
      db.from("organizations").select("entity_type, annual_budget, employee_count").eq("id", orgId).single(),
      db.from("org_profiles").select("state, sam_registration_status, years_operating").eq("org_id", orgId).single(),
      db.from("org_capabilities").select("has_sam_registration, has_uei, has_audit, has_501c3, has_ein, insurance_held").eq("org_id", orgId).single(),
    ]);

    const org = (orgRes.data ?? {}) as Record<string, unknown>;
    const prof = (profRes.data ?? {}) as Record<string, unknown>;
    const cap = (capRes.data ?? {}) as Record<string, unknown>;

    const events = generateComplianceEvents({
      orgId,
      entityType: (org.entity_type as string) ?? "other",
      state: (prof.state as string) ?? null,
      is501c3: cap.has_501c3 === true || (org.entity_type as string) === "nonprofit_501c3",
      hasSam: cap.has_sam_registration === true || (prof.sam_registration_status as string) === "registered",
      samRegistrationDate: null,
      hasUei: cap.has_uei === true,
      hasAudit: cap.has_audit === true,
      hasInsurance: Array.isArray(cap.insurance_held) && cap.insurance_held.length > 0,
      employeeCount: org.employee_count as number | null,
      annualBudget: org.annual_budget as number | null,
      yearFormed: prof.years_operating ? new Date().getFullYear() - (prof.years_operating as number) : null,
    });

    // Clear old auto-generated events
    await db.from("compliance_events")
      .delete()
      .eq("org_id", orgId)
      .eq("auto_generated", true);

    // Insert new events
    if (events.length > 0) {
      const { error } = await db.from("compliance_events").insert(events);
      if (error) {
        logger.error("Failed to insert compliance events", { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, events_created: events.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** PATCH — mark event as completed or dismissed */
export async function PATCH(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { event_id, status } = await req.json();
    if (!event_id || !status) return NextResponse.json({ error: "event_id and status required" }, { status: 400 });

    const db = createAdminClient();
    const update: Record<string, unknown> = { status };
    if (status === "completed") update.completed_at = new Date().toISOString();

    const { error } = await db.from("compliance_events").update(update).eq("id", event_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
