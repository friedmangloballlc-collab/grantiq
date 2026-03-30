// grantiq/src/app/api/writing/full-confidence/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkFullConfidenceEligibility } from "@/lib/ai/writing/pricing";
import { z } from "zod";

const FullConfidenceSchema = z.object({
  org_id: z.string().uuid(),
  rfp_analysis_id: z.string().uuid(),
  grant_source_id: z.string().uuid(),
  grant_type: z.enum(["state_foundation", "federal", "sbir_sttr"]),
  pipeline_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = FullConfidenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { org_id, rfp_analysis_id, grant_source_id, grant_type } = parsed.data;

  // Check eligibility
  const eligibility = await checkFullConfidenceEligibility(org_id, grant_source_id);

  if (!eligibility.eligible) {
    return NextResponse.json({
      eligible: false,
      reasons: eligibility.reasons,
      checks: eligibility.checks,
    }, { status: 403 });
  }

  const admin = createAdminClient();

  // Create draft record ($0 upfront)
  const { data: draft, error: draftError } = await admin
    .from("grant_drafts")
    .insert({
      org_id,
      user_id: user.id,
      rfp_analysis_id,
      grant_source_id,
      pipeline_id: parsed.data.pipeline_id || null,
      tier: "full_confidence",
      grant_type,
      status: "rfp_parsed",
      price_cents: 0,
      is_full_confidence: true,
    })
    .select("id")
    .single();

  if (draftError || !draft) {
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
  }

  // Create Full Confidence tracking record
  await admin.from("full_confidence_applications").insert({
    org_id,
    grant_draft_id: draft.id,
    grant_source_id,
    readiness_score: eligibility.checks.readiness_score_met ? 70 : 0,
    match_score: eligibility.checks.match_score_met ? 75 : 0,
    grant_amount_min: 25000,
    subscription_tier: "pro", // Will be resolved from actual subscription
    status: "active",
  });

  // Auto-start the pipeline (no payment needed)
  await admin.from("job_queue").insert({
    job_type: "writing_pipeline",
    payload: {
      draft_id: draft.id,
      tier: "full_confidence",
      rfp_analysis_id,
      org_id,
      user_id: user.id,
    },
    status: "pending",
    priority: 2,
    max_attempts: 2,
  });

  return NextResponse.json({
    draft_id: draft.id,
    status: "queued",
    tier: "full_confidence",
    success_fee_pct: 10,
    message: "Your Full Confidence application is being generated. You will only be charged a 10% success fee if you win the grant.",
  });
}

// GET endpoint to check eligibility without applying
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("org_id");
  const grantSourceId = req.nextUrl.searchParams.get("grant_source_id");

  if (!orgId || !grantSourceId) {
    return NextResponse.json({ error: "org_id and grant_source_id required" }, { status: 400 });
  }

  const eligibility = await checkFullConfidenceEligibility(orgId, grantSourceId);
  return NextResponse.json(eligibility);
}
