import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    // Get org_id from org_members
    const { data: membership, error: memberErr } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (memberErr || !membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgId = membership.org_id;

    // Get the org's mission statement
    const { data: org } = await db
      .from("organizations")
      .select("mission_statement")
      .eq("id", orgId)
      .single();

    const missionText = org?.mission_statement ?? "";

    // Generate mission embedding if we have a mission statement
    if (missionText) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: missionText,
        });
        const embedding = embeddingResponse.data[0]?.embedding ?? null;

        if (embedding) {
          await db
            .from("organizations")
            .update({ mission_embedding: embedding })
            .eq("id", orgId);
        }
      } catch (embeddingErr) {
        // Non-blocking — proceed even if embedding fails
        console.error("Embedding generation failed:", embeddingErr);
      }
    }

    // Queue match_grants job
    const { data: matchJob, error: matchErr } = await db
      .from("job_queue")
      .insert({
        job_type: "match_grants",
        org_id: orgId,
        status: "pending",
        payload: { user_id: user.id, triggered_by: "onboarding_complete" },
      })
      .select("id")
      .single();

    if (matchErr) {
      console.error("Failed to queue match_grants job:", matchErr.message);
    }

    // Queue score_readiness job
    const { data: readinessJob, error: readinessErr } = await db
      .from("job_queue")
      .insert({
        job_type: "score_readiness",
        org_id: orgId,
        status: "pending",
        payload: { user_id: user.id, triggered_by: "onboarding_complete" },
      })
      .select("id")
      .single();

    if (readinessErr) {
      console.error("Failed to queue score_readiness job:", readinessErr.message);
    }

    return NextResponse.json({
      success: true,
      matchJobId: matchJob?.id ?? null,
      readinessJobId: readinessJob?.id ?? null,
    });
  } catch (err) {
    console.error("Onboarding complete error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
