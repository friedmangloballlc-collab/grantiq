import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { getTierForPriceId } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Idempotency check
  const { data: existing } = await supabase
    .from("processed_webhook_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const orgId = session.metadata?.org_id;
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as any;
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const tierInfo = priceId ? getTierForPriceId(priceId) : undefined;

      if (orgId && tierInfo) {
        await supabase.from("subscriptions").upsert({
          org_id: orgId,
          user_id: session.metadata?.user_id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          tier: tierInfo.tier,
          status: "active",
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        }, { onConflict: "org_id" });
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as any;
      const priceId = sub.items.data[0]?.price.id;
      const tierInfo = priceId ? getTierForPriceId(priceId) : undefined;
      if (tierInfo) {
        await supabase
          .from("subscriptions")
          .update({
            tier: tierInfo.tier,
            status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "active",
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled", tier: "free" })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_customer_id", invoice.customer as string);
      break;
    }
  }

  // Mark as processed
  await supabase.from("processed_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processed_at: new Date().toISOString(),
  });

  return NextResponse.json({ received: true });
}
