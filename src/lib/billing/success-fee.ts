// src/lib/billing/success-fee.ts
//
// Utilities for computing + logging success fees. Rates match the
// /terms §5 disclosure table. Keep this in sync with the pricing
// page's per-tier successFee value — both numbers are marketing
// and legal claims, and they must agree.

export type FeeTier =
  | "free"
  | "starter"
  | "pro"
  | "growth"
  | "enterprise"
  | "custom";

// Success fee rate as a percentage (5 = 5%). Mirrors the rate
// column on the pricing page and the table in /terms §5.
export const SUCCESS_FEE_RATES: Record<Exclude<FeeTier, "custom">, number> = {
  free: 5,
  starter: 5,
  pro: 5,
  growth: 4,
  enterprise: 3,
};

/**
 * Compute the success fee amount in dollars (rounded to cents).
 * Uses the rate locked at the time of draft, not the current rate —
 * the caller is responsible for passing the right tier.
 */
export function computeSuccessFee(args: {
  amountAwarded: number;
  feeRatePercent: number;
}): number {
  const raw = args.amountAwarded * (args.feeRatePercent / 100);
  // Round to cents to avoid fractional-penny drift in Stripe invoices.
  return Math.round(raw * 100) / 100;
}

/**
 * 30-day due window from the day funds were received, per /terms §5.
 * Returns null if no funds_received_at is set yet (invoice not yet
 * due; customer hasn't received the money).
 */
export function computeDueDate(fundsReceivedAt: Date | null): Date | null {
  if (!fundsReceivedAt) return null;
  const due = new Date(fundsReceivedAt);
  due.setDate(due.getDate() + 30);
  return due;
}
