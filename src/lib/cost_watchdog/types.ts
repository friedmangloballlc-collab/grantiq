// grantiq/src/lib/cost_watchdog/types.ts

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
  /** Whether there was any user activity (pipeline writes, etc.) in the
   * window. Used by zero_activity detection to distinguish "API is down"
   * from "no users active". */
  hasUserActivity: boolean;
}

export type AlertType =
  | 'org_spend_spike'
  | 'token_runaway'
  | 'zero_activity'
  | 'absolute_threshold'
  | 'cache_hit_regression';

export type Severity = 'info' | 'warning' | 'critical';

export interface Alert {
  alertType: AlertType;
  orgId: string | null;
  severity: Severity;
  message: string;
  metadata: Record<string, unknown>;
  dedupKey: string;
}
