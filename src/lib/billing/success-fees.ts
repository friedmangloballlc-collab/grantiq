// grantiq/src/lib/billing/success-fees.ts
//
// Success fee calculation for the Full Confidence tier.
// Fee is 10% of the awarded amount, subject to minimums.
// Invoked when a pipeline grant moves to "awarded" stage.

export interface SuccessFeeResult {
  feeAmount: number;       // dollar amount to invoice
  feePercentage: number;   // percentage (e.g. 10)
  minimumApplied: boolean; // true if the minimum floor raised the fee
}

/**
 * Calculate the success fee for an awarded grant.
 *
 * Only the "full_confidence" (tier3_expert) tier includes a success fee.
 * Returns null for all other tiers.
 *
 * Minimums:
 *  - Awards under $10K: minimum $250
 *  - Awards $10K–$49,999: minimum $500
 *  - Awards $50K+: no minimum (10% always exceeds $500 on these)
 */
export function calculateSuccessFee(
  awardAmount: number,
  tier: string
): SuccessFeeResult | null {
  // Only the top tier carries a success fee
  if (tier !== "full_confidence" && tier !== "tier3_expert") return null;

  const percentage = 0.10;
  const rawFee = Math.round(awardAmount * percentage);

  let feeAmount = rawFee;
  let minimumApplied = false;

  if (awardAmount < 10_000) {
    if (feeAmount < 250) {
      feeAmount = 250;
      minimumApplied = true;
    }
  } else if (awardAmount < 50_000) {
    if (feeAmount < 500) {
      feeAmount = 500;
      minimumApplied = true;
    }
  }

  return {
    feeAmount,
    feePercentage: percentage * 100,
    minimumApplied,
  };
}

/**
 * Build the user-facing congratulatory message shown when a grant is awarded.
 */
export function buildSuccessFeeMessage(
  awardAmount: number,
  result: SuccessFeeResult
): string {
  const formattedAward = awardAmount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const formattedFee = result.feeAmount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    `Congratulations on your ${formattedAward} award! ` +
    `Your ${result.feePercentage}% success fee of ${formattedFee} will be invoiced shortly.`
  );
}
