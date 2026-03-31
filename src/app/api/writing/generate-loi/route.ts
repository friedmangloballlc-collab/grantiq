// grantiq/src/app/api/writing/generate-loi/route.ts
//
// POST /api/writing/generate-loi
// Generates a Letter of Intent for a given grant + org.
// Product price: $49 (Stripe integration follows same pattern as /purchase).

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateLOI } from "@/lib/ai/writing/loi-generator";
import type { OrgProfile, GrantDetails } from "@/lib/ai/writing/loi-generator";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve org membership
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No active org membership" }, { status: 403 });
  }
  const orgId = membership.org_id;

  // Parse body
  let body: { grant_source_id: string; project_summary: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { grant_source_id, project_summary } = body;

  if (!grant_source_id) {
    return NextResponse.json({ error: "grant_source_id is required" }, { status: 400 });
  }
  if (!project_summary || project_summary.trim().length < 20) {
    return NextResponse.json(
      { error: "project_summary must be at least 20 characters" },
      { status: 400 }
    );
  }

  // Fetch grant
  const { data: grant } = await supabase
    .from("grant_sources")
    .select("id, name, funder_name, source_type, amount_max, description, category")
    .eq("id", grant_source_id)
    .single();

  if (!grant) {
    return NextResponse.json({ error: "Grant not found" }, { status: 404 });
  }

  // Fetch org
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, mission, entity_type, state, city, annual_budget")
    .eq("id", orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const orgProfile: OrgProfile = {
    name: org.name ?? "Your Organization",
    mission: org.mission ?? "",
    entity_type: org.entity_type ?? "nonprofit",
    state: org.state ?? null,
    city: org.city ?? null,
    annual_budget: org.annual_budget ?? null,
  };

  const grantDetails: GrantDetails = {
    name: grant.name,
    funder_name: grant.funder_name,
    source_type: grant.source_type ?? null,
    amount_max: grant.amount_max ?? null,
    description: grant.description ?? null,
    category: grant.category ?? null,
  };

  // Generate LOI
  let loiOutput;
  try {
    loiOutput = await generateLOI(orgProfile, grantDetails, project_summary.trim());
  } catch (err) {
    console.error("LOI generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate LOI. Please try again." },
      { status: 500 }
    );
  }

  // Persist to grant_lois table (best-effort — don't fail if table doesn't exist yet)
  let loiId: string | null = null;
  try {
    const { data: savedRow } = await supabase
      .from("grant_lois")
      .insert({
        org_id: orgId,
        grant_source_id,
        user_id: user.id,
        project_summary: project_summary.trim(),
        loi_text: loiOutput.loi_text,
        word_count: loiOutput.word_count,
        subject_line: loiOutput.subject_line,
        key_themes: loiOutput.key_themes,
        status: "draft",
      })
      .select("id")
      .single();
    loiId = savedRow?.id ?? null;
  } catch {
    // Non-fatal — table may not exist yet in this environment
  }

  return NextResponse.json({
    loi_id: loiId,
    ...loiOutput,
  });
}
