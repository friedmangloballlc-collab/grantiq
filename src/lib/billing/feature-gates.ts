// 5-tier system: free (explorer) → starter (seeker) → pro (strategist) → growth (applicant) → enterprise (organization)
export const TIER_ORDER = ["free", "starter", "pro", "growth", "enterprise"] as const;
export type Tier = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<string, string> = {
  free: "Explorer",
  starter: "Seeker",
  pro: "Strategist",
  growth: "Applicant",
  enterprise: "Organization",
};

// Grantie chat limits per day
export const GRANTIE_DAILY_LIMITS: Record<string, number> = {
  free: 5,
  starter: 15,
  pro: 30,      // Strategist: 30/day
  growth: 9999, // Applicant: unlimited
  enterprise: 9999,
};

// Feature gates — requiredTier is the minimum tier needed
export const FEATURE_GATES: Record<string, { requiredTier: string; limit?: number; perMonth?: boolean }> = {
  // Discovery
  grant_library_full: { requiredTier: "starter" },
  ai_matches_unlimited: { requiredTier: "starter" },  // All paid tiers see unlimited matches
  ai_match_scores_visible: { requiredTier: "pro" },
  funder_profiles: { requiredTier: "starter" },
  proactive_alerts: { requiredTier: "pro" },

  // Evaluation — Scorecard
  qualification_scorecard: { requiredTier: "free", limit: 1, perMonth: true },       // Explorer: 1 demo
  qualification_scorecard_starter: { requiredTier: "starter", limit: 10, perMonth: true }, // Seeker: 10/mo (matches pipeline)
  qualification_scorecard_unlimited: { requiredTier: "pro" },                        // Strategist+: unlimited
  grant_readiness_badges: { requiredTier: "starter" },
  similar_orgs_social_proof: { requiredTier: "pro" },

  // Evaluation — A-Z Readiness (tiered progression)
  readiness_basic: { requiredTier: "free" },           // Explorer: overall score + tier label + blurred gap count
  readiness_full: { requiredTier: "starter" },         // Seeker: + full 10-criteria breakdown + gap names
  readiness_actionable: { requiredTier: "pro" },       // Strategist: + fix actions + cost/time + grants unlocked per fix
  readiness_tracking: { requiredTier: "growth" },      // Applicant: + auto-improvement tracking + unlock notifications
  readiness_team: { requiredTier: "enterprise" },      // Organization: + team dashboard + benchmarks + per-member scores

  // Planning
  pipeline_items: { requiredTier: "free", limit: 3 },           // Explorer: 3
  pipeline_items_starter: { requiredTier: "starter", limit: 10 }, // Seeker: 10
  pipeline_items_pro: { requiredTier: "pro", limit: 25 },        // Strategist: 25
  pipeline_unlimited: { requiredTier: "growth" },                 // Applicant+: unlimited
  calendar_full: { requiredTier: "starter" },
  calendar_workback: { requiredTier: "pro" },
  calendar_alerts: { requiredTier: "growth" },
  weekly_digest_full: { requiredTier: "starter" },
  annual_calendar_auto: { requiredTier: "pro" },

  // Preparation
  document_vault: { requiredTier: "pro", limit: 10 },            // Strategist: 10 uploads
  document_vault_unlimited: { requiredTier: "growth" },           // Applicant: unlimited + AI extraction
  readiness_cross_reference: { requiredTier: "pro" },
  match_report_pdf: { requiredTier: "pro" },

  // Writing
  loi_generator: { requiredTier: "growth" },                      // Applicant: 3/mo included
  ai_writing: { requiredTier: "growth", limit: 2, perMonth: true }, // Applicant: 2 drafts/mo
  ai_writing_enterprise: { requiredTier: "enterprise", limit: 10, perMonth: true }, // Org: 10 drafts/mo
  compliance_checker: { requiredTier: "growth" },

  // Post-Award
  compliance_tracker: { requiredTier: "growth" },
  reporting_calendar: { requiredTier: "growth" },
  resubmission_assistant: { requiredTier: "growth" },
  win_loss_analysis: { requiredTier: "enterprise" },

  // Team & Admin
  team_members_3: { requiredTier: "pro" },                        // Strategist: 3 members
  team_members_5: { requiredTier: "growth" },                     // Applicant: 5 members
  team_unlimited: { requiredTier: "enterprise" },
  role_permissions: { requiredTier: "enterprise" },
  sso_saml: { requiredTier: "enterprise" },
  api_access: { requiredTier: "enterprise" },
  white_label: { requiredTier: "enterprise" },
  multi_client: { requiredTier: "enterprise" },
  priority_matching: { requiredTier: "enterprise" },
  dedicated_manager: { requiredTier: "enterprise" },
  advanced_analytics: { requiredTier: "enterprise" },
  bulk_import: { requiredTier: "enterprise" },
  draft_history: { requiredTier: "growth" },
};

export function canAccess(userTier: string, feature: string): boolean {
  const gate = FEATURE_GATES[feature];
  if (!gate) return true;
  return TIER_ORDER.indexOf(userTier as Tier) >= TIER_ORDER.indexOf(gate.requiredTier as Tier);
}

export function getFeatureLimit(userTier: string, feature: string): number | null {
  const gate = FEATURE_GATES[feature];
  if (!gate || !gate.limit) return null;
  if (!canAccess(userTier, feature)) return 0;
  return gate.limit;
}

export function getRequiredTierLabel(feature: string): string {
  const gate = FEATURE_GATES[feature];
  if (!gate) return "Explorer";
  return TIER_LABELS[gate.requiredTier] ?? gate.requiredTier;
}

export function getGrantieDailyLimit(tier: string): number {
  return GRANTIE_DAILY_LIMITS[tier] ?? 5;
}

export function getPipelineLimit(tier: string): number {
  if (TIER_ORDER.indexOf(tier as Tier) >= TIER_ORDER.indexOf("growth")) return 9999;
  if (tier === "pro") return 25;
  if (tier === "starter") return 10;
  return 3;
}

export function getTeamMemberLimit(tier: string): number {
  if (tier === "enterprise") return 9999;
  if (tier === "growth") return 5;
  if (tier === "pro") return 3;
  return 1;
}
