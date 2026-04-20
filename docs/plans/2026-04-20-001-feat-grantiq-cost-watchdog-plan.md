---
title: "feat: Cost Watchdog — hourly AI spend monitoring + anomaly alerts"
type: feat
status: active
date: 2026-04-20
origin: docs/GrantIQ_Custom_Agents_Roadmap (Google Doc 1n7BOX83rt9_dDHZqqfUsoqDWhZA4EnvccAQEMzjZX-c)
related: docs/plans/2026-04-19-001-feat-grantiq-aicall-anthropic-extension-plan.md (Unit 1 provides the data this plan consumes)
---

# feat: Cost Watchdog

## Overview

Ship agent #9 from the custom agents roadmap as production code. An hourly worker cron reads `ai_generations` + `ai_usage`, detects per-org spend anomalies (sudden ≥3× growth vs prior window, absolute threshold breaches, token runaway patterns), and alerts to Slack with a structured report. A thin admin dashboard page surfaces the same data visually for review.

Cost is the single largest existential risk for AI-heavy SaaS. Tonight's session discovered the Anthropic org was disabled only when a customer tried to use the app. A Cost Watchdog running since launch would have caught either (a) the sudden zero-spend anomaly or (b) the cost spike that led to the disable, whichever came first, 6+ hours before the customer did.

This is the observability prerequisite for every other production agent in the roadmap — you can't ship more AI features responsibly without per-agent visibility into spend.

## Problem Frame

Right now GrantIQ has three blind spots:

1. **Per-org spend is invisible.** Nobody can answer "which org spent the most this week" without writing ad-hoc SQL. At 200 orgs this becomes a weekly task that doesn't happen.
2. **Anomalies are only visible in retrospect.** When Anthropic disabled the org tonight, every subsequent API call 400'd — but the first anomaly was the spike in spend that caused the disable, which happened silently.
3. **No cost-per-feature attribution.** We don't know if drafts are 10× more expensive than matches, or if cache hit rate has drifted down by 40%. Pricing decisions are blind.

This plan closes all three via one hourly cron + one dashboard + one Slack integration.

## Requirements Trace

