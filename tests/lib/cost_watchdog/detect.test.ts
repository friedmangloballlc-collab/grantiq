import { describe, it, expect } from 'vitest';
import { detectAnomalies } from '@/lib/cost_watchdog/detect';
import { DEFAULT_WATCHDOG_CONFIG } from '@/lib/cost_watchdog/config';
import type { SpendSummary } from '@/lib/cost_watchdog/types';

function summary(partial: Partial<SpendSummary>): SpendSummary {
  return {
    windowStart: new Date('2026-04-20T14:00:00Z'),
    windowEnd: new Date('2026-04-20T15:00:00Z'),
    totalCents: 0,
    totalCalls: 0,
    byOrg: [],
    byModel: {},
    byAction: {},
    hasUserActivity: false,
    ...partial,
  };
}

describe('detectAnomalies — org spend spike', () => {
  it('fires warning at 3x multiplier', () => {
    const alerts = detectAnomalies({
      current: summary({
        totalCents: 300,
        byOrg: [{ orgId: 'org-a', cents: 300, calls: 5, topAction: 'draft' }],
      }),
      prior: summary({
        totalCents: 100,
        byOrg: [{ orgId: 'org-a', cents: 100, calls: 2, topAction: 'draft' }],
      }),
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe('org_spend_spike');
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].orgId).toBe('org-a');
  });

  it('fires critical at 10x multiplier', () => {
    const alerts = detectAnomalies({
      current: summary({
        byOrg: [{ orgId: 'org-a', cents: 1000, calls: 30, topAction: 'draft' }],
      }),
      prior: summary({
        byOrg: [{ orgId: 'org-a', cents: 100, calls: 3, topAction: 'draft' }],
      }),
    });
    expect(alerts[0].severity).toBe('critical');
  });

  it('does NOT fire below noise floor ($1)', () => {
    // Even a 100x spike from 0.30 -> 30 cents stays below $1 → skipped
    const alerts = detectAnomalies({
      current: summary({
        byOrg: [{ orgId: 'org-a', cents: 30, calls: 1, topAction: 'draft' }],
      }),
      prior: summary({
        byOrg: [{ orgId: 'org-a', cents: 0, calls: 0, topAction: 'draft' }],
      }),
    });
    expect(alerts).toHaveLength(0);
  });

  it('treats new heavy spender (no prior) as critical', () => {
    const alerts = detectAnomalies({
      current: summary({
        byOrg: [{ orgId: 'org-new', cents: 500, calls: 20, topAction: 'draft' }],
      }),
      prior: summary({ byOrg: [] }),
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].metadata.priorCents).toBe(0);
  });

  it('produces deterministic dedup keys per hour', () => {
    const alerts1 = detectAnomalies({
      current: summary({
        windowStart: new Date('2026-04-20T14:00:00Z'),
        byOrg: [{ orgId: 'org-a', cents: 1000, calls: 5, topAction: 'draft' }],
      }),
      prior: summary({
        byOrg: [{ orgId: 'org-a', cents: 100, calls: 1, topAction: 'draft' }],
      }),
    });
    const alerts2 = detectAnomalies({
      current: summary({
        windowStart: new Date('2026-04-20T14:30:00Z'), // same hour, different minute
        byOrg: [{ orgId: 'org-a', cents: 1000, calls: 5, topAction: 'draft' }],
      }),
      prior: summary({
        byOrg: [{ orgId: 'org-a', cents: 100, calls: 1, topAction: 'draft' }],
      }),
    });
    expect(alerts1[0].dedupKey).toBe(alerts2[0].dedupKey);
  });
});

describe('detectAnomalies — absolute threshold', () => {
  it('fires when org exceeds tier-specific cap (growth = $50/day)', () => {
    const alerts = detectAnomalies({
      current: summary({
        byOrg: [{ orgId: 'org-growth', cents: 6000, calls: 100, topAction: 'draft' }],
      }),
      prior: summary({
        byOrg: [{ orgId: 'org-growth', cents: 5900, calls: 99, topAction: 'draft' }],
      }),
      orgTiers: { 'org-growth': 'growth' },
    });
    const capAlerts = alerts.filter((a) => a.alertType === 'absolute_threshold');
    expect(capAlerts).toHaveLength(1);
    expect(capAlerts[0].severity).toBe('critical');
    expect(capAlerts[0].metadata.capCents).toBe(5000);
  });

  it('uses pro cap as default for unknown tier', () => {
    const alerts = detectAnomalies({
      current: summary({
        byOrg: [{ orgId: 'org-unknown', cents: 3000, calls: 50, topAction: 'draft' }],
      }),
      prior: summary({
        byOrg: [{ orgId: 'org-unknown', cents: 2800, calls: 48, topAction: 'draft' }],
      }),
      orgTiers: {},
    });
    const capAlerts = alerts.filter((a) => a.alertType === 'absolute_threshold');
    expect(capAlerts).toHaveLength(1);
    expect(capAlerts[0].metadata.capCents).toBe(2500); // pro
  });

  it('does NOT fire when under cap', () => {
    const alerts = detectAnomalies({
      current: summary({
        byOrg: [{ orgId: 'org-a', cents: 1000, calls: 20, topAction: 'draft' }],
      }),
      prior: summary({
        byOrg: [{ orgId: 'org-a', cents: 900, calls: 18, topAction: 'draft' }],
      }),
      orgTiers: { 'org-a': 'growth' },
    });
    expect(alerts.filter((a) => a.alertType === 'absolute_threshold')).toHaveLength(0);
  });
});

