export const SUBSCRIPTION_PRODUCTS = {
  starter: {
    name: "Seeker",
    monthlyPrice: 7900, // cents — $79/mo
    annualPrice: 79000, // cents — $790/yr
    features: [
      "Full grant library (6,300+ grants)",
      "10 pipeline items",
      "Grant calendar",
      "5 vault docs",
      "15 AI chats/day",
      "Unlimited diagnostics",
    ],
  },
  pro: {
    name: "Strategist",
    monthlyPrice: 14900, // cents — $149/mo
    annualPrice: 149000, // cents — $1,490/yr
    features: [
      "Unlimited scorecard",
      "Document vault (20 docs)",
      "30 Grantie chats/day",
      "Analytics dashboard",
      "A-Z Readiness tracking",
    ],
  },
  growth: {
    name: "Applicant",
    monthlyPrice: 24900, // cents — $249/mo
    annualPrice: 249000, // cents — $2,490/yr
    features: [
      "AI writing (5 drafts/mo)",
      "Expert review available",
      "Unlimited pipeline",
      "Narrative memory",
      "Full Confidence eligible",
    ],
  },
  enterprise: {
    name: "Organization",
    monthlyPrice: 49900, // cents — $499/mo
    annualPrice: 499000, // cents — $4,990/yr
    features: [
      "Unlimited team members",
      "Dedicated grant writer",
      "API access",
      "White-label exports",
      "Customer success manager",
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
