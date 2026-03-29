import { stripe } from "./client";

export async function createCheckoutSession({
  orgId, userId, priceId, successUrl, cancelUrl,
}: {
  orgId: string; userId: string; priceId: string; successUrl: string; cancelUrl: string;
}) {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { org_id: orgId, user_id: userId },
  });
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
