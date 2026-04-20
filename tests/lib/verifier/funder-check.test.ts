import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkFunderByEin } from '@/lib/verifier/funder-check';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockJsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('checkFunderByEin', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns skipped when ein is null', async () => {
    const result = await checkFunderByEin(null);
    expect(result).toEqual({ status: 'skipped', actionSuggested: 'no_change' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns skipped for malformed EIN', async () => {
    const result = await checkFunderByEin('abc');
    expect(result.status).toBe('skipped');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('normalizes hyphenated EIN', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse(200, { data: [{ ein: '123456789', name: 'Test Foundation' }] })
    );
    const result = await checkFunderByEin('12-3456789');
    expect(result.status).toBe('active');
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('ein=123456789');
    expect(callUrl).not.toContain('12-3456789');
  });

  it('returns active for a record with no revocation_date', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse(200, {
        data: [{ ein: '123456789', name: 'Acme Foundation', revocation_date: null }],
      })
    );
    const result = await checkFunderByEin('123456789');
    expect(result).toEqual({ status: 'active', actionSuggested: 'no_change' });
  });

  it('returns revoked when all records have revocation_date and none active', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse(200, {
        data: [{ ein: '123456789', name: 'Revoked Foundation', revocation_date: '2023-01-15' }],
      })
    );
    const result = await checkFunderByEin('123456789');
    expect(result).toEqual({ status: 'revoked', actionSuggested: 'funder_flagged' });
  });

  it('returns active when at least one record is active (mixed records)', async () => {
    // IRS returns multiple records per EIN sometimes (same org across databases).
    // If ANY is active, treat as active — conservative bias against false-flag.
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse(200, {
        data: [
          { ein: '123456789', revocation_date: '2020-01-01' },
          { ein: '123456789', revocation_date: null },
        ],
      })
    );
    const result = await checkFunderByEin('123456789');
    expect(result.status).toBe('active');
  });

  it('returns not_found when no records', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(200, { data: [] }));
    const result = await checkFunderByEin('999999999');
    expect(result).toEqual({ status: 'not_found', actionSuggested: 'funder_flagged' });
  });

  it('returns lookup_failed on IRS HTTP error without flagging', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(500, {}));
    const result = await checkFunderByEin('123456789');
    expect(result).toEqual({ status: 'lookup_failed', actionSuggested: 'no_change' });
  });

  it('returns lookup_failed on non-JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('not json');
      },
    } as Response);
    const result = await checkFunderByEin('123456789');
    expect(result.status).toBe('lookup_failed');
    // Never cascades into a flag — this is the critical guarantee
    expect(result.actionSuggested).toBe('no_change');
  });

  it('returns lookup_failed on network error — never cascades to flag', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    const result = await checkFunderByEin('123456789');
    expect(result).toEqual({ status: 'lookup_failed', actionSuggested: 'no_change' });
  });

  it('handles missing data field in response', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(200, {}));
    const result = await checkFunderByEin('123456789');
    expect(result.status).toBe('not_found');
  });

  it('handles non-array data field', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(200, { data: 'not-an-array' }));
    const result = await checkFunderByEin('123456789');
    expect(result.status).toBe('not_found');
  });
});
