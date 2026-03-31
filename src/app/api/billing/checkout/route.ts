import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured, getPriceId, type SubscriptionTierKey } from "@/lib/stripe/products";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let tier: SubscriptionTierKey;
  let interval: "month" | "year";
  try {
    const body = await req.json();
    tier = body.tier;
    interval = body.interval ?? "month";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!["starter", "pro", "enterprise"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (!["month", "year"].includes(interval)) {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }

  // Get org_id from membership
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  const { orgId } = { orgId: membership.org_id };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // If Stripe keys are placeholder, return mock response
  if (!isStripeConfigured()) {
    return NextResponse.json({
      url: `/settings/billing?upgrade=pending&tier=${tier}&interval=${interval}`,
      mock: true,
    });
  }

  // Real Stripe checkout
  const priceId = getPriceId(tier, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: "Price not configured for this tier/interval" },
      { status: 400 }
    );
  }

  try {
    const session = await createCheckoutSession({
      orgId,
      userId: user.id,
      priceId,
      successUrl: `${appUrl}/settings/billing?checkout=success`,
      cancelUrl: `${appUrl}/upgrade?canceled=true`,
    });

    // DO NOT upgrade tier here — only the Stripe webhook should set the tier
    // after payment is confirmed. This prevents users from getting paid features
    // without actually paying.

    return NextResponse.json({ url: session.url });
  } catch (err) {
    logger.error("Stripe checkout error", { err: String(err) });
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
