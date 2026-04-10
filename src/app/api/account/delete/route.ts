import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate-limit: 1 deletion attempt per hour per user
    const { allowed } = checkRateLimit(`account-delete:${user.id}`, 1, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 }
      );
    }

    const admin = createAdminClient();
    const userId = user.id;

    // 1. Delete all user data in dependency order (most derived → least derived)

    // AI usage logs
    const { error: aiUsageError } = await admin
      .from("ai_usage")
      .delete()
      .eq("user_id", userId);
    if (aiUsageError) {
      logger.error("account delete: ai_usage error", { message: aiUsageError.message });
    }

    // Grant correction reports submitted by this user
    const { error: correctionsError } = await admin
      .from("grant_corrections")
      .delete()
      .eq("user_id", userId);
    if (correctionsError) {
      logger.error("account delete: grant_corrections error", { message: correctionsError.message });
    }

    // Subscriptions
    const { error: subError } = await admin
      .from("subscriptions")
      .delete()
      .eq("user_id", userId);
    if (subError) {
      logger.error("account delete: subscriptions error", { message: subError.message });
    }

    // Org membership (and cascade — org-level data is owned by the org, not the
    // user directly, so we only remove their membership record here)
    const { error: memberError } = await admin
      .from("org_members")
      .delete()
      .eq("user_id", userId);
    if (memberError) {
      logger.error("account delete: org_members error", { message: memberError.message });
    }

    // 2. Delete the auth user — this is irreversible
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      logger.error("account delete: auth.admin.deleteUser error", { message: authError.message });
      return NextResponse.json(
        { error: "Failed to delete account. Please contact support." },
        { status: 500 }
      );
    }

    logger.info("account delete: user deleted", { userId });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE /api/account/delete error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
