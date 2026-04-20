import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateSuccessFee, buildSuccessFeeMessage } from "@/lib/billing/success-fees";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Membership lookup via admin client — bypasses RLS chicken-and-egg
    // on org_members (the SELECT policy on org_members itself depends on
    // public.user_org_ids() which queries org_members). Safe because we
    // scope by the JWT-verified user.id, not client-supplied input.
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("grant_pipeline")
      .select("*, grant_sources(name, funder_name, amount_max, deadline)")
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    logger.error("GET /api/pipeline error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    const body = await req.json();
    const { grant_source_id, stage = "identified", notes } = body;

    if (!grant_source_id) {
      return NextResponse.json({ error: "grant_source_id is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("grant_pipeline")
      .insert({
        org_id: membership.org_id,
        grant_source_id,
        stage,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/pipeline error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const VALID_STAGES = [
  "identified",
  "qualified",
  "in_development",
  "under_review",
  "submitted",
  "pending_decision",
  "awarded",
  "declined",
] as const;

type PipelineStage = (typeof VALID_STAGES)[number];

// Auto-action metadata returned to the client so it can surface prompts
function getAutoAction(
  fromStage: string | null,
  toStage: PipelineStage
): { action: string; description: string } | null {
  if (fromStage === "identified" && toStage === "qualified") {
    return {
      action: "run_qualification_scorecard",
      description: "Run the Qualification Scorecard to confirm this grant is worth pursuing.",
    };
  }
  if (fromStage === "qualified" && toStage === "in_development") {
    return {
      action: "generate_application_checklist",
      description:
        "Auto-generating application checklist by cross-referencing grant requirements with your document vault.",
    };
  }
  if (fromStage === "submitted" && toStage === "pending_decision") {
    return {
      action: "start_decision_timer",
      description: "Decision timer started. A follow-up reminder has been scheduled for 30 days out.",
    };
  }
  if (fromStage === "pending_decision" && toStage === "awarded") {
    return {
      action: "create_compliance_calendar",
      description:
        "Congratulations! Compliance calendar created. Review your obligations in the Awarded panel.",
    };
  }
  if (fromStage === "pending_decision" && toStage === "declined") {
    return {
      action: "prompt_feedback_and_resubmission",
      description:
        "Marked as declined. Consider requesting feedback and flagging for resubmission next cycle.",
    };
  }
  return null;
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, stage, notes, loi_status, award_amount } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const VALID_LOI_STATUSES = ["not_required", "sent", "accepted", "declined"] as const;
    if (loi_status !== undefined && !VALID_LOI_STATUSES.includes(loi_status)) {
      return NextResponse.json(
        { error: `Invalid loi_status. Must be one of: ${VALID_LOI_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (stage !== undefined && !VALID_STAGES.includes(stage as PipelineStage)) {
      return NextResponse.json(
        {
          error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (stage !== undefined) updates.stage = stage;
    if (notes !== undefined) updates.notes = notes;
    if (loi_status !== undefined) updates.loi_status = loi_status;
    if (award_amount !== undefined) updates.award_amount = award_amount;

    const admin = createAdminClient();

    // Fetch current item to verify ownership and capture previous stage
    const { data: item } = await admin
      .from("grant_pipeline")
      .select("org_id, stage, grant_source_id, writing_tier")
      .eq("id", id)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Pipeline item not found" }, { status: 404 });
    }

    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", item.org_id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await admin
      .from("grant_pipeline")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const autoAction =
      stage !== undefined
        ? getAutoAction(item.stage ?? null, stage as PipelineStage)
        : null;

    // ── Success fee: triggered when stage transitions to "awarded" ──────────────
    let successFeeNotification: string | null = null;

    if (stage === "awarded" && item.stage !== "awarded") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writingTier: string | null = (item as any).writing_tier ?? null;
      const resolvedAwardAmount =
        typeof award_amount === "number" && award_amount > 0 ? award_amount : null;

      if (writingTier && resolvedAwardAmount) {
        const feeResult = calculateSuccessFee(resolvedAwardAmount, writingTier);
        if (feeResult) {
          // Insert into success_fee_invoices (best-effort — table may not exist in all envs)
          await admin
            .from("success_fee_invoices")
            .insert({
              org_id: item.org_id,
              pipeline_id: id,
              grant_source_id: item.grant_source_id,
              award_amount: resolvedAwardAmount,
              fee_amount: feeResult.feeAmount,
              fee_percentage: feeResult.feePercentage,
              minimum_applied: feeResult.minimumApplied,
              writing_tier: writingTier,
              status: "pending",
            })
            .then(({ error: insertErr }) => {
              if (insertErr) logger.error("Failed to insert success_fee_invoice", { err: insertErr.message });
            });

          successFeeNotification = buildSuccessFeeMessage(resolvedAwardAmount, feeResult);
        }
      }
    }

    // ── Fire-and-forget feedback for terminal outcomes ──────────────────────────
    if (stage === "awarded" || stage === "declined") {
      const feedbackAction = stage === "awarded" ? "won" : "lost";
      // Direct insert instead of relative HTTP call (which fails server-side)
      admin.from("match_feedback").insert({
        org_id: item.org_id,
        grant_source_id: item.grant_source_id,
        user_action: feedbackAction,
      }).then(({ error: fbErr }) => {
        if (fbErr) logger.warn("Feedback insert failed", { err: fbErr.message });
      });
    }

    return NextResponse.json({ success: true, autoAction, successFeeNotification });
  } catch (err) {
    logger.error("PATCH /api/pipeline error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Confirm the pipeline item belongs to an org the user is a member of
    const { data: item } = await admin
      .from("grant_pipeline")
      .select("org_id")
      .eq("id", id)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Pipeline item not found" }, { status: 404 });
    }

    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", item.org_id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await admin.from("grant_pipeline").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE /api/pipeline error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
