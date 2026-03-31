import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured } from "@/lib/stripe/products";
import { createPortalSession } from "@/lib/stripe/checkout";
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // If Stripe keys are placeholder, redirect to billing settings with a message
  if (!isStripeConfigured()) {
    return NextResponse.redirect(`${appUrl}/settings/billing?portal=unavailable`, { status: 303 });
  }

  // Get org_id and stripe_customer_id
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

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("org_id", membership.org_id)
    .single();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.redirect(`${appUrl}/upgrade`, { status: 303 });
  }

  try {
    const session = await createPortalSession(
      subscription.stripe_customer_id,
      `${appUrl}/settings/billing`
    );

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    logger.error("Stripe portal error", { err: String(err) });
    return NextResponse.redirect(`${appUrl}/settings/billing?portal=error`, { status: 303 });
  }
}