From the roadmap doc (Google Doc):
- **R1** (hourly cron reading ai_generations + ai_usage): Unit 5
- **R2** (per-org spend anomaly detection ≥3× prior window): Unit 3
- **R3** (absolute threshold alerts — configurable per-org daily cap): Unit 3
- **R4** (token runaway detection — single session > N tokens): Unit 3
- **R5** (Slack webhook alerts with structured format): Unit 4
- **R6** (admin dashboard showing live spend): Unit 6
- **R7** (alert dedup — don't re-alert on the same anomaly): Unit 1
- **R8** (no false alarms when Anthropic is down — distinguish "zero spend" from "zero recording"): Unit 3

## Scope Boundaries

**In scope:**
- Hourly cron against production Supabase
- Slack webhook integration (single channel)
- Admin dashboard page at `/admin/cost-watchdog` (admin-gated via `isAdminEmail`)
- Anomaly detection for spend spikes, runaway sessions, zero-spend-when-activity-expected

**Out of scope (defer to Batch 2+):**
- Email alerts (Slack only for v1)
- Per-agent cost attribution (requires Unit 9a's agent-shipping to land first)
- Predictive cost forecasting
- Usage-based pricing enforcement (watchdog is detection; enforcement is separate)
- Per-user breakdown (org-level only — user-level has privacy implications)

**Not changing:**
- `aiCall` itself (already records to `ai_generations` + `ai_usage` post-f4e0c40)
- Existing `checkTokenCeiling` enforcement (watchdog is passive monitoring, not blocking)

## Implementation Units

### Unit 1: Schema — alert dedup table

Add migration `00059_cost_watchdog_alerts.sql`:

```sql
CREATE TABLE IF NOT EXISTS cost_watchdog_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'org_spend_spike',
    'token_runaway',
    'zero_activity',
    'absolute_threshold',
    'cache_hit_regression'
  )),
  org_id UUID,  -- null for global alerts
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  dedup_key TEXT NOT NULL,  -- same event = same dedup_key = no re-alert
  slack_sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_cost_watchdog_alerts_dedup ON cost_watchdog_alerts(dedup_key)
  WHERE resolved_at IS NULL;
CREATE INDEX idx_cost_watchdog_alerts_org_recent ON cost_watchdog_alerts(org_id, created_at DESC);
```

`dedup_key` pattern: `{alert_type}:{org_id}:{window_start_hour}`. Same anomaly in the same window = one alert, not 24.

Files:
- `supabase/migrations/00059_cost_watchdog_alerts.sql` (new)

Tests:
- Insert row with dedup_key → second insert with same key during window should be skipped by watchdog logic (unit 3)

### Unit 2: Aggregation query module

Pure read-side module. Given a time window, returns structured spend data.

New file `src/lib/cost_watchdog/aggregate.ts`. Exports:

```typescript
export interface SpendSummary {
  windowStart: Date;
  windowEnd: Date;
  totalCents: number;
  totalCalls: number;
  byOrg: Array<{
    orgId: string;
    cents: number;
    calls: number;
    topAction: string;
  }>;
  byModel: Record<string, { cents: number; calls: number; cacheHitPct: number }>;
  byAction: Record<string, { cents: number; calls: number }>;
}

export async function aggregateSpend(
  windowHours: number
): Promise<SpendSummary>;
```

Uses the admin Supabase client. One query with CTEs to produce all three rollups (org / model / action) in a single round-trip.

Files:
- `src/lib/cost_watchdog/aggregate.ts` (new)

Tests:
- `tests/lib/cost_watchdog/aggregate.test.ts` — seed ai_generations with fixture rows, assert rollup correctness
- Assert cache_hit_pct math — 70% cached + 30% non-cached input tokens should show 70%
- Assert empty window returns zeros, not null

### Unit 3: Anomaly detection

The brain of the watchdog. Given current + prior SpendSummary, decide which alerts to fire.

New file `src/lib/cost_watchdog/detect.ts`. Exports:

```typescript
export interface Alert {
  alertType: 'org_spend_spike' | 'token_runaway' | 'zero_activity' |
             'absolute_threshold' | 'cache_hit_regression';
  orgId: string | null;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metadata: Record<string, unknown>;
  dedupKey: string;
}

export function detectAnomalies(
  current: SpendSummary,
  prior: SpendSummary,
  config: WatchdogConfig
): Alert[];
```

Rules (all configurable via WatchdogConfig):

- **org_spend_spike**: org's cents in current window ≥ 3× prior window, AND current > $1. Severity: warning at 3×, critical at 10×.
- **absolute_threshold**: org's cents in current window > `dailyHardCap` (default $50/day). Severity: critical.
- **token_runaway**: any single session_id in `ai_usage` has total_tokens > 500K. Severity: critical.
- **zero_activity**: whole-app cents == 0 AND last non-zero cents was > 2 hours ago AND there are pipeline inserts in the same window (= users ARE using the app but no AI is being called = API provider down). Severity: critical.
- **cache_hit_regression**: Anthropic `draft` actionType cache_hit_pct drops below 50% (was typically 70%+). Severity: warning.

Important: **zero_activity** is the rule that would have caught tonight's Anthropic-disabled situation 6 hours earlier.

Files:
- `src/lib/cost_watchdog/detect.ts` (new)
- `src/lib/cost_watchdog/config.ts` (new — default thresholds, overridable via env)

Tests:
- `tests/lib/cost_watchdog/detect.test.ts` — fixture-driven:
  - 3× spike triggers warning
  - 10× spike triggers critical
  - Spike below $1 absolute doesn't trigger (noise floor)
  - zero_activity only fires if user activity exists in the same window
  - Same anomaly in same hour produces same dedupKey

### Unit 4: Slack webhook + alert formatting

New file `src/lib/cost_watchdog/slack.ts`. Exports:

```typescript
export async function sendAlert(alert: Alert): Promise<void>;
```

Format (Slack Block Kit):
```
🚨 [CRITICAL] org_spend_spike
Org: Acme Nonprofit (f3e4...)
Current window: $47.20 (last hour)
Prior window:   $4.80
Multiplier:     9.8x

Top actions in spike:
  draft: $38.40 (12 calls)
  audit: $8.80 (34 calls)

Investigate: https://grantiq.com/admin/cost-watchdog?org=f3e4...
```

Behavior:
- Only send if `dedup_key` has no unresolved row in `cost_watchdog_alerts`. Insert row first, then POST.
- If Slack POST fails, still persist the alert row with `slack_sent_at = null` so the admin dashboard shows it.
- Respect severity: `info` → log only, `warning` → #grantiq-ops, `critical` → #grantiq-ops + @here mention.

Files:
- `src/lib/cost_watchdog/slack.ts` (new)
- `package.json` — confirm `@slack/webhook` or just use raw fetch (prefer the latter)

Tests:
- `tests/lib/cost_watchdog/slack.test.ts` — mock fetch, assert payload shape, assert dedup blocks second send

### Unit 5: Worker cron handler

New file `worker/src/handlers/cost_watchdog.ts`. Exports `runCostWatchdog()`.

Flow:
1. `const current = await aggregateSpend(1)` — last 1 hour
2. `const prior = await aggregateSpend(1, { offsetHours: 1 })` — prior hour (need to extend aggregate signature)
3. `const alerts = detectAnomalies(current, prior, config)`
4. For each alert, `await sendAlert(alert)` (handles dedup internally)
5. Log summary: `logger.info('cost_watchdog_run_complete', { alertsFired, totalSpendCents, orgsSeen })`

Schedule: hourly, at `:05` past the hour (gives aiCall writes a few minutes to flush first).

Files:
- `worker/src/handlers/cost_watchdog.ts` (new)
- `worker/src/cron.ts` — add the schedule entry
- `src/lib/cost_watchdog/aggregate.ts` — extend to accept `offsetHours` param

Tests:
- `worker/__tests__/cost_watchdog.test.ts` — end-to-end with mocked fetch (Slack) and fixture DB

### Unit 6: Admin dashboard page

New page at `/admin/cost-watchdog` — admin-gated via `isAdminEmail(ctx.email)`.

Shows:
- Last 24h spend total (large number, top-center)
- Spend by hour (sparkline/bar chart, last 48 hours)
- Top 10 orgs by cost this week (table with org name, cents, call count)
- Recent alerts (table, last 50 from `cost_watchdog_alerts`, with resolve button)
- Cache hit rate by action type (gauges)

Data sources — three server-side queries on page load (admin client):
1. Hourly spend for last 48h
2. Top-N orgs from `ai_generations` last 7d
3. Recent alerts from `cost_watchdog_alerts`

Files:
- `src/app/(app)/admin/cost-watchdog/page.tsx` (new — server component)
- `src/components/admin/spend-chart.tsx` (new — client component for chart)
- `src/app/api/admin/cost-watchdog/resolve-alert/route.ts` (new — POST to mark alert resolved)

Tests:
- Non-admin GET → 403
- Admin GET → 200 with expected data shape
- Resolve POST → updates row in cost_watchdog_alerts

## Decisions (locked, 2026-04-20)

1. **Slack webhook env var: `COST_WATCHDOG_SLACK_WEBHOOK_URL`.** Verified no existing Slack integration in the codebase — this is a fresh env var, no conflict. User provisions a new Slack incoming webhook pointing at #grantiq-ops (or equivalent) before Unit 4 lands.

2. **Default `dailyHardCap`: $25/org/day** (not $50). Rationale: conservative starting point. At Growth tier ($199/mo) this alerts on ~12.5% of monthly value in one day — loud enough to matter. Easier to loosen than tighten later — a too-low threshold produces noise we can tune away; a too-high threshold produces silence around real incidents. Config is per-tier-overridable via `WatchdogConfig.dailyHardCapByTier`:
   ```
   free:       $5
   starter:    $15
   pro:        $25   (default)
   growth:     $50
   enterprise: $150
   ```

3. **Alert auto-resolution: 24h after `created_at`.** Worker cron additionally runs an auto-resolve sweep at the start of each hourly run: `UPDATE cost_watchdog_alerts SET resolved_at = now() WHERE resolved_at IS NULL AND created_at < now() - interval '24 hours'`. Dashboard still has a manual "Resolve now" button for faster closure. Dedup key continues to suppress re-alerts even after auto-resolve — a re-alert for the same anomaly only fires on the NEXT hour after auto-resolve, not immediately.

4. **Railway worker internet access**: assumed working (the worker already makes external calls — e.g., ProPublica API in propublica-990.ts). If the Slack POST fails with a network error, persist the alert row with `slack_sent_at = null` per Unit 4's spec so nothing is lost.

## Risk

- **False positives on weekends / low-traffic periods**: baseline drift could make Monday morning look like a "spike" relative to Sunday night. Mitigation: compute prior-window as same-hour-last-week if current hour has historically low volume.
- **Alert fatigue**: if we fire 50 alerts on day 1, Slack channel becomes ignorable. Mitigation: dedup (Unit 1) + severity routing (Unit 4 — info doesn't post to Slack at all).
- **Watchdog goes down silently**: the monitor of the monitor problem. Mitigation: a simple "watchdog heartbeat" check — if no cost_watchdog_alerts.created_at row in the last 6 hours, the watchdog itself is broken. This becomes a Unit 7 follow-up (optional).

## Sequencing

Strictly sequential:
- Unit 1 (schema) → Unit 2 (aggregate) → Unit 3 (detect) → Unit 4 (slack) → Unit 5 (cron) → Unit 6 (dashboard)

Unit 6 can slip — the core watchdog runs without it. Ship Units 1-5 first, Unit 6 within the following week.

Estimated effort: 1 day for Units 1-5 (MVP cron running). +0.5 day for Unit 6 (dashboard).

## Validation

Post-deploy checklist:
1. Apply migration 00059; confirm cost_watchdog_alerts table exists
2. Run worker handler manually once with `npm run worker:cost-watchdog-once` — should produce summary log, no alerts (baseline hour)
3. Manually insert a spend spike into ai_generations (fixture), re-run handler → must fire `org_spend_spike` alert in Slack
4. Re-run handler with same spike still active → must NOT re-fire (dedup works)
5. Resolve the alert via dashboard → next run with the spike still present must re-fire (resolve reopens dedup)
6. Let it run for 24h in prod → confirm ≥ 24 summary log entries, zero "zero_activity" false positives under normal operation
7. Simulate Anthropic outage: temporarily pause the Anthropic client in a staging deploy, generate pipeline activity, confirm `zero_activity` alert fires within 2 hours

Success criteria: end of week 1 post-deploy, Cost Watchdog has fired ≤ 3 alerts total, all of them either (a) real and acted on, or (b) tuned-away with a threshold adjustment in `config.ts`. If >10 alerts/week and all are noise, the thresholds need work — don't ship more agents until the signal-to-noise ratio is clean.
