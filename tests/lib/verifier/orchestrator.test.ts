import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the three check modules before importing the orchestrator
vi.mock('@/lib/verifier/url-check', () => ({
  checkUrl: vi.fn(),
}));
vi.mock('@/lib/verifier/funder-check', () => ({
  checkFunderByEin: vi.fn(),
}));

import { checkUrl } from '@/lib/verifier/url-check';
import { checkFunderByEin } from '@/lib/verifier/funder-check';
import { verifyOneGrant } from '@/lib/verifier/orchestrator';
import type { VerifierGrantRow } from '@/lib/verifier/types';

const mockCheckUrl = vi.mocked(checkUrl);
const mockCheckFunder = vi.mocked(checkFunderByEin);

function makeSupabase() {
  const logInsert = vi.fn().mockResolvedValue({ error: null });
  const sourcesUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const sourcesUpdate = vi.fn(() => ({ eq: sourcesUpdateEq }));
  const from = vi.fn((table: string) => {
    if (table === 'grant_verification_log') return { insert: logInsert };
    if (table === 'grant_sources') return { update: sourcesUpdate };
    return {};
  });
  return {
    client: { from },
    logInsert,
    sourcesUpdate,
    sourcesUpdateEq,
  };
}

function makeGrant(partial: Partial<VerifierGrantRow> = {}): VerifierGrantRow {
  return {
    id: 'g1',
    url: 'https://example.com/grant',
    deadline: '2027-01-01T00:00:00Z',
    recurrence: 'one_time',
    ein: '123456789',
    manual_review_flag: false,
    ...partial,
  };
}

