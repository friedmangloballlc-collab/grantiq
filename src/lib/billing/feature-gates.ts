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

// Grantie tier-aware behavior — knows user's tier and naturally suggests upgrades
export const GRANTIE_TIER_CONTEXT: Record<string, string> = {
  free: "This user is on the free Explorer plan. They can browse basic grant info. When they ask about details, evaluation, or writing, mention that upgrading to Seeker ($49/mo) unlocks full grant details and tracking.",
  starter: "This user is on the Seeker plan ($49/mo). They can see full details and track 10 grants. When they ask about evaluating grants in depth or document management, mention the Strategist plan ($99/mo) unlocks unlimited scorecard evaluations and document vault.",
  pro: "This user is on the Strategist plan ($99/mo). They can evaluate and prepare. When they ask about writing applications or AI drafting, mention the Applicant plan ($199/mo) includes AI writing and compliance tracking.",
  growth: "This user is on the Applicant plan ($199/mo). They have AI writing and compliance. When they mention team needs or multiple users, mention the Organization plan ($399/mo) for unlimited team members.",
  enterprise: "This user is on the Organization plan ($399/mo). They have everything. Focus on maximizing their success — no upsells needed.",
};

// Feature gates — requiredTier is the minimum tier needed
export const FEATURE_GATES: Record<string, { requiredTier: string; limit?: number; perMonth?: boolean }> = {
  // ─── Discovery ────────────────────────────────────────────────────────
  grant_library_basic: { requiredTier: "free" },               // Explorer: name, type, amount range only
  grant_library_full: { requiredTier: "starter" },             // Seeker: + description, deadline, eligibility, focus areas
  grant_library_ai_scores: { requiredTier: "pro" },            // Strategist: + AI match score, readiness badge
  grant_library_apply_button: { requiredTier: "growth" },      // Applicant: + "Apply through GrantAQ" button (no external URL)
  grant_library_external_url: { requiredTier: "enterprise" },  // Organization only: raw funder URL visible (locked in via team)
  ai_matches_unlimited: { requiredTier: "starter" },           // All paid tiers see unlimited matches
  funder_profiles: { requiredTier: "starter" },
  proactive_alerts: { requiredTier: "pro" },

  // ─── Evaluation — Scorecard ───────────────────────────────────────────
  qualification_scorecard: { requiredTier: "free", limit: 1, perMonth: true },       // Explorer: 1 demo
  qualification_scorecard_starter: { requiredTier: "starter", limit: 10, perMonth: true }, // Seeker: 10/mo
  qualification_scorecard_unlimited: { requiredTier: "pro" },                        // Strategist+: unlimited
  grant_readiness_badges: { requiredTier: "starter" },
  similar_orgs_social_proof: { requiredTier: "pro" },

  // ─── Evaluation — A-Z Readiness (tiered progression) ──────────────────
  readiness_basic: { requiredTier: "free" },           // Explorer: overall score + tier label + blurred gap count
  readiness_full: { requiredTier: "starter" },         // Seeker: + full 10-criteria breakdown + gap names
  readiness_actionable: { requiredTier: "pro" },       // Strategist: + fix actions + cost/time + grants unlocked per fix
  readiness_tracking: { requiredTier: "growth" },      // Applicant: + auto-improvement tracking + unlock notifications
  readiness_team: { requiredTier: "enterprise" },      // Organization: + team dashboard + benchmarks + per-member scores

  // ─── Planning — Pipeline ──────────────────────────────────────────────
  pipeline_items: { requiredTier: "free", limit: 3 },           // Explorer: 3
  pipeline_items_starter: { requiredTier: "starter", limit: 10 }, // Seeker: 10
  pipeline_items_pro: { requiredTier: "pro", limit: 25 },        // Strategist: 25
  pipeline_unlimited: { requiredTier: "growth" },                 // Applicant+: unlimited
  pipeline_stale_reminders: { requiredTier: "starter" },          // Seeker+: 14-day stale grant nudges

  // ─── Planning — Calendar (never shows funder URLs) ────────────────────
  calendar_count_only: { requiredTier: "free" },                 // Explorer: "3 upcoming deadlines" badge only
  calendar_pipeline_deadlines: { requiredTier: "starter" },      // Seeker: pipeline grant names + dates (no funder URLs)
  calendar_fiscal_cycle: { requiredTier: "pro" },                // Strategist: + fiscal cycle sidebar + work-back timelines
  calendar_proactive_alerts: { requiredTier: "growth" },         // Applicant: + recurring grant predictions + prep nudges
  calendar_team: { requiredTier: "enterprise" },                 // Organization: + team calendar + capacity view

  // ─── Planning — Digest (tiered content) ───────────────────────────────
  weekly_digest_teaser: { requiredTier: "free" },                // Explorer: 3 grant teasers (name + type, details blurred)
  weekly_digest_full: { requiredTier: "starter" },               // Seeker: full matches + deadlines
  weekly_digest_readiness: { requiredTier: "pro" },              // Strategist: + readiness updates + fix reminders
  weekly_digest_drafts: { requiredTier: "growth" },              // Applicant: + draft progress + compliance reminders
  weekly_digest_team: { requiredTier: "enterprise" },            // Organization: + team activity summary + org stats
  annual_calendar_auto: { requiredTier: "pro" },

  // ─── Preparation — Document Vault ─────────────────────────────────────
  document_vault: { requiredTier: "pro", limit: 10 },            // Strategist: 10 uploads
  document_vault_unlimited: { requiredTier: "growth" },           // Applicant: unlimited + AI extraction
  document_next_upload_recommendation: { requiredTier: "pro" },   // Strategist+: "Upload your audit → unlocks 12 grants"
  readiness_cross_reference: { requiredTier: "pro" },
  match_report_pdf: { requiredTier: "pro" },

  // ─── Writing ──────────────────────────────────────────────────────────
  loi_generator: { requiredTier: "growth" },                      // Applicant: 3/mo included
  ai_writing: { requiredTier: "growth", limit: 2, perMonth: true }, // Applicant: 2 drafts/mo
  ai_writing_enterprise: { requiredTier: "enterprise", limit: 10, perMonth: true }, // Org: 10 drafts/mo
  compliance_checker: { requiredTier: "growth" },
  draft_history: { requiredTier: "growth" },

  // ─── Post-Award ───────────────────────────────────────────────────────
  compliance_tracker: { requiredTier: "growth" },
  reporting_calendar: { requiredTier: "growth" },
  resubmission_assistant: { requiredTier: "growth" },
  win_loss_analysis: { requiredTier: "enterprise" },

  // ─── Engagement & Retention ───────────────────────────────────────────
  monthly_impact_summary: { requiredTier: "starter" },           // Seeker+: "This month: 12 matches, 3 evaluated, score +7"
  stale_pipeline_nudges: { requiredTier: "starter" },            // Seeker+: "Your USDA app hasn't been updated in 14 days"
  grantie_tier_upsell: { requiredTier: "free" },                 // All tiers: Grantie naturally suggests next tier features

  // ─── Team & Admin ─────────────────────────────────────────────────────
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
};

// ─── Helper Functions ─────────────────────────────────────────────────────

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

export function getGrantieTierContext(tier: string): string {
  return GRANTIE_TIER_CONTEXT[tier] ?? GRANTIE_TIER_CONTEXT.free;
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

// What funder URL visibility does this tier get?
export function canSeeFunderUrl(tier: string): boolean {
  return tier === "enterprise"; // Only Organization tier sees raw funder URLs
}

// What digest content does this tier get?
export function getDigestLevel(tier: string): "teaser" | "full" | "readiness" | "drafts" | "team" {
  if (tier === "enterprise") return "team";
  if (tier === "growth") return "drafts";
  if (tier === "pro") return "readiness";
  if (tier === "starter") return "full";
  return "teaser";
}
