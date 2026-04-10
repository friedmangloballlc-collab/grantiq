// grantaq/src/lib/ai/writing/pricing.ts

import type { WritingTier, GrantType } from "@/types/writing";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Pricing Matrix (cents) — from spec Section 5.2
// ============================================================

const PRICING_MATRIX: Record<WritingTier, Record<GrantType, number>> = {
  tier1_ai_only: {
    state_foundation: 14900,   // $149
    federal: 34900,            // $349
    sbir_sttr: 49900,          // $499
  },
  tier2_ai_audit: {
    state_foundation: 24900,   // $249
    federal: 54900,            // $549
    sbir_sttr: 74900,          // $749
  },
  tier3_expert: {
    state_foundation: 49900,   // $499
    federal: 124900,           // $1,249
    sbir_sttr: 174900,         // $1,749
  },
  full_confidence: {
    state_foundation: 0,       // $0 upfront
    federal: 0,
    sbir_sttr: 0,
  },
};

/**
 * Returns the price in cents for a given tier and grant type.
 */
export function getWritingPrice(tier: WritingTier, grantType: GrantType): number {
  return PRICING_MATRIX[tier][grantType];
}

/**
 * Returns estimated turnaround time for a tier.
 */
export function getEstimatedTurnaround(tier: WritingTier): string {
  switch (tier) {
    case "tier1_ai_only": return "30 minutes";
    case "tier2_ai_audit": return "1 hour";
    case "tier3_expert": return "24-48 hours";
    case "full_confidence": return "1 hour";
  }
}

/**
 * Returns the estimated margin percentage for a tier.
 */
export function getEstimatedMargin(tier: WritingTier): number {
  switch (tier) {
    case "tier1_ai_only": return 96;   // ~$3-8 AI cost
    case "tier2_ai_audit": return 95;  // ~$10-20 AI cost
    case "tier3_expert": return 80;    // expert reviewer cost
    case "full_confidence": return 0;  // deferred revenue via success fee
  }
}

// ============================================================
// Success Fee Rates — from spec Section 5.4
// ============================================================

const SUCCESS_FEE_RATES: Record<string, Record<string, number>> = {
  // fee_tier -> subscription_tier -> percentage
  discovery_only: { free: 5, starter: 4, pro: 4, enterprise: 3 },
  ai_assisted: { free: 0, starter: 7, pro: 6, enterprise: 5 },
  expert_assisted: { free: 0, starter: 9, pro: 8, enterprise: 7 },
  full_confidence: { free: 0, starter: 10, pro: 10, enterprise: 10 },
};

/**
 * Returns the success fee percentage for a given writing tier and subscription.
 */
export function getSuccessFeeRate(
  writingTier: WritingTier,
  subscriptionTier: string
): number {
  const feeTier = writingTier === "full_confidence" ? "full_confidence"
    : writingTier === "tier3_expert" ? "expert_assisted"
    : writingTier === "tier1_ai_only" || writingTier === "tier2_ai_audit" ? "ai_assisted"
    : "discovery_only";

  return SUCCESS_FEE_RATES[feeTier]?.[subscriptionTier] ?? 0;
}

/**
 * Minimum fee calculation from spec:
 * - Under $10K: $250 minimum
 * - $10K-$50K: $500 minimum
 * - $50K+: percentage applies
 */
export function calculateSuccessFee(
  amountAwarded: number,
  feePct: number
): number {
  const percentageFee = amountAwarded * (feePct / 100);

  if (amountAwarded < 10000) return Math.max(250, percentageFee);
  if (amountAwarded < 50000) return Math.max(500, percentageFee);
  return percentageFee;
}

// ============================================================
// Full Confidence Package Eligibility
// ============================================================

interface FullConfidenceEligibility {
  eligible: boolean;
  reasons: string[];
  checks: {
    readiness_score_met: boolean;
    match_score_met: boolean;
    grant_amount_met: boolean;
    paid_tier: boolean;
    under_active_limit: boolean;
  };
}

