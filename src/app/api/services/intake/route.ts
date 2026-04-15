import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * POST /api/services/intake
 * Saves intake questionnaire data to org_profiles, org_capabilities, and organizations.
 * Then returns the org_id so the caller can trigger the appropriate service generation.
 */
export async function POST(req: NextRequest) {
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
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    const orgId = membership.org_id;
    const body = await req.json();

    // Map intake data to the appropriate tables
    const orgUpdates: Record<string, unknown> = {};
    const profileUpdates: Record<string, unknown> = {};
    const capUpdates: Record<string, unknown> = {};

    // Organizations table
    if (body.company_name) orgUpdates.name = body.company_name;
    if (body.entity_type) orgUpdates.entity_type = body.entity_type;
    if (body.annual_revenue) orgUpdates.annual_budget = revenueToNumber(body.annual_revenue);
    if (body.employee_count) orgUpdates.employee_count = employeeToNumber(body.employee_count);
    if (body.mission_statement) orgUpdates.mission_statement = body.mission_statement;

    // Org Profiles table
    if (body.state_of_formation) profileUpdates.state = body.state_of_formation;
    if (body.industry) profileUpdates.industry = body.industry;
    if (body.phone) profileUpdates.phone = body.phone;
    if (body.email) profileUpdates.contact_email = body.email;
    if (body.year_formed) profileUpdates.years_operating = new Date().getFullYear() - parseInt(body.year_formed, 10);
    if (body.project_description) profileUpdates.project_description = body.project_description;
    if (body.owner_demographics?.length) profileUpdates.ownership_demographics = body.owner_demographics;
    if (body.target_grant_types?.length) profileUpdates.funding_use = body.target_grant_types;
    if (body.target_dollar_range) {
      const range = dollarRangeToMinMax(body.target_dollar_range);
      profileUpdates.funding_amount_min = range.min;
      profileUpdates.funding_amount_max = range.max;
    }
    if (body.current_certifications?.length) profileUpdates.federal_certifications = body.current_certifications;
    if (body.sam_registered) {
      profileUpdates.sam_registration_status = body.sam_registered === "yes" ? "registered" : body.sam_registered === "unsure" ? "unknown" : "not_registered";
    }
    if (body.applied_before || body.won_before) {
      if (body.won_before === "yes") {
        profileUpdates.grant_history_level = "won";
      } else if (body.applied_before === "yes") {
        profileUpdates.grant_history_level = "applied";
      } else {
        profileUpdates.grant_history_level = "none";
      }
    }
    if (body.accounting_system) profileUpdates.accounting_system = body.accounting_system;
    if (body.financial_statements_available) profileUpdates.financial_statements_status = body.financial_statements_available;
    if (body.referral_source) profileUpdates.referral_source = body.referral_source;
    if (body.website) profileUpdates.website = body.website;
    if (body.role_title) profileUpdates.contact_role = body.role_title;
    if (body.full_name) profileUpdates.contact_name = body.full_name;
    if (body.timeline_to_first_app) profileUpdates.grant_timeline = body.timeline_to_first_app;
    if (body.anything_else) profileUpdates.additional_notes = body.anything_else;
    if (body.in_hubzone_oz_rural) profileUpdates.in_hubzone_oz_rural = body.in_hubzone_oz_rural;
    if (body.naics_identified) profileUpdates.naics_identified = body.naics_identified;

    // Org Capabilities table
    if (body.ein_obtained) capUpdates.has_ein = body.ein_obtained === "yes";
    if (body.good_standing) capUpdates.in_good_standing = body.good_standing === "yes";
    if (body.dedicated_bank_account) capUpdates.has_dedicated_bank_account = body.dedicated_bank_account === "yes";
    if (body.uei_obtained) capUpdates.has_uei = body.uei_obtained === "yes";
    if (body.sam_registered) capUpdates.has_sam_registration = body.sam_registered === "yes";

    // Risk screen fields
    if (body.federal_debt) capUpdates.has_federal_debt = body.federal_debt === "yes";
    if (body.government_litigation) capUpdates.has_government_litigation = body.government_litigation === "yes";
    if (body.bankruptcy_7yr) capUpdates.has_bankruptcy = body.bankruptcy_7yr === "yes";
    if (body.irs_issues) capUpdates.has_irs_issues = body.irs_issues === "yes";
    if (body.finances_comingled) capUpdates.finances_comingled = body.finances_comingled === "yes";
    if (body.nonprofit_status_active) capUpdates.nonprofit_status_active = body.nonprofit_status_active === "yes";

    // Insurance
    if (body.insurance_held?.length) capUpdates.insurance_held = body.insurance_held;

    // Compliance docs held
    if (body.compliance_docs_held?.length) capUpdates.compliance_docs_held = body.compliance_docs_held;

    // 501c3 status from entity type
    if (body.entity_type === "nonprofit_501c3") capUpdates.has_501c3 = true;

    // Perform updates in parallel
    const updates = [];
    if (Object.keys(orgUpdates).length > 0) {
      updates.push(db.from("organizations").update(orgUpdates).eq("id", orgId));
    }
    if (Object.keys(profileUpdates).length > 0) {
      updates.push(db.from("org_profiles").update(profileUpdates).eq("org_id", orgId));
    }
    if (Object.keys(capUpdates).length > 0) {
      updates.push(db.from("org_capabilities").update(capUpdates).eq("org_id", orgId));
    }

    await Promise.all(updates);

    logger.info("Intake data saved", {
      orgId,
      orgFields: Object.keys(orgUpdates).length,
      profileFields: Object.keys(profileUpdates).length,
      capFields: Object.keys(capUpdates).length,
    });

    return NextResponse.json({ success: true, org_id: orgId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Intake save failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function revenueToNumber(range: string): number | null {
  const map: Record<string, number> = {
    pre_revenue: 0,
    under_100k: 50000,
    "100k_500k": 300000,
    "500k_2m": 1000000,
    "2m_10m": 5000000,
    "10m_plus": 15000000,
  };
  return map[range] ?? null;
}

function employeeToNumber(range: string): number | null {
  const map: Record<string, number> = {
    "0": 0,
    "1-5": 3,
    "6-25": 15,
    "26-100": 60,
    "100+": 150,
  };
  return map[range] ?? null;
}

function dollarRangeToMinMax(range: string): { min: number | null; max: number | null } {
  const map: Record<string, { min: number; max: number }> = {
    "1k_25k": { min: 1000, max: 25000 },
    "25k_100k": { min: 25000, max: 100000 },
    "100k_500k": { min: 100000, max: 500000 },
    "500k_plus": { min: 500000, max: 5000000 },
  };
  return map[range] ?? { min: null, max: null };
}
