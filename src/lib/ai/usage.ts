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

/**
 * Thrown when a call would push the org over its monthly token ceiling
 * (Unit 6 / R13a) OR exceeds the per-call hard cap of 200K tokens.
 *
 * The row-based UsageLimitError counts CALLS per feature per month; this
 * counts TOKENS per org per month. They're orthogonal — a single oversized
 * call can pass the row gate and bust the token gate, or vice versa.
 */
export class TokenCeilingError extends Error {
  constructor(
    public spent: number,
    public estimate: number,
    public ceiling: number,
    public tier: string,
    public reason: "monthly_ceiling" | "per_call_cap"
  ) {
    super(
      reason === "per_call_cap"
        ? `Per-call token cap exceeded: estimate ${estimate} > ${ceiling}. Reduce input size or break into smaller calls.`
        : `Monthly token ceiling reached: ${spent} spent + ${estimate} estimated > ${ceiling} ceiling on ${tier} tier. Upgrade for more.`
    );
    this.name = "TokenCeilingError";
  }
}

/** Per-call hard cap regardless of monthly budget (Unit 6 / R13a). */
export const PER_CALL_TOKEN_CAP = 200000;

interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
}

/**
 * Pre-flight token-budget check (Unit 6 / R13a).
 *
 * Two failure modes:
 *   1. Per-call hard cap (200K) — rejected before any DB query
 *   2. Monthly ceiling — sums tokens_input + tokens_output across the current
 *      billing period; rejects when spent + estimate > ceiling
 *
 * Conservative estimation note: the caller passes
 * estimatedTokens = (systemPrompt + cacheableContext + userInput) / 4 + maxTokens.
 * The /4 ratio is calibrated for English; non-English content (CJK ~1-1.5
 * chars/token, Spanish/French ~3.5) under-estimates. Caller can pass a
 * pre-counted value via Anthropic's /v1/messages/count_tokens for non-English
 * accuracy.
 *
 * Throws TokenCeilingError on either failure mode. Returns silently on pass.
 */
export async function checkTokenCeiling(
  orgId: string,
  tier: string,
  estimatedTokens: number
): Promise<void> {
  // 1. Per-call hard cap — no DB query needed
  if (estimatedTokens > PER_CALL_TOKEN_CAP) {
    throw new TokenCeilingError(
      0,
      estimatedTokens,
      PER_CALL_TOKEN_CAP,
      tier,
      "per_call_cap"
    );
  }

  const db = createAdminClient();

  // 2. Look up the tier's monthly_token_ceiling. Any tier_limits row for this
  //    tier suffices since the ceiling is per-tier (not per-feature).
  const { data: limitRow, error: limitError } = await db
    .from("tier_limits")
    .select("monthly_token_ceiling")
    .eq("tier", tier)
    .not("monthly_token_ceiling", "is", null)
    .limit(1)
    .maybeSingle();

  // No row OR null ceiling = unlimited (matches monthly_limit convention)
  if (limitError || !limitRow || limitRow.monthly_token_ceiling === null) {
    return;
  }

  const ceiling = limitRow.monthly_token_ceiling as number;

  // 3. Sum current-period token spend
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .split("T")[0];

  const { data: usageRows, error: usageError } = await db
    .from("ai_usage")
    .select("tokens_input, tokens_output")
    .eq("org_id", orgId)
    .gte("billing_period", periodStart)
    .lt("billing_period", periodEnd);

  if (usageError) {
    logger.error("Token ceiling query failed", { err: String(usageError) });
    return; // fail-open like checkUsageLimit's error path
  }

  const spent = (usageRows ?? []).reduce(
    (sum, row) => sum + (row.tokens_input ?? 0) + (row.tokens_output ?? 0),
    0
  );

  if (spent + estimatedTokens > ceiling) {
    throw new TokenCeilingError(spent, estimatedTokens, ceiling, tier, "monthly_ceiling");
  }
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
