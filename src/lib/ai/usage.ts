import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Canonical set of AI action types accepted by aiCall.
 *
 * Source of truth — DB CHECK constraints on ai_generations.generation_type and
 * ai_usage.action_type are kept in sync with this list (see migration 00049).
 *
 * Adding a new action type requires:
 *   1. Adding the value here
 *   2. Adding an ACTION_TO_FEATURE mapping below
 *   3. Adding a new migration that widens both CHECK constraints
 */
export const AI_ACTION_TYPES = [
  "match",
  "readiness_score",
  "roadmap",
  "eligibility_status",
  "draft",
  "audit",
  "rewrite",
  "loi",
  "budget",
  "chat",
] as const;

export type AiActionType = (typeof AI_ACTION_TYPES)[number];

const ACTION_TO_FEATURE: Record<AiActionType, string> = {
  match: "matching_runs",
  readiness_score: "readiness_scores",
  roadmap: "matching_runs",
  eligibility_status: "eligibility_scores",
  draft: "ai_drafts",
  audit: "ai_drafts",
  rewrite: "ai_drafts",
  loi: "ai_drafts",
  budget: "ai_drafts",
  chat: "grantie_messages",
};

export class UsageLimitError extends Error {
  constructor(
    public used: number,
    public limit: number,
    public feature: string,
    public tier: string
  ) {
    super(
      `Usage limit reached: ${used}/${limit} ${feature} used on ${tier} tier. Upgrade for more.`
    );
    this.name = "UsageLimitError";
  }
}

interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
}

export async function checkUsageLimit(
  orgId: string,
  actionType: AiActionType,
  tier: string
): Promise<UsageCheckResult> {
  const db = createAdminClient();
  const feature = ACTION_TO_FEATURE[actionType];

  const { data: limitRow, error: limitError } = await db
    .from("tier_limits")
    .select("monthly_limit")
    .eq("tier", tier)
    .eq("feature", feature)
    .single();

  if (limitError || !limitRow) {
    return { allowed: true, used: 0, limit: null, remaining: null };
  }

  const monthlyLimit = limitRow.monthly_limit;
  if (monthlyLimit === null) {
    return { allowed: true, used: 0, limit: null, remaining: null };
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .split("T")[0];

  const { data: usageRows, error: usageError } = await db
    .from("ai_usage")
    .select("id")
    .eq("org_id", orgId)
    .eq("action_type", actionType)
    .gte("billing_period", periodStart)
    .lt("billing_period", periodEnd);

  if (usageError) {
    logger.error("Usage check query failed", { err: String(usageError) });
    return {
      allowed: true,
      used: 0,
      limit: monthlyLimit,
      remaining: monthlyLimit,
    };
  }

  const used = usageRows?.length ?? 0;
  const remaining = Math.max(0, monthlyLimit - used);

  return { allowed: used < monthlyLimit, used, limit: monthlyLimit, remaining };
}

interface RecordUsageParams {
  orgId: string;
  actionType: AiActionType;
  tokensInput: number;
  tokensOutput: number;
  estimatedCostCents: number;
  /**
   * Optional session id for usage-row dedup (Unit 5 / R13).
   *
   * When supplied, the call routes through the record_ai_usage_session RPC
   * (defined in migration 00053) which upserts on (org_id, action_type,
   * session_id) and INCREMENTS tokens/cost on conflict. This makes a
   * multi-call session — e.g., a 6-section drafting run sharing one
   * grant_application_id — count as a single ai_usage row.
   *
   * INVARIANT: callers MUST pass per-call deltas, never cumulative totals.
   * The RPC's DO UPDATE adds EXCLUDED to existing values.
   *
   * When omitted, falls back to the legacy plain INSERT (one row per call).
   */
  sessionId?: string;
}

export async function recordUsage(params: RecordUsageParams): Promise<void> {
  const db = createAdminClient();
  const now = new Date();
  const billingPeriod = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // Session-scoped path: RPC upsert that increments on conflict.
  if (params.sessionId) {
    const { error } = await db.rpc("record_ai_usage_session", {
      p_org_id: params.orgId,
      p_action_type: params.actionType,
      p_session_id: params.sessionId,
      p_tokens_input: params.tokensInput,
      p_tokens_output: params.tokensOutput,
      p_cost_cents: params.estimatedCostCents,
      p_billing_period: billingPeriod,
    });
    if (error) {
      logger.error("Failed to record AI usage (session)", { err: String(error) });
    }
    return;
  }

  // Legacy path: plain INSERT, one row per call.
  const { error } = await db.from("ai_usage").insert({
    org_id: params.orgId,
    action_type: params.actionType,
    tokens_input: params.tokensInput,
    tokens_output: params.tokensOutput,
    estimated_cost_cents: params.estimatedCostCents,
    billing_period: billingPeriod,
  });

  if (error) {
    logger.error("Failed to record AI usage", { err: String(error) });
  }
}
