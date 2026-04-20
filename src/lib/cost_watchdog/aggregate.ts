// grantiq/src/lib/cost_watchdog/aggregate.ts
//
// Unit 2 — spend aggregation from ai_generations + ai_usage.
// Given a time window, returns structured rollups for detect.ts.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SpendSummary } from './types';

export interface AggregateOptions {
  /** Hours into the past the window covers. e.g., 1 = last hour */
  windowHours: number;
  /** Hours offset back. 0 = ending now, 1 = ending 1h ago, etc.
   * Use windowHours=1 offsetHours=1 to get the "prior hour" window. */
  offsetHours?: number;
}

const TOP_ACTION_PLACEHOLDER = 'unknown';

/**
 * Pulls ai_generations rows for the window and rolls them up.
 * Also checks whether any user activity happened in the window (grant_pipeline
 * writes) so detect.ts can distinguish "API down" from "no users active".
 */
export async function aggregateSpend(
  supabase: SupabaseClient,
  opts: AggregateOptions
): Promise<SpendSummary> {
  const offset = opts.offsetHours ?? 0;
  const windowEnd = new Date(Date.now() - offset * 3600 * 1000);
  const windowStart = new Date(windowEnd.getTime() - opts.windowHours * 3600 * 1000);

  // Single query: pull all ai_generations in window.
  // Column names match the actual schema: tokens_input / tokens_output /
  // estimated_cost_cents / cache_read_tokens (NOT input_tokens / output_tokens /
  // cost_cents / cache_read_input_tokens — those are a naming convention from
  // the aiCall plan doc that didn't match the actual migration).
  const { data: rows, error } = await supabase
    .from('ai_generations')
    .select('org_id, generation_type, model_used, tokens_input, tokens_output, cache_read_tokens, estimated_cost_cents')
    .gte('created_at', windowStart.toISOString())
    .lt('created_at', windowEnd.toISOString());

  if (error) throw new Error(`aggregateSpend ai_generations select failed: ${error.message}`);

  const safe = rows ?? [];

  // Per-org rollup
  const orgAgg = new Map<
    string,
    { cents: number; calls: number; actionCounts: Map<string, number> }
  >();
  // Per-model rollup
  const modelAgg = new Map<
    string,
    { cents: number; calls: number; inputTokens: number; cachedTokens: number }
  >();
  // Per-action rollup
  const actionAgg = new Map<string, { cents: number; calls: number }>();

  let totalCents = 0;
  let totalCalls = 0;

  for (const r of safe) {
    const orgId = (r.org_id as string) ?? 'null-org';
    const action = (r.generation_type as string) ?? TOP_ACTION_PLACEHOLDER;
    const model = (r.model_used as string) ?? 'unknown';
    const cents = (r.estimated_cost_cents as number | null) ?? 0;
    const inputTokens = (r.tokens_input as number | null) ?? 0;
    const cachedTokens = (r.cache_read_tokens as number | null) ?? 0;

    totalCents += cents;
    totalCalls += 1;

    // Org
    let orgRec = orgAgg.get(orgId);
    if (!orgRec) {
      orgRec = { cents: 0, calls: 0, actionCounts: new Map() };
      orgAgg.set(orgId, orgRec);
    }
    orgRec.cents += cents;
    orgRec.calls += 1;
    orgRec.actionCounts.set(action, (orgRec.actionCounts.get(action) ?? 0) + 1);

    // Model
    let modelRec = modelAgg.get(model);
    if (!modelRec) {
      modelRec = { cents: 0, calls: 0, inputTokens: 0, cachedTokens: 0 };
      modelAgg.set(model, modelRec);
    }
    modelRec.cents += cents;
    modelRec.calls += 1;
    modelRec.inputTokens += inputTokens;
    modelRec.cachedTokens += cachedTokens;

    // Action
    let actionRec = actionAgg.get(action);
    if (!actionRec) {
      actionRec = { cents: 0, calls: 0 };
      actionAgg.set(action, actionRec);
    }
    actionRec.cents += cents;
    actionRec.calls += 1;
  }

  // User-activity probe: any grant_pipeline rows created in the window?
  // This is deliberately a separate query (cheap HEAD count) because we
  // want the signal even when ai_generations is empty.
  let hasUserActivity = false;
  const { count } = await supabase
    .from('grant_pipeline')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', windowStart.toISOString())
    .lt('created_at', windowEnd.toISOString());
  hasUserActivity = (count ?? 0) > 0;

  // Shape the final summary
  const byOrg = Array.from(orgAgg.entries()).map(([orgId, r]) => ({
    orgId,
    cents: r.cents,
    calls: r.calls,
    topAction: topOf(r.actionCounts),
  }));
  byOrg.sort((a, b) => b.cents - a.cents);

  const byModel: SpendSummary['byModel'] = {};
  for (const [model, r] of modelAgg) {
    byModel[model] = {
      cents: r.cents,
      calls: r.calls,
      cacheHitPct: r.inputTokens > 0 ? r.cachedTokens / r.inputTokens : 0,
    };
  }

  const byAction: SpendSummary['byAction'] = {};
  for (const [action, r] of actionAgg) {
    byAction[action] = { cents: r.cents, calls: r.calls };
  }

  return {
    windowStart,
    windowEnd,
    totalCents,
    totalCalls,
    byOrg,
    byModel,
    byAction,
    hasUserActivity,
  };
}

function topOf(counts: Map<string, number>): string {
  let best = TOP_ACTION_PLACEHOLDER;
  let bestCount = -1;
  for (const [k, v] of counts) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}
