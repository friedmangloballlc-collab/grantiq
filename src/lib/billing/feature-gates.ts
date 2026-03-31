export const FEATURE_GATES: Record<string, { requiredTier: string; limit?: number }> = {
  grant_library_full: { requiredTier: "starter" },
  ai_matches_unlimited: { requiredTier: "starter" },
  qualification_scorecard: { requiredTier: "starter", limit: 3 }, // 3/mo on starter
  pipeline_unlimited: { requiredTier: "pro" },
  ai_writing: { requiredTier: "pro" },
  document_vault: { requiredTier: "starter", limit: 5 },
  compliance_tracker: { requiredTier: "pro" },
  team_members: { requiredTier: "enterprise" },
  calendar_workback: { requiredTier: "starter" },
};

const TIER_ORDER = ["free", "starter", "pro", "enterprise"];

export function canAccess(userTier: string, feature: string): boolean {
  const gate = FEATURE_GATES[feature];
  if (!gate) return true;
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(gate.requiredTier);
}

export function getRequiredTierLabel(feature: string): string {
  const gate = FEATURE_GATES[feature];
  if (!gate) return "Free";
  const tier = gate.requiredTier;
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
