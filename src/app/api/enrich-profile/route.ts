import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichFromWebsite } from "@/lib/ingestion/company-enrichment";
import { logger } from "@/lib/logger";

/**
 * POST /api/enrich-profile
 * Scrapes the org's website URL to fill profile gaps.
 * Only updates fields that are currently null/empty — never overwrites user data.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

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
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const orgId = membership.org_id;

    // Get current org data
    const [{ data: org }, { data: profile }] = await Promise.all([
      db.from("organizations").select("website_url, mission_statement, founded_year").eq("id", orgId).single(),
      db.from("org_profiles").select("industry, target_beneficiaries, project_description").eq("org_id", orgId).single(),
    ]);

    const websiteUrl = org?.website_url;
    if (!websiteUrl) {
      return NextResponse.json({ error: "No website URL on profile — add one in Settings first" }, { status: 400 });
    }

    // Enrich from website
    const enrichment = await enrichFromWebsite(websiteUrl);
    if (!enrichment) {
      return NextResponse.json({ error: "Could not extract data from website" }, { status: 422 });
    }

    // Only update fields that are currently empty
    const orgUpdates: Record<string, unknown> = {};
    const profileUpdates: Record<string, unknown> = {};

    if (!org?.mission_statement && enrichment.mission_statement) {
      orgUpdates.mission_statement = enrichment.mission_statement;
    }
    if (!org?.founded_year && enrichment.year_founded) {
      orgUpdates.founded_year = enrichment.year_founded;
    }

    if ((!profile?.target_beneficiaries || (Array.isArray(profile.target_beneficiaries) && profile.target_beneficiaries.length === 0)) && enrichment.target_populations.length > 0) {
      profileUpdates.target_beneficiaries = enrichment.target_populations;
    }

    if (!profile?.project_description && enrichment.services.length > 0) {
      profileUpdates.project_description = `Services: ${enrichment.services.join(", ")}`;
    }

    // Save updates
    if (Object.keys(orgUpdates).length > 0) {
      await db.from("organizations").update(orgUpdates).eq("id", orgId);
    }
    if (Object.keys(profileUpdates).length > 0) {
      await db.from("org_profiles").update(profileUpdates).eq("org_id", orgId);
    }

    const fieldsUpdated = Object.keys(orgUpdates).length + Object.keys(profileUpdates).length;

    logger.info("Company enrichment complete", {
      orgId,
      fieldsUpdated,
      orgUpdates: Object.keys(orgUpdates),
      profileUpdates: Object.keys(profileUpdates),
    });

    return NextResponse.json({
      success: true,
      fieldsUpdated,
      enrichment: {
        mission: enrichment.mission_statement ? "extracted" : "not found",
        services: enrichment.services.length,
        populations: enrichment.target_populations.length,
        certifications: enrichment.certifications_mentioned,
        locations: enrichment.locations_mentioned,
        yearFounded: enrichment.year_founded,
        teamSize: enrichment.team_size_estimate,
      },
    });
  } catch (err) {
    logger.error("POST /api/enrich-profile error", { err: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
