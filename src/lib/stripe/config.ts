export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";

export function getTierForPriceId(priceId: string): { tier: SubscriptionTier; interval: "month" | "year" } | undefined {
  const mapping: Record<string, { tier: SubscriptionTier; interval: "month" | "year" }> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: { tier: "starter", interval: "month" },
    [process.env.STRIPE_PRICE_STARTER_ANNUAL!]: { tier: "starter", interval: "year" },
    [process.env.STRIPE_PRICE_PRO_MONTHLY!]: { tier: "pro", interval: "month" },
    [process.env.STRIPE_PRICE_PRO_ANNUAL!]: { tier: "pro", interval: "year" },
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!]: { tier: "enterprise", interval: "month" },
    [process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL!]: { tier: "enterprise", interval: "year" },
  };
  return mapping[priceId];
}
