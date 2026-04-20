// grantiq/src/lib/cost_watchdog/slack.ts
//
// Unit 4 — alerting layer. Persists to cost_watchdog_alerts (with
// dedup via unique index on dedup_key) then posts to Slack. If
// COST_WATCHDOG_SLACK_WEBHOOK_URL is not configured, falls back to
// stdout — ships functional without Slack so the plan's observability
// arrives on day 1.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Alert, Severity } from './types';

const WEBHOOK_URL_ENV = 'COST_WATCHDOG_SLACK_WEBHOOK_URL';

export interface SendAlertResult {
  persisted: boolean;
  dedupedExisting: boolean;
  slackSent: boolean;
  slackError?: string;
}

/**
 * Persist an alert, then (best-effort) post to Slack.
 *
 * Persistence uses the unique partial index on (dedup_key) WHERE
 * resolved_at IS NULL. An insert collision with an existing unresolved
 * row means the same anomaly is already firing — return dedupedExisting=true
 * without re-alerting.
 *
 * Slack post failures do NOT raise — we log and return slackError. The
 * alert row still exists so the admin dashboard surfaces it.
 */
export async function sendAlert(
  supabase: SupabaseClient,
  alert: Alert
): Promise<SendAlertResult> {
  // Step 1: try to insert
  const { error: insertError } = await supabase.from('cost_watchdog_alerts').insert({
    alert_type: alert.alertType,
    org_id: alert.orgId,
    severity: alert.severity,
    message: alert.message,
    metadata: alert.metadata,
    dedup_key: alert.dedupKey,
  });

  if (insertError) {
    // Unique constraint violation on dedup_key = already alerting this
    // anomaly. Not an error — just a dedup.
    if (isDedupError(insertError)) {
      return { persisted: false, dedupedExisting: true, slackSent: false };
    }
    // Any other insert error: bubble up, this is a real problem
    throw new Error(`cost_watchdog_alerts insert failed: ${insertError.message}`);
  }

  // Step 2: attempt Slack post (best-effort, info-level never posts)
  if (alert.severity === 'info') {
    // Log only, no Slack
    return { persisted: true, dedupedExisting: false, slackSent: false };
  }

  const webhookUrl = process.env[WEBHOOK_URL_ENV];
  if (!webhookUrl) {
    // Graceful degradation: no webhook configured yet, log to stdout
    // so the alert is still visible in worker logs
    console.warn(
      JSON.stringify({
        event: 'cost_watchdog_alert_no_webhook',
        alert_type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        metadata: alert.metadata,
      })
    );
    return { persisted: true, dedupedExisting: false, slackSent: false };
  }

  const payload = buildSlackPayload(alert);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Slack webhook returned ${res.status}: ${body.slice(0, 200)}`);
      return {
        persisted: true,
        dedupedExisting: false,
        slackSent: false,
        slackError: `http ${res.status}`,
      };
    }

    // Mark slack_sent_at on the row
    await supabase
      .from('cost_watchdog_alerts')
      .update({ slack_sent_at: new Date().toISOString() })
      .eq('dedup_key', alert.dedupKey)
      .is('resolved_at', null);

    return { persisted: true, dedupedExisting: false, slackSent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Slack webhook POST failed: ${msg}`);
    return {
      persisted: true,
      dedupedExisting: false,
      slackSent: false,
      slackError: msg,
    };
  }
}

function isDedupError(err: { code?: string; message?: string }): boolean {
  // Postgres unique constraint = code 23505
  if (err.code === '23505') return true;
  // Supabase sometimes wraps the error; fall back to message scanning
  return Boolean(err.message?.includes('duplicate key') || err.message?.includes('unique'));
}

function buildSlackPayload(alert: Alert): Record<string, unknown> {
  const emoji: Record<Severity, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  };
  const header = `${emoji[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.alertType}`;
  const mentionPrefix = alert.severity === 'critical' ? '<!here> ' : '';

  return {
    text: `${mentionPrefix}${header}\n${alert.message}`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${header}*` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: alert.message },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `org: \`${alert.orgId ?? 'global'}\` · metadata: \`${JSON.stringify(alert.metadata).slice(0, 200)}\``,
          },
        ],
      },
    ],
  };
}

/**
 * Auto-resolve alerts older than 24h whose anomaly has cleared.
 * Called at the start of every watchdog run.
 */
export async function autoResolveStaleAlerts(supabase: SupabaseClient): Promise<number> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from('cost_watchdog_alerts')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_note: 'auto-resolved after 24h',
    })
    .is('resolved_at', null)
    .lt('created_at', twentyFourHoursAgo)
    .select('id');

  if (error) {
    console.error(`autoResolveStaleAlerts failed: ${error.message}`);
    return 0;
  }
  return data?.length ?? 0;
}