/**
 * Checks if an org/grant combination qualifies for the Full Confidence Package.
 *
 * Requirements from spec Section 5.3:
 * - Readiness score 70+
 * - Match score 75+
 * - Grant amount $25,000+
 * - Paid subscription tier (starter, pro, enterprise)
 * - Maximum 3 active Full Confidence applications at a time
 */
export async function checkFullConfidenceEligibility(
  orgId: string,
  grantSourceId: string
): Promise<FullConfidenceEligibility> {
  const supabase = createAdminClient();
  const reasons: string[] = [];

  // 1. Get readiness score
  const { data: readiness } = await supabase
    .from("readiness_scores")
    .select("overall_score")
    .eq("org_id", orgId)
    .order("scored_at", { ascending: false })
    .limit(1)
    .single();

  const readinessScore = readiness?.overall_score ?? 0;
  const readinessOk = readinessScore >= 70;
  if (!readinessOk) reasons.push(`Readiness score is ${readinessScore} (need 70+)`);

  // 2. Get match score
  const { data: match } = await supabase
    .from("grant_matches")
    .select("match_score")
    .eq("org_id", orgId)
    .eq("grant_source_id", grantSourceId)
    .single();

  const matchScore = match?.match_score ?? 0;
  const matchOk = matchScore >= 75;
  if (!matchOk) reasons.push(`Match score is ${matchScore} (need 75+)`);

  // 3. Get grant amount
  const { data: grant } = await supabase
    .from("grant_sources")
    .select("amount_min, amount_max")
    .eq("id", grantSourceId)
    .single();

  const grantAmount = grant?.amount_min ?? grant?.amount_max ?? 0;
  const amountOk = grantAmount >= 25000;
  if (!amountOk) reasons.push(`Grant amount is $${grantAmount.toLocaleString()} (need $25,000+)`);

  // 4. Check subscription tier
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("org_id", orgId)
    .eq("status", "active")
    .single();

  const tier = subscription?.tier ?? "free";
  const paidTier = tier !== "free";
  if (!paidTier) reasons.push("Free tier — upgrade to Starter or higher");

  // 5. Count active Full Confidence applications
  const { count } = await supabase
    .from("full_confidence_applications")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "active");

  const activeCount = count ?? 0;
  const underLimit = activeCount < 3;
  if (!underLimit) reasons.push(`Already at maximum (${activeCount}/3) active Full Confidence applications`);

  return {
    eligible: readinessOk && matchOk && amountOk && paidTier && underLimit,
    reasons,
    checks: {
      readiness_score_met: readinessOk,
      match_score_met: matchOk,
      grant_amount_met: amountOk,
      paid_tier: paidTier,
      under_active_limit: underLimit,
    },
  };
}

// ============================================================
// Tier Access Check — what tiers can a subscription purchase?
// ============================================================

/**
 * Determines which writing tiers are available to a given subscription.
 * Free tier cannot purchase any writing. Starter+ can purchase all tiers.
 * Pro/Enterprise get included drafts per month (checked elsewhere via tier_limits).
 */
export function getAvailableTiers(subscriptionTier: string): WritingTier[] {
  if (subscriptionTier === "free") return [];
  return ["tier1_ai_only", "tier2_ai_audit", "tier3_expert", "full_confidence"];
}

/**
 * Checks if this specific purchase is allowed under the org's plan.
 * Returns { allowed, reason } — reason explains why if not allowed.
 */
export async function canPurchaseWriting(
  orgId: string,
  tier: WritingTier,
  _grantType: GrantType
): Promise<{ allowed: boolean; reason: string | null }> {
  const supabase = createAdminClient();

  // Check subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("org_id", orgId)
    .eq("status", "active")
    .single();

  const subTier = subscription?.tier ?? "free";
  const availableTiers = getAvailableTiers(subTier);

  if (!availableTiers.includes(tier)) {
    return {
      allowed: false,
      reason: subTier === "free"
        ? "AI Writing requires a Starter subscription or higher. Upgrade to unlock."
        : `The ${tier} writing tier is not available on your plan.`,
    };
  }

  // Full Confidence has additional eligibility checks (handled separately)
  if (tier === "full_confidence") {
    return { allowed: true, reason: null }; // Eligibility checked via checkFullConfidenceEligibility
  }

  return { allowed: true, reason: null };
}
