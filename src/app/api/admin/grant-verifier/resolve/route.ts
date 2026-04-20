import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

type Action = "clear" | "archive" | "suppress";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { grant_source_id, action } = body as {
      grant_source_id?: string;
      action?: Action;
    };
    if (!grant_source_id) {
      return NextResponse.json({ error: "grant_source_id required" }, { status: 400 });
    }
    if (!action || !["clear", "archive", "suppress"].includes(action)) {
      return NextResponse.json({ error: "action must be clear|archive|suppress" }, { status: 400 });
    }

    const admin = createAdminClient();
    let updatePayload: Record<string, unknown>;

    switch (action) {
      case "clear":
        // Clear flag, next verifier run will re-check
        updatePayload = {
          manual_review_flag: false,
          manual_review_reason: null,
        };
        break;
      case "archive":
        // Mark inactive + closed, also clear the flag
        updatePayload = {
          is_active: false,
          status: "closed",
          manual_review_flag: false,
          manual_review_reason: `archived manually by ${user.email}`,
        };
        break;
      case "suppress":
        // Keep active, stop flagging. We indicate suppression by keeping
        // manual_review_flag=false but setting a reason string that the
        // verifier can check to skip this grant on future runs.
        // (Future enhancement: add explicit `verifier_suppressed` column
        // if we need to distinguish suppressed from resolved.)
        updatePayload = {
          manual_review_flag: false,
          manual_review_reason: `suppressed by ${user.email}`,
        };
        break;
    }

    const { error } = await admin
      .from("grant_sources")
      .update(updatePayload)
      .eq("id", grant_source_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("grant-verifier resolve error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
