export const APP_NAME = "GrantAQ";
export const APP_DESCRIPTION = "AI-powered grant discovery, strategy, and writing platform";

export const TIERS = ["free", "starter", "pro", "growth", "enterprise"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABELS: Record<Tier, string> = {
  free: "Explorer",
  starter: "Seeker",
  pro: "Strategist",
  growth: "Applicant",
  enterprise: "Organization",
};

export const TIER_PRICES: Record<Tier, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 49, annual: 470 },
  pro: { monthly: 99, annual: 950 },
  growth: { monthly: 199, annual: 1910 },
  enterprise: { monthly: 399, annual: 3830 },
};

export const SUCCESS_FEE_RATES = {
  free: { discovery: 0.05, ai_assisted: null, full_service: null, full_confidence: 0.10 },
  starter: { discovery: 0.04, ai_assisted: 0.07, full_service: 0.09, full_confidence: 0.10 },
  pro: { discovery: 0.04, ai_assisted: 0.06, full_service: 0.08, full_confidence: 0.10 },
  growth: { discovery: 0.03, ai_assisted: 0.05, full_service: 0.07, full_confidence: 0.10 },
  enterprise: { discovery: 0.03, ai_assisted: 0.05, full_service: 0.07, full_confidence: 0.10 },
} as const;

export const GRANT_WRITING_PRICES = {
  ai_only: { state: 149, federal: 349, sbir: 499 },
  ai_audit: { state: 249, federal: 549, sbir: 749 },
  expert_audit: { state: 499, federal: 1249, sbir: 1749 },
} as const;

export const ENTITY_TYPES = [
  { value: "nonprofit_501c3", label: "501(c)(3) Nonprofit" },
  { value: "nonprofit_501c4", label: "501(c)(4) Social Welfare" },
  { value: "nonprofit_501c6", label: "501(c)(6) Business League" },
  { value: "nonprofit_other", label: "Other Nonprofit" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "sole_prop", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
] as const;