describe('verifyOneGrant', () => {
  beforeEach(() => {
    mockCheckUrl.mockReset();
    mockCheckFunder.mockReset();
  });

  it('clean run: all three pass → no_change', async () => {
    mockCheckUrl.mockResolvedValue({
      status: 'ok',
      finalUrl: 'https://example.com/grant',
      actionSuggested: 'no_change',
    });
    mockCheckFunder.mockResolvedValue({ status: 'active', actionSuggested: 'no_change' });

    const sb = makeSupabase();
    const result = await verifyOneGrant(sb.client as never, makeGrant(), 'run-1');

    expect(result.actionTaken).toBe('no_change');
    expect(result.urlStatus).toBe('ok');
    expect(result.funderStatus).toBe('active');

    // Audit row written
    expect(sb.logInsert).toHaveBeenCalledOnce();
    // grant_sources updated (last_verified refresh), but NOT archived/flagged
    const updatePayload = sb.sourcesUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.last_verified).toBeDefined();
    expect(updatePayload.is_active).toBeUndefined();
    expect(updatePayload.manual_review_flag).toBeUndefined();
  });

  it('archives a past one-time deadline', async () => {
    mockCheckUrl.mockResolvedValue({ status: 'ok', finalUrl: null, actionSuggested: 'no_change' });
    mockCheckFunder.mockResolvedValue({ status: 'active', actionSuggested: 'no_change' });

    const sb = makeSupabase();
    const result = await verifyOneGrant(
      sb.client as never,
      makeGrant({ deadline: '2024-01-01T00:00:00Z', recurrence: 'one_time' }),
      'run-1'
    );

    expect(result.actionTaken).toBe('archived');
    const updatePayload = sb.sourcesUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.is_active).toBe(false);
    expect(updatePayload.status).toBe('closed');
  });

  it('does NOT archive rolling deadline past', async () => {
    mockCheckUrl.mockResolvedValue({ status: 'ok', finalUrl: null, actionSuggested: 'no_change' });
    mockCheckFunder.mockResolvedValue({ status: 'active', actionSuggested: 'no_change' });

    const sb = makeSupabase();
    const result = await verifyOneGrant(
      sb.client as never,
      makeGrant({ deadline: '2024-01-01T00:00:00Z', recurrence: 'rolling' }),
      'run-1'
    );

    expect(result.actionTaken).toBe('no_change');
    const updatePayload = sb.sourcesUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.is_active).toBeUndefined();
  });

  it('flags on URL 404 only (deadline + funder clean)', async () => {
    mockCheckUrl.mockResolvedValue({ status: '404', finalUrl: null, actionSuggested: 'url_flagged' });
    mockCheckFunder.mockResolvedValue({ status: 'active', actionSuggested: 'no_change' });

    const sb = makeSupabase();
    const result = await verifyOneGrant(sb.client as never, makeGrant(), 'run-1');

    expect(result.actionTaken).toBe('url_flagged');
    const updatePayload = sb.sourcesUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.manual_review_flag).toBe(true);
    expect(updatePayload.manual_review_reason).toContain('404');
  });

  it('flags on funder revoked only', async () => {
    mockCheckUrl.mockResolvedValue({ status: 'ok', finalUrl: null, actionSuggested: 'no_change' });
    mockCheckFunder.mockResolvedValue({ status: 'revoked', actionSuggested: 'funder_flagged' });

    const sb = makeSupabase();
    const result = await verifyOneGrant(sb.client as never, makeGrant(), 'run-1');

    expect(result.actionTaken).toBe('funder_flagged');
    const updatePayload = sb.sourcesUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.manual_review_flag).toBe(true);
    expect(updatePayload.manual_review_reason).toContain('revoked');
  });

  it('multi_flags when URL and funder both fail', async () => {
    mockCheckUrl.mockResolvedValue({ status: '404', finalUrl: null, actionSuggested: 'url_flagged' });
    mockCheckFunder.mockResolvedValue({ status: 'not_found', actionSuggested: 'funder_flagged' });

    const sb = makeSupabase();
    const result = await verifyOneGrant(sb.client as never, makeGrant(), 'run-1');

    expect(result.actionTaken).toBe('multi_flagged');
  });

  it('archive wins over flag (deadline has precedence)', async () => {
    mockCheckUrl.mockResolvedValue({ status: '404', finalUrl: null, actionSuggested: 'url_flagged' });
    mockCheckFunder.mockResolvedValue({ status: 'revoked', actionSuggested: 'funder_flagged' });

    const sb = makeSupabase();
    const result = await verifyOneGrant(
      sb.client as never,
      makeGrant({ deadline: '2024-01-01T00:00:00Z', recurrence: 'one_time' }),
      'run-1'
    );

    expect(result.actionTaken).toBe('archived');
    const updatePayload = sb.sourcesUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.is_active).toBe(false);
    // When archived, we don't also set manual_review_flag
    expect(updatePayload.manual_review_flag).toBeUndefined();
  });

  it('funder lookup_failed does NOT flag — safety guarantee', async () => {
    mockCheckUrl.mockResolvedValue({ status: 'ok', finalUrl: null, actionSuggested: 'no_change' });
    mockCheckFunder.mockResolvedValue({
      status: 'lookup_failed',
      actionSuggested: 'no_change',
    });

    const sb = makeSupabase();
    const result = await verifyOneGrant(sb.client as never, makeGrant(), 'run-1');

    expect(result.actionTaken).toBe('no_change');
    const updatePayload = sb.sourcesUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.manual_review_flag).toBeUndefined();
    // Does not set funder_verified_at when not active
    expect(updatePayload.funder_verified_at).toBeUndefined();
  });

  it('throws when audit log insert fails (prevents auditless state mutation)', async () => {
    mockCheckUrl.mockResolvedValue({ status: 'ok', finalUrl: null, actionSuggested: 'no_change' });
    mockCheckFunder.mockResolvedValue({ status: 'active', actionSuggested: 'no_change' });

    const sb = makeSupabase();
    sb.logInsert.mockResolvedValueOnce({ error: { message: 'log table unavailable' } });

    await expect(verifyOneGrant(sb.client as never, makeGrant(), 'run-1')).rejects.toThrow(
      /log.*insert failed/
    );
    // grant_sources update must NOT have been called
    expect(sb.sourcesUpdate).not.toHaveBeenCalled();
  });

  it('sets funder_verified_at when funder is active', async () => {
    mockCheckUrl.mockResolvedValue({ status: 'ok', finalUrl: null, actionSuggested: 'no_change' });
    mockCheckFunder.mockResolvedValue({ status: 'active', actionSuggested: 'no_change' });

    const sb = makeSupabase();
    await verifyOneGrant(sb.client as never, makeGrant(), 'run-1');

    const updatePayload = sb.sourcesUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.funder_verified_at).toBeDefined();
  });
});
