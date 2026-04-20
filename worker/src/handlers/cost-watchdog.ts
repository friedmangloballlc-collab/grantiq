// worker/src/handlers/cost-watchdog.ts
//
// Hourly Cost Watchdog cron. Aggregates spend for the last hour +
// the prior hour, detects anomalies, fires alerts (Slack + DB).
// Auto-resolves stale alerts (>24h) at the start of each run.
//
// Schedule: hourly at :05 past the hour (gives aiCall writes a few
// minutes to flush to ai_generations first).

import type { SupabaseClient } from '@supabase/supabase-js';
import { aggregateSpend } from '../../../src/lib/cost_watchdog/aggregate';
import { detectAnomalies } from '../../../src/lib/cost_watchdog/detect';
import { sendAlert, autoResolveStaleAlerts } from '../../../src/lib/cost_watchdog/slack';

export async function handleCostWatchdog(supabase: SupabaseClient): Promise<void> {
  const startedAt = Date.now();

  try {
    // 0. Auto-resolve alerts older than 24h
    const resolvedCount = await autoResolveStaleAlerts(supabase);

    // 1. Aggregate current + prior windows
    const [currentHour, priorHour, current24h] = await Promise.all([
      aggregateSpend(supabase, { windowHours: 1, offsetHours: 0 }),
      aggregateSpend(supabase, { windowHours: 1, offsetHours: 1 }),
      aggregateSpend(supabase, { windowHours: 24, offsetHours: 0 }),
    ]);

    // 2. Load per-org subscription tiers for the orgs with spend in the
    // 24h window (we only need tiers for orgs that could trigger
    // absolute_threshold)
    const orgIds = current24h.byOrg.map((r) => r.orgId).filter((id) => id !== 'null-org');
    const orgTiers: Record<string, string> = {};
    if (orgIds.length > 0) {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('org_id, tier')
        .in('org_id', orgIds);
      for (const s of subs ?? []) {
        orgTiers[s.org_id as string] = s.tier as string;
      }
    }

    // 3. Detect: run both the hourly-spike check and the 24h-cap check
    const hourlySpikeAlerts = detectAnomalies({
      current: currentHour,
      prior: priorHour,
      // Don't run the cap check here — the hourly summary isn't a
      // 24h window. We'll run cap separately below.
      orgTiers: {},
      config: overrideCapCheckOff(),
    });

    const capAlerts = detectAnomalies({
      current: current24h,
      // Prior 24h window as comparison is overkill; just need caps
      prior: current24h,
      orgTiers,
      config: overrideSpikeCheckOff(),
    });

    const allAlerts = [...hourlySpikeAlerts, ...capAlerts];

    // 4. Fire each alert (persist + best-effort Slack)
    let fired = 0;
    let deduped = 0;
    for (const alert of allAlerts) {
      const result = await sendAlert(supabase, alert);
      if (result.dedupedExisting) {
        deduped++;
      } else if (result.persisted) {
        fired++;
      }
    }

    // 5. Structured log
    console.log(
      JSON.stringify({
        event: 'cost_watchdog_run_complete',
        duration_ms: Date.now() - startedAt,
        resolved_stale: resolvedCount,
        alerts_fired: fired,
        alerts_deduped: deduped,
        hourly_spend_cents: currentHour.totalCents,
        hourly_calls: currentHour.totalCalls,
        daily_spend_cents: current24h.totalCents,
        daily_calls: current24h.totalCalls,
      })
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'cost_watchdog_failed',
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - startedAt,
      })
    );
    throw err;
  }
}

// Helpers: the detect module takes a single config. We call it twice
// (once for hourly spikes, once for 24h caps) and suppress the non-
// applicable check via high thresholds.
import { DEFAULT_WATCHDOG_CONFIG } from '../../../src/lib/cost_watchdog/config';

function overrideCapCheckOff() {
  return {
    ...DEFAULT_WATCHDOG_CONFIG,
    dailyHardCapByTier: Object.fromEntries(
      Object.entries(DEFAULT_WATCHDOG_CONFIG.dailyHardCapByTier).map(([k]) => [k, Number.MAX_SAFE_INTEGER])
    ),
  };
}

function overrideSpikeCheckOff() {
  return {
    ...DEFAULT_WATCHDOG_CONFIG,
    spikeMultiplierWarning: Number.MAX_SAFE_INTEGER,
    spikeMultiplierCritical: Number.MAX_SAFE_INTEGER,
  };
}
