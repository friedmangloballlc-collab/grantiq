export const SUBSCRIPTION_PRODUCTS = {
  starter: {
    name: "Seeker",
    monthlyPrice: 4900, // cents — $49/mo
    annualPrice: 47000, // cents — $470/yr
    features: [
      "Full grant library",
      "10 pipeline items",
      "Calendar",
      "5 docs",
    ],
  },
  pro: {
    name: "Strategist",
    monthlyPrice: 9900, // cents — $99/mo
    annualPrice: 95000, // cents — $950/yr
    features: [
      "Unlimited scorecard",
      "Document vault",
      "30 Grantie chats/day",
      "A-Z Readiness tracking",
    ],
  },
  growth: {
    name: "Applicant",
    monthlyPrice: 19900, // cents — $199/mo
    annualPrice: 191000, // cents — $1,910/yr
    features: [
      "AI writing + compliance",
      "Unlimited pipeline",
      "Budget narratives",
      "Full Confidence eligible",
    ],
  },
  enterprise: {
    name: "Organization",
    monthlyPrice: 39900, // cents — $399/mo
    annualPrice: 383000, // cents — $3,830/yr
    features: [
      "Unlimited team members",
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
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${interval === "month" ? "MONTHLY" : "ANNUAL"}`;
  const val = process.env[key];
  return val && val !== "price_xxx" ? val : undefined;
}
