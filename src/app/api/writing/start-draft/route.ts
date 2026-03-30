// grantiq/src/app/api/writing/start-draft/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const StartDraftSchema = z.object({
  draft_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = StartDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify the draft belongs to the user's org and payment is confirmed
  const { data: draft } = await supabase
    .from("grant_drafts")
    .select("id, tier, rfp_analysis_id, org_id, status, stripe_payment_intent_id, is_full_confidence")
    .eq("id", parsed.data.draft_id)
    .single();

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (draft.status !== "rfp_parsed" && draft.status !== "funder_analyzed") {
    return NextResponse.json({ error: `Draft is already in status: ${draft.status}` }, { status: 400 });
  }

  // Enqueue background job
  const admin = createAdminClient();
  const { error: jobError } = await admin
    .from("job_queue")
    .insert({
      job_type: "writing_pipeline",
      payload: {
        draft_id: draft.id,
        tier: draft.tier,
        rfp_analysis_id: draft.rfp_analysis_id,
        org_id: draft.org_id,
        user_id: user.id,
      },
      status: "pending",
      priority: draft.is_full_confidence ? 2 : 1, // Full Confidence gets higher priority
      max_attempts: 2,
    });

  if (jobError) {
    return NextResponse.json({ error: "Failed to enqueue writing job" }, { status: 500 });
  }

  return NextResponse.json({ draft_id: draft.id, status: "queued" });
}
