// grantiq/src/lib/cost_watchdog/detect.ts
//
// Unit 3 — pure anomaly detection. Given current + prior SpendSummary
// (and optionally a token-runaway signal + per-org tier map), return
// the list of alerts that should be fired. No I/O, no DB. Testable
// entirely with fixtures.

import type { SpendSummary, Alert } from './types';
import type { WatchdogConfig } from './config';
import { DEFAULT_WATCHDOG_CONFIG, dailyHardCapForTier } from './config';

export interface DetectInput {
  current: SpendSummary;
  prior: SpendSummary;
  /** Per-org subscription tier lookup for tier-aware hard caps */
  orgTiers?: Record<string, string>;
  /** Sessions in the current window with total_tokens above runaway
   * threshold — detected by caller's SQL (we don't reshape it here). */
  runawaySessions?: Array<{ orgId: string; sessionId: string; totalTokens: number }>;
  config?: WatchdogConfig;
}

function hourKey(d: Date): string {
  // e.g., "2026-04-20T14" — stable across timezones because we use ISO+UTC
  return d.toISOString().slice(0, 13);
}

export function detectAnomalies(input: DetectInput): Alert[] {
  const config = input.config ?? DEFAULT_WATCHDOG_CONFIG;
  const alerts: Alert[] = [];
  const hour = hourKey(input.current.windowStart);

  // --- 1. Org spend spike vs prior window ---
  const priorByOrg = new Map(input.prior.byOrg.map((r) => [r.orgId, r.cents]));

  for (const row of input.current.byOrg) {
    if (row.cents < config.spikeNoiseFloorCents) continue;

    const priorCents = priorByOrg.get(row.orgId) ?? 0;

    // New heavy spender (no prior activity): use 1 as denominator to avoid
    // division-by-zero, treat as high multiplier
    const multiplier = priorCents > 0 ? row.cents / priorCents : Infinity;

    if (multiplier >= config.spikeMultiplierCritical) {
      alerts.push({
        alertType: 'org_spend_spike',
        orgId: row.orgId,
        severity: 'critical',
        message: `Org spend spiked ${multiplier === Infinity ? 'from 0' : `${multiplier.toFixed(1)}x`} in the last window: $${(row.cents / 100).toFixed(2)} vs $${(priorCents / 100).toFixed(2)}`,
        metadata: {
          currentCents: row.cents,
          priorCents,
          multiplier: Number.isFinite(multiplier) ? Number(multiplier.toFixed(2)) : null,
          topAction: row.topAction,
          calls: row.calls,
        },
        dedupKey: `org_spend_spike:${row.orgId}:${hour}`,
      });
    } else if (multiplier >= config.spikeMultiplierWarning) {
      alerts.push({
        alertType: 'org_spend_spike',
        orgId: row.orgId,
        severity: 'warning',
        message: `Org spend spiked ${multiplier.toFixed(1)}x in the last window: $${(row.cents / 100).toFixed(2)} vs $${(priorCents / 100).toFixed(2)}`,
        metadata: {
          currentCents: row.cents,
          priorCents,
          multiplier: Number(multiplier.toFixed(2)),
          topAction: row.topAction,
          calls: row.calls,
        },
        dedupKey: `org_spend_spike:${row.orgId}:${hour}`,
      });
    }
  }

  // --- 2. Absolute threshold: per-org daily hard cap breach ---
  // Note: this expects the current SpendSummary to represent a 24h window.
  // When called hourly, caller passes windowHours=24 for the cap check.
  for (const row of input.current.byOrg) {
    const tier = input.orgTiers?.[row.orgId];
    const cap = dailyHardCapForTier(tier, config);
    if (row.cents > cap) {
      alerts.push({
        alertType: 'absolute_threshold',
        orgId: row.orgId,
        severity: 'critical',
        message: `Org exceeded daily spend cap ($${(cap / 100).toFixed(2)}) — $${(row.cents / 100).toFixed(2)} in last 24h`,
        metadata: {
          currentCents: row.cents,
          capCents: cap,
          tier: tier ?? 'unknown',
        },
        // Dedup per calendar day, not per hour — don't re-alert every
        // hour a cap is breached
        dedupKey: `absolute_threshold:${row.orgId}:${input.current.windowStart.toISOString().slice(0, 10)}`,
      });
    }
  }

  // --- 3. Token runaway in a single session ---
  if (input.runawaySessions) {
    for (const s of input.runawaySessions) {
      if (s.totalTokens > config.tokenRunawaySingleSession) {
        alerts.push({
          alertType: 'token_runaway',
          orgId: s.orgId,
          severity: 'critical',
          message: `Single session burned ${s.totalTokens.toLocaleString()} tokens — likely prompt loop`,
          metadata: {
            sessionId: s.sessionId,
            totalTokens: s.totalTokens,
            threshold: config.tokenRunawaySingleSession,
          },
          dedupKey: `token_runaway:${s.sessionId}`,
        });
      }
    }
  }

  // --- 4. Zero activity (catch-all for API provider outages) ---
  // Fires when: current window has 0 spend AND user activity exists AND
  // prior window had non-zero spend. Distinguishes "Anthropic is down"
  // from "nobody is using the app right now".
  if (
    input.current.totalCents === 0 &&
    input.current.hasUserActivity &&
    input.prior.totalCents > 0
  ) {
    alerts.push({
      alertType: 'zero_activity',
      orgId: null,
      severity: 'critical',
      message: `App-wide AI spend is $0 despite active user sessions — API provider may be down (billing, rate limits, or outage)`,
      metadata: {
        priorCents: input.prior.totalCents,
        priorCalls: input.prior.totalCalls,
      },
      dedupKey: `zero_activity:global:${hour}`,
    });
  }

  // --- 5. Cache-hit regression (Anthropic draft action) ---
  const anthropicDraftCacheHit = input.current.byAction['draft'];
  const priorDraftModels = input.prior.byModel;
  const anthropicModel = Object.keys(priorDraftModels).find((m) =>
    m.toLowerCase().includes('claude')
  );
  if (anthropicDraftCacheHit && anthropicModel) {
    const currentModelStats = input.current.byModel[anthropicModel];
    if (
      currentModelStats &&
      currentModelStats.calls >= 10 && // ignore noise on low-volume
      currentModelStats.cacheHitPct < config.cacheHitMinPctDraft
    ) {
      alerts.push({
        alertType: 'cache_hit_regression',
        orgId: null,
        severity: 'warning',
        message: `Draft cache hit rate dropped to ${(currentModelStats.cacheHitPct * 100).toFixed(0)}% (below ${(config.cacheHitMinPctDraft * 100).toFixed(0)}%) — check buildCacheableContext stability`,
        metadata: {
          model: anthropicModel,
          cacheHitPct: currentModelStats.cacheHitPct,
          calls: currentModelStats.calls,
        },
        dedupKey: `cache_hit_regression:draft:${hour}`,
      });
    }
  }

  return alerts;
}
