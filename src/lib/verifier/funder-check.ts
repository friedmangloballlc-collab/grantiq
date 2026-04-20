// grantiq/src/lib/verifier/funder-check.ts
//
// Unit 2c — funder existence check via IRS Tax Exempt Organization
// Search API. Public, free, no auth. If the API is down or rate-limited,
// return 'lookup_failed' so the orchestrator skips the grant for this
// run and retries next night. NEVER cascade a lookup failure into a
// false-positive archive — that's the one action that would lose
// customer trust.
//
// API docs: https://www.irs.gov/charities-non-profits/tax-exempt-organization-search
// IRS provides a downloadable bulk file (Pub 78); for per-EIN lookup we
// use the search endpoint which accepts EIN.

import type { FunderCheckResult } from './types';

const IRS_API_BASE = 'https://apps.irs.gov/app/eos';
const TIMEOUT_MS = 8_000;
const USER_AGENT = 'GrantIQ/1.0 (grant-discovery-platform; verify@grantiq.com)';

// Normalized EIN shape: 9 digits, no dashes. IRS's endpoints accept
// either "12-3456789" or "123456789"; we send the raw digits.
function normalizeEin(ein: string | null): string | null {
  if (!ein) return null;
  const digits = ein.replace(/\D/g, '');
  if (digits.length !== 9) return null;
  return digits;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkFunderByEin(ein: string | null): Promise<FunderCheckResult> {
  const normalized = normalizeEin(ein);
  if (!normalized) {
    // No EIN on file for this funder — skipped is not a failure.
    // Many federal grants don't have EINs; that's normal.
    return { status: 'skipped', actionSuggested: 'no_change' };
  }

  try {
    // Hit the allSearch endpoint which returns records for Pub78 + EO + revoked orgs.
    const url = `${IRS_API_BASE}/allSearch?ein=${normalized}`;
    const res = await fetchWithTimeout(url, TIMEOUT_MS);

    if (!res.ok) {
      // HTTP error from IRS — don't cascade. Skip this run for this grant;
      // next run will retry. Better than false-archiving on a flaky API.
      return { status: 'lookup_failed', actionSuggested: 'no_change' };
    }

    // Response is HTML-with-embedded-JSON in the live IRS site. The
    // contract can change; we handle unexpected shapes by returning
    // lookup_failed rather than crashing.
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      // Response wasn't JSON — IRS site returns HTML sometimes.
      // Treat as lookup_failed so we retry next night.
      return { status: 'lookup_failed', actionSuggested: 'no_change' };
    }

    // Expected shape (as of 2026): { data: [{ ein, name, deductibility, revocation_date, ... }] }
    // We look for two signals:
    //   - Any record with `revocation_date` set = revoked
    //   - No records at all = not_found
    //   - Any record without revocation = active
    const records = extractRecords(body);
    if (records.length === 0) {
      return { status: 'not_found', actionSuggested: 'funder_flagged' };
    }

    const anyRevoked = records.some((r) => Boolean(r.revocation_date));
    const anyActive = records.some((r) => !r.revocation_date);

    if (anyActive) {
      return { status: 'active', actionSuggested: 'no_change' };
    }
    if (anyRevoked) {
      return { status: 'revoked', actionSuggested: 'funder_flagged' };
    }

    // All records have unclear status — flag for human review.
    return { status: 'not_found', actionSuggested: 'funder_flagged' };
  } catch {
    // Network error, timeout, abort — skip for this run.
    return { status: 'lookup_failed', actionSuggested: 'no_change' };
  }
}

interface IrsRecord {
  ein?: string;
  name?: string;
  revocation_date?: string | null;
}

function extractRecords(body: unknown): IrsRecord[] {
  if (!body || typeof body !== 'object') return [];
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data.filter((r): r is IrsRecord => typeof r === 'object' && r !== null);
}
