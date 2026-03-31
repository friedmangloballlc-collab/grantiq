export const SUBSCRIPTION_PRODUCTS = {
  starter: {
    name: "Starter",
    monthlyPrice: 4900, // cents
    annualPrice: 47000, // cents (20% off)
    features: [
      "Full grant library",
      "10 pipeline items",
      "Calendar",
      "5 docs",
    ],
  },
  pro: {
    name: "Pro",
    monthlyPrice: 14900,
    annualPrice: 143000,
    features: [
      "Unlimited everything",
      "AI writing (1/mo)",
      "Document vault",
      "Compliance tracker",
    ],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 49900,
    annualPrice: 479000,
    features: [
      "Teams",
      "5 AI drafts/mo",
      "API access",
      "Priority support",
    ],
  },
} as const;

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_PRODUCTS;

/** Returns true if the Stripe secret key is a real (non-placeholder) key. */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_") && key !== "sk_test_xxx" && key.length > 20;
}

/** Get the Stripe price ID for a tier + interval from env vars. */
export function getPriceId(
  tier: SubscriptionTierKey,
  interval: "month" | "year"
): string | undefined {
  const envKey =
    tier === "starter" && interval === "month"
      ? "STRIPE_PRICE_STARTER_MONTHLY"
      : tier === "starter" && interval === "year"
      ? "STRIPE_PRICE_STARTER_ANNUAL"
      : tier === "pro" && interval === "month"
      ? "STRIPE_PRICE_PRO_MONTHLY"
      : tier === "pro" && interval === "year"
      ? "STRIPE_PRICE_PRO_ANNUAL"
      : tier === "enterprise" && interval === "month"
      ? "STRIPE_PRICE_ENTERPRISE_MONTHLY"
      : "STRIPE_PRICE_ENTERPRISE_ANNUAL";

  const val = process.env[envKey];
  return val && val !== "price_xxx" ? val : undefined;
}
