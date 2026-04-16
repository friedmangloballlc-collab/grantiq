import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/referrals — get referral stats for current user
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: referrals } = await db
    .from("referrals")
    .select("id, code, status, credit_amount_cents, referred_email, created_at")
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false });

  const all = referrals ?? [];
  const code = all[0]?.code ?? "";
  const stats = {
    code,
    total: all.length,
    signed_up: all.filter((r) => ["signed_up", "converted", "credit_applied"].includes(r.status)).length,
    converted: all.filter((r) => ["converted", "credit_applied"].includes(r.status)).length,
    credits_earned: all.filter((r) => r.status === "credit_applied").reduce((s, r) => s + (r.credit_amount_cents ?? 0), 0) / 100,
    referrals: all,
  };

  return NextResponse.json(stats);
}

/**
 * POST /api/referrals/track — track a referral signup (called from signup route)
 */
export async function POST(req: NextRequest) {
  const { referral_code, referred_email, referred_user_id } = await req.json();

  if (!referral_code || !referred_email) {
    return NextResponse.json({ error: "referral_code and referred_email required" }, { status: 400 });
  }

  const db = createAdminClient();

  // Find the referrer by code
  const { data: referral } = await db
    .from("referrals")
    .select("id, referrer_user_id, referrer_org_id")
    .eq("code", referral_code)
    .eq("status", "pending")
    .limit(1)
    .single();

  if (!referral) {
    // Code doesn't exist or already used — create a new referral record
    const { data: referrerByCode } = await db
      .from("referrals")
      .select("referrer_user_id, referrer_org_id")
      .eq("code", referral_code)
      .limit(1)
      .single();

    if (!referrerByCode) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // Create new referral entry for this signup
    await db.from("referrals").insert({
      referrer_user_id: referrerByCode.referrer_user_id,
      referrer_org_id: referrerByCode.referrer_org_id,
      code: referral_code,
      referred_email,
      referred_user_id: referred_user_id ?? null,
      status: "signed_up",
    });

    logger.info("Referral tracked", { code: referral_code, referred_email });
    return NextResponse.json({ success: true, status: "signed_up" });
  }

  // Update existing pending referral
  await db.from("referrals").update({
    referred_email,
    referred_user_id: referred_user_id ?? null,
    status: "signed_up",
  }).eq("id", referral.id);

  // Check if referrer has 3+ signups → grant credit
  const { count } = await db
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_user_id", referral.referrer_user_id)
    .in("status", ["signed_up", "converted", "credit_applied"]);

  if ((count ?? 0) >= 3 && (count ?? 0) % 3 === 0) {
    // Every 3 referrals = 1 month credit ($39 = 3900 cents)
    const creditCents = 3900;
    await db.from("referrals").update({
      status: "credit_applied",
      credit_amount_cents: creditCents,
    }).eq("id", referral.id);

    logger.info("Referral credit applied", {
      referrer: referral.referrer_user_id,
      credits: creditCents,
      totalReferrals: count,
    });
  }

  return NextResponse.json({ success: true, status: "signed_up" });
}
