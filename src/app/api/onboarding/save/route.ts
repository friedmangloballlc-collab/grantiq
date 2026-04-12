import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// Maps each onboarding step ID to which table and column it belongs to
const FIELD_MAP: Record<
  string,
  { table: "organizations" | "org_profiles" | "org_capabilities"; column: string }
> = {
  entity_type:              { table: "organizations",    column: "entity_type" },
  industry:                 { table: "org_profiles",     column: "industry" },
  naics_primary:            { table: "org_profiles",     column: "naics_primary" },
  funding_use:              { table: "org_profiles",     column: "funding_use" },
  funding_amount:           { table: "org_profiles",     column: "funding_amount_min" }, // handled specially below
  federal_certifications:   { table: "org_profiles",     column: "federal_certifications" }, // handled specially below
  sam_registration_status:  { table: "org_profiles",     column: "sam_registration_status" },
  match_funds_capacity:     { table: "org_profiles",     column: "match_funds_capacity" },
  business_stage:           { table: "org_profiles",     column: "business_stage" },
  grant_history:            { table: "org_profiles",     column: "grant_history_level" },
  location:                 { table: "organizations",    column: "city" }, // handled specially below
  business_model:           { table: "org_profiles",     column: "business_model" },
  phone:                    { table: "org_profiles",     column: "phone" },
  contact_method:           { table: "org_profiles",     column: "contact_method" },
  employee_count:           { table: "organizations",    column: "employee_count" },
  annual_revenue:           { table: "organizations",    column: "annual_budget" },
  ownership:                { table: "org_profiles",     column: "ownership_demographics" },
  mission:                  { table: "organizations",    column: "mission_statement" },
  documents:                { table: "org_profiles",     column: "documents_ready" },
  interested_nonprofit:     { table: "org_profiles",     column: "interested_in_nonprofit" },
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { field, value } = await req.json();

    if (!field || value === undefined) {
      return NextResponse.json(
        { error: "field and value are required" },
        { status: 400 }
      );
    }

    const db = createAdminClient();

    // Get user's org
    const { data: membership } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgId = membership.org_id;
    const mapping = FIELD_MAP[field as string];

    if (!mapping) {
      // Unknown field — silently ignore
      return NextResponse.json({ success: true, skipped: true });
    }

    // Special case: location is "City, ST" — split and save city + state
    if (field === "location" && typeof value === "string") {
      const parts = value.split(",").map((s: string) => s.trim());
      const city = parts[0] ?? value;
      const state = parts[1] ?? "";
      await db
        .from("organizations")
        .update({ city, state })
        .eq("id", orgId);
      return NextResponse.json({ success: true });
    }

    // Special case: funding_amount is "min:max" — split and save both columns
    if (field === "funding_amount" && typeof value === "string") {
      const [minStr, maxStr] = value.split(":");
      const min = minStr && minStr.length > 0 ? Number(minStr) : null;
      const max = maxStr && maxStr.length > 0 ? Number(maxStr) : null;
      await db
        .from("org_profiles")
        .update({
          funding_amount_min: Number.isFinite(min) ? min : null,
          funding_amount_max: Number.isFinite(max) ? max : null,
        })
        .eq("org_id", orgId);
      return NextResponse.json({ success: true });
    }

    // Special case: federal_certifications — store as jsonb array
    if (field === "federal_certifications") {
      const certs = Array.isArray(value) ? value : [value];
      await db
        .from("org_profiles")
        .update({ federal_certifications: JSON.stringify(certs) })
        .eq("org_id", orgId);
      return NextResponse.json({ success: true });
    }

    // Special case: multi_select arrays — join to comma-separated string
    const saveValue = Array.isArray(value) ? (value as string[]).join(", ") : value;

    const { error } = await db
      .from(mapping.table)
      .update({ [mapping.column]: saveValue })
      .eq(mapping.table === "organizations" ? "id" : "org_id", orgId);

    if (error) {
      logger.error(`Onboarding save error [${field}]`, { message: error.message });
      return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Onboarding save error", { err: String(err) });
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
