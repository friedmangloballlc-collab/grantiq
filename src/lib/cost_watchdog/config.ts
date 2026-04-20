// grantiq/src/lib/cost_watchdog/config.ts
//
// Watchdog thresholds + tier-aware hard caps. Conservative defaults
// per docs/plans/2026-04-20-001 "Decisions" section — easier to loosen
// than tighten after ship. All values in cents.

export interface WatchdogConfig {
  /** Multiplier vs prior window that triggers spend_spike warning */
  spikeMultiplierWarning: number;
  /** Multiplier vs prior window that triggers spend_spike critical */
  spikeMultiplierCritical: number;
  /** Absolute cents per hour floor — anomalies below this are noise */
  spikeNoiseFloorCents: number;
  /** Per-tier daily hard cap in cents */
  dailyHardCapByTier: Record<string, number>;
  /** Total tokens in a single session that trigger token_runaway */
  tokenRunawaySingleSession: number;
  /** Hours of zero app-wide spend before zero_activity fires */
  zeroActivityThresholdHours: number;
  /** Minimum cache hit pct for draft action before cache_hit_regression */
  cacheHitMinPctDraft: number;
}

export const DEFAULT_WATCHDOG_CONFIG: WatchdogConfig = {
  spikeMultiplierWarning: 3,
  spikeMultiplierCritical: 10,
  spikeNoiseFloorCents: 100, // $1/hour floor
  dailyHardCapByTier: {
    free: 500,       // $5/day
    starter: 1_500,  // $15/day
    pro: 2_500,      // $25/day (also the baseline for unknown tiers)
    growth: 5_000,   // $50/day
    enterprise: 15_000, // $150/day
  },
  tokenRunawaySingleSession: 500_000,
  zeroActivityThresholdHours: 2,
  cacheHitMinPctDraft: 0.5,
};

export function dailyHardCapForTier(tier: string | undefined, config: WatchdogConfig = DEFAULT_WATCHDOG_CONFIG): number {
  if (!tier) return config.dailyHardCapByTier.pro;
  return config.dailyHardCapByTier[tier] ?? config.dailyHardCapByTier.pro;
}