describe('detectAnomalies — token runaway', () => {
  it('fires on session > 500K tokens', () => {
    const alerts = detectAnomalies({
      current: summary({}),
      prior: summary({}),
      runawaySessions: [{ orgId: 'org-a', sessionId: 'sess-1', totalTokens: 800_000 }],
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe('token_runaway');
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].dedupKey).toContain('sess-1');
  });

  it('does NOT fire at threshold exactly', () => {
    const alerts = detectAnomalies({
      current: summary({}),
      prior: summary({}),
      runawaySessions: [
        { orgId: 'org-a', sessionId: 'sess-1', totalTokens: DEFAULT_WATCHDOG_CONFIG.tokenRunawaySingleSession },
      ],
    });
    expect(alerts).toHaveLength(0);
  });
});

describe('detectAnomalies — zero_activity (critical outage signal)', () => {
  it('fires when prior had spend, current is zero, users are active', () => {
    const alerts = detectAnomalies({
      current: summary({ totalCents: 0, hasUserActivity: true }),
      prior: summary({ totalCents: 500, totalCalls: 10 }),
    });
    const z = alerts.filter((a) => a.alertType === 'zero_activity');
    expect(z).toHaveLength(1);
    expect(z[0].severity).toBe('critical');
  });

  it('does NOT fire when current is zero but no users active (night quiet)', () => {
    const alerts = detectAnomalies({
      current: summary({ totalCents: 0, hasUserActivity: false }),
      prior: summary({ totalCents: 500, totalCalls: 10 }),
    });
    expect(alerts.filter((a) => a.alertType === 'zero_activity')).toHaveLength(0);
  });

  it('does NOT fire when prior was also zero', () => {
    const alerts = detectAnomalies({
      current: summary({ totalCents: 0, hasUserActivity: true }),
      prior: summary({ totalCents: 0 }),
    });
    expect(alerts.filter((a) => a.alertType === 'zero_activity')).toHaveLength(0);
  });
});

describe('detectAnomalies — cache hit regression', () => {
  it('fires when Claude draft cache hit drops below 50%', () => {
    const alerts = detectAnomalies({
      current: summary({
        byAction: { draft: { cents: 1000, calls: 30 } },
        byModel: {
          'claude-sonnet-4': { cents: 1000, calls: 30, cacheHitPct: 0.35 },
        },
      }),
      prior: summary({
        byModel: {
          'claude-sonnet-4': { cents: 500, calls: 20, cacheHitPct: 0.75 },
        },
      }),
    });
    const c = alerts.filter((a) => a.alertType === 'cache_hit_regression');
    expect(c).toHaveLength(1);
    expect(c[0].severity).toBe('warning');
  });

  it('does NOT fire on low-volume (<10 calls)', () => {
    const alerts = detectAnomalies({
      current: summary({
        byAction: { draft: { cents: 100, calls: 3 } },
        byModel: {
          'claude-sonnet-4': { cents: 100, calls: 3, cacheHitPct: 0.1 },
        },
      }),
      prior: summary({
        byModel: {
          'claude-sonnet-4': { cents: 500, calls: 20, cacheHitPct: 0.75 },
        },
      }),
    });
    expect(alerts.filter((a) => a.alertType === 'cache_hit_regression')).toHaveLength(0);
  });
});

describe('detectAnomalies — clean windows produce no alerts', () => {
  it('empty + empty = no alerts', () => {
    const alerts = detectAnomalies({
      current: summary({}),
      prior: summary({}),
    });
    expect(alerts).toHaveLength(0);
  });

  it('steady state = no alerts', () => {
    const alerts = detectAnomalies({
      current: summary({
        totalCents: 500,
        byOrg: [{ orgId: 'a', cents: 500, calls: 10, topAction: 'draft' }],
      }),
      prior: summary({
        totalCents: 480,
        byOrg: [{ orgId: 'a', cents: 480, calls: 9, topAction: 'draft' }],
      }),
      orgTiers: { a: 'growth' },
    });
    expect(alerts).toHaveLength(0);
  });
});
