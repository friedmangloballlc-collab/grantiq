import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "getreachmediallc@gmail.com";

const VALID_TIERS = ["free", "starter", "pro", "growth", "enterprise"] as const;
type Tier = (typeof VALID_TIERS)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // id here is the user_id whose tier we want to change
  const { id: userId } = await params;

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

    const body = (await req.json()) as { tier?: string };
    if (!body.tier || !VALID_TIERS.includes(body.tier as Tier)) {
      return NextResponse.json(
        {
          error: `tier must be one of: ${VALID_TIERS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const tier = body.tier as Tier;
    const admin = createAdminClient();

    // Resolve the user's primary org
    const { data: membership, error: memberError } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "User has no active org membership" },
        { status: 404 }
      );
    }

    const { error: updateError } = await admin
      .from("subscriptions")
      .update({ tier, updated_at: new Date().toISOString() })
      .eq("org_id", membership.org_id);

    if (updateError) {
      logger.error("Failed to update subscription tier", {
        userId,
        orgId: membership.org_id,
        tier,
        err: updateError.message,
      });
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, tier });
  } catch (err) {
    logger.error("PATCH /api/admin/users/[id]/tier error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
