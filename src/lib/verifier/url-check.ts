// grantiq/src/lib/verifier/url-check.ts
//
// Unit 2b — HTTP reachability check for grant_sources.url.
// HEAD with 10s timeout + one retry on transient errors. Never
// block the event loop; caller uses p-limit for concurrency.

import type { UrlCheckResult } from './types';

const TIMEOUT_MS = 10_000;
const USER_AGENT = 'GrantIQ/1.0 (grant-discovery-platform; verify@grantiq.com)';

// Heuristic strings used to detect login/paywall pages when a URL
// responds 2xx but actually gates the content. Checked only when the
// response body is fetched (we use HEAD first, so this is a fallback
// in the rare case a funder returns 2xx from HEAD but the real page
// is paywalled — we'll catch it in Unit 9a crawler, not here).
// For now, we ONLY trust HTTP status codes.

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/pdf,*/*;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkUrl(url: string | null): Promise<UrlCheckResult> {
  if (!url || url.trim().length === 0) {
    return { status: 'no_url', finalUrl: null, actionSuggested: 'no_change' };
  }

  // Validate URL shape before trying fetch — saves a pointless network
  // round-trip for obviously malformed values (e.g., "example.com" with
  // no protocol).
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { status: '404', finalUrl: null, actionSuggested: 'url_flagged' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { status: '404', finalUrl: null, actionSuggested: 'url_flagged' };
  }

  // First attempt
  let lastErrorIsTransient = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url, TIMEOUT_MS);
      const finalUrl = res.url || url;

      if (res.status >= 200 && res.status < 300) {
        return { status: 'ok', finalUrl, actionSuggested: 'no_change' };
      }

      if (res.status === 404 || res.status === 410) {
        return { status: '404', finalUrl, actionSuggested: 'url_flagged' };
      }

      if (res.status === 401 || res.status === 403) {
        return { status: 'paywall', finalUrl, actionSuggested: 'url_flagged' };
      }

      // 5xx is transient — retry once.
      if (res.status >= 500 && res.status < 600 && attempt === 0) {
        lastErrorIsTransient = true;
        await sleep(5_000);
        continue;
      }

      // Other non-2xx non-transient: treat as 404-equivalent for action purposes.
      return { status: '404', finalUrl, actionSuggested: 'url_flagged' };
    } catch (err) {
      // AbortError (timeout) or network error. Retry once.
      lastErrorIsTransient = true;
      if (attempt === 0) {
        await sleep(5_000);
        continue;
      }
      // Second attempt also failed.
      return { status: 'timeout', finalUrl: null, actionSuggested: 'url_flagged' };
    }
  }

  // Should be unreachable but the type checker wants it.
  return {
    status: lastErrorIsTransient ? 'timeout' : '404',
    finalUrl: null,
    actionSuggested: 'url_flagged',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
