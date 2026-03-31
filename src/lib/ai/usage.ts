import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const ACTION_TO_FEATURE: Record<string, string> = {
  match: "matching_runs",
  readiness_score: "readiness_scores",
  roadmap: "matching_runs",
  draft: "ai_drafts",
  audit: "ai_drafts",
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
  actionType: string,
  tier: string
): Promise<UsageCheckResult> {
  const db = createAdminClient();
  const feature = ACTION_TO_FEATURE[actionType] || actionType;

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
  actionType: string;
  tokensInput: number;
  tokensOutput: number;
  estimatedCostCents: number;
}

export async function recordUsage(params: RecordUsageParams): Promise<void> {
  const db = createAdminClient();
  const now = new Date();
  const billingPeriod = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

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
