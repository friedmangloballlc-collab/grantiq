import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUrl } from '@/lib/verifier/url-check';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockResponse(status: number, finalUrl?: string) {
  return {
    status,
    ok: status >= 200 && status < 300,
    url: finalUrl ?? '',
  } as Response;
}

describe('checkUrl', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns no_url for null', async () => {
    const result = await checkUrl(null);
    expect(result).toEqual({ status: 'no_url', finalUrl: null, actionSuggested: 'no_change' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns no_url for empty string', async () => {
    const result = await checkUrl('');
    expect(result.status).toBe('no_url');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('flags malformed URL without hitting fetch', async () => {
    const result = await checkUrl('not a url');
    expect(result).toEqual({
      status: '404',
      finalUrl: null,
      actionSuggested: 'url_flagged',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('flags non-http(s) protocol', async () => {
    const result = await checkUrl('ftp://example.com/rfp');
    expect(result.status).toBe('404');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns ok for 200 response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, 'https://example.com/grant'));
    const result = await checkUrl('https://example.com/grant');
    expect(result).toEqual({
      status: 'ok',
      finalUrl: 'https://example.com/grant',
      actionSuggested: 'no_change',
    });
  });

  it('returns ok for redirected response capturing final URL', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, 'https://new.example.com/grant-moved'));
    const result = await checkUrl('https://example.com/grant');
    expect(result.finalUrl).toBe('https://new.example.com/grant-moved');
  });

  it('flags 404 as url_flagged', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404));
    const result = await checkUrl('https://example.com/dead-grant');
    expect(result).toEqual({
      status: '404',
      finalUrl: 'https://example.com/dead-grant',
      actionSuggested: 'url_flagged',
    });
  });

  it('flags 410 as 404-equivalent', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(410));
    const result = await checkUrl('https://example.com/gone');
    expect(result.status).toBe('404');
    expect(result.actionSuggested).toBe('url_flagged');
  });

  it('flags 401 as paywall', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401));
    const result = await checkUrl('https://members-only.example.com/grant');
    expect(result.status).toBe('paywall');
    expect(result.actionSuggested).toBe('url_flagged');
  });

  it('flags 403 as paywall', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(403));
    const result = await checkUrl('https://example.com/members');
    expect(result.status).toBe('paywall');
  });

  it('retries on 500 and succeeds on second attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200, 'https://example.com/ok'));
    const result = await checkUrl('https://example.com/ok');
    expect(result.status).toBe('ok');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  }, 15_000);

  it('returns timeout when both attempts throw', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));
    const result = await checkUrl('https://example.com/unreachable');
    expect(result.status).toBe('timeout');
    expect(result.actionSuggested).toBe('url_flagged');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  }, 15_000);
});
