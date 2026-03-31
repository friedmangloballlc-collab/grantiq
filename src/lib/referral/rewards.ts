export const REFERRAL_REWARDS = {
  referrer: [
    { count: 1, reward: "$50 account credit", type: "credit", amount: 5000 },
    { count: 3, reward: "1 free month of Seeker plan", type: "subscription", months: 1 },
    { count: 5, reward: "Free AI Grant Review ($149 value)", type: "writing_credit", amount: 14900 },
    { count: 10, reward: "Grant Insider badge + priority support for life", type: "badge" },
  ],
  referred: {
    reward: "14-day Strategist trial (instead of Explorer)",
    trialTier: "pro",
    trialDays: 14,
    bonusMatches: 10, // See 10 matches instead of 5
  },
} as const;

export type ReferrerReward = (typeof REFERRAL_REWARDS.referrer)[number];

/** Returns the next reward tier for a given referral count, or null if maxed out. */
export function getNextReward(count: number): ReferrerReward | null {
  return REFERRAL_REWARDS.referrer.find((r) => r.count > count) ?? null;
}

/** Returns the highest reward already unlocked for a given referral count, or null. */
export function getCurrentReward(count: number): ReferrerReward | null {
  const unlocked = REFERRAL_REWARDS.referrer.filter((r) => r.count <= count);
  return unlocked[unlocked.length - 1] ?? null;
}
