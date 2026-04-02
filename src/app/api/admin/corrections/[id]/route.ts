import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const ADMIN_EMAIL = "getreachmediallc@gmail.com";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { action?: string };
    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Fetch the correction record
    const { data: correction, error: fetchError } = await admin
      .from("grant_corrections")
      .select("id, grant_id, field_name, suggested_value, status")
      .eq("id", id)
      .single();

    if (fetchError || !correction) {
      return NextResponse.json({ error: "Correction not found" }, { status: 404 });
    }

    if (correction.status !== "pending") {
      return NextResponse.json(
        { error: "Correction has already been reviewed" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // If approving, apply the suggested value to grant_sources
    if (body.action === "approve") {
      const updatePayload: Record<string, unknown> = {
        [correction.field_name]: correction.suggested_value,
        updated_at: now,
      };

      const { error: grantUpdateError } = await admin
        .from("grant_sources")
        .update(updatePayload)
        .eq("id", correction.grant_id);

      if (grantUpdateError) {
        logger.error("Failed to apply correction to grant_sources", {
          correctionId: id,
          err: grantUpdateError.message,
        });
        return NextResponse.json(
          { error: "Failed to update grant source" },
          { status: 500 }
        );
      }
    }

    // Update the correction record status
    const { error: updateError } = await admin
      .from("grant_corrections")
      .update({
        status: body.action === "approve" ? "approved" : "rejected",
        reviewed_at: now,
        reviewed_by: user.id,
      })
      .eq("id", id);

    if (updateError) {
      logger.error("Failed to update grant_corrections status", {
        correctionId: id,
        err: updateError.message,
      });
      return NextResponse.json(
        { error: "Failed to update correction status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, action: body.action });
  } catch (err) {
    logger.error("PATCH /api/admin/corrections/[id] error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
