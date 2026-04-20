#!/usr/bin/env tsx
// grantiq/scripts/smoke-test.ts
//
// Deploy Smoke Tester — walks the GrantIQ critical path via HTTP.
// Signs in, loads pipeline/matches, saves a grant, fetches grant
// detail, cleans up. Reports PASS/FAIL per step with the actual
// response body on fail — so "Deploy broke something" gets a
// specific file:line-ready answer in seconds.
//
// Required env vars:
//   SMOKE_TEST_BASE_URL         (default: https://www.grantiq.com)
//   SMOKE_TEST_EMAIL            (test account email)
//   SMOKE_TEST_PASSWORD         (test account password)
//   NEXT_PUBLIC_SUPABASE_URL    (for auth endpoint)
//   NEXT_PUBLIC_SUPABASE_ANON_KEY (for auth request)
//   SMOKE_TEST_GRANT_ID         (optional — a fixture grant_source_id;
//                                if unset, picks first active grant)
//
// Exit code:
//   0 = all steps passed (critical path green)
//   1 = some step failed (critical path broken)
//   2 = setup/env error
//
// Usage:
//   SMOKE_TEST_EMAIL=... SMOKE_TEST_PASSWORD=... npx tsx scripts/smoke-test.ts
//   SMOKE_TEST_BASE_URL=https://preview.grantiq.com SMOKE_TEST_EMAIL=... npx tsx scripts/smoke-test.ts
//
// Intended callers:
//   - GitHub Action post-deploy
//   - Vercel deploy hook webhook
//   - Manual "is prod working right now"

interface StepResult {
  name: string;
  ok: boolean;
  status?: number;
  durationMs: number;
  error?: string;
  detail?: string;
}

const BASE_URL = process.env.SMOKE_TEST_BASE_URL ?? 'https://www.grantiq.com';
const TEST_EMAIL = process.env.SMOKE_TEST_EMAIL;
const TEST_PASSWORD = process.env.SMOKE_TEST_PASSWORD;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FIXTURE_GRANT_ID = process.env.SMOKE_TEST_GRANT_ID;

// Sample RFP for the upload step. Intentionally structured with the
// required sections the rfp-parser looks for.
const SAMPLE_RFP = `GRANT OPPORTUNITY — SMOKE TEST RFP

ELIGIBILITY
- 501(c)(3) nonprofits in good standing
- Annual operating budget under $5M

FUNDING DETAILS
- Award range: $10,000 to $100,000
- Grant period: 12 months
- Deadline: December 31, 2026

REQUIRED APPLICATION SECTIONS

1. Executive Summary (1 page)
   Brief overview of project and organization.

2. Statement of Need (2 pages)
   Describe the problem and supporting evidence.

3. Project Description (3 pages)
   Activities, timeline, target population.

4. Budget Narrative (1 page)
   Justification for budget categories.

SCORING CRITERIA
- Alignment with funder priorities (30 points)
- Need and impact (30 points)
- Project design (25 points)
- Budget reasonableness (15 points)
`;

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function step<T>(
  name: string,
  fn: () => Promise<{ ok: boolean; status?: number; error?: string; detail?: string; value?: T }>
): Promise<{ result: StepResult; value: T | undefined }> {
  const started = Date.now();
  try {
    const r = await fn();
    return {
      result: {
        name,
        ok: r.ok,
        status: r.status,
        durationMs: Date.now() - started,
        error: r.error,
        detail: r.detail,
      },
      value: r.value,
    };
  } catch (err) {
    return {
      result: {
        name,
        ok: false,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      },
      value: undefined,
    };
  }
}

function requireEnv(): string | null {
  const missing: string[] = [];
  if (!TEST_EMAIL) missing.push('SMOKE_TEST_EMAIL');
  if (!TEST_PASSWORD) missing.push('SMOKE_TEST_PASSWORD');
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    return `Missing required env vars: ${missing.join(', ')}`;
  }
  return null;
}

async function main() {
  const envError = requireEnv();
  if (envError) {
    console.error(`setup error: ${envError}`);
    process.exit(2);
  }

  console.log(`\n=== GrantIQ Smoke Test — ${BASE_URL} ===`);
  console.log(`Test account: ${TEST_EMAIL}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results: StepResult[] = [];
  let jwt: string | null = null;
  let orgId: string | null = null;
  let fixtureGrantId: string | null = FIXTURE_GRANT_ID ?? null;
  let newPipelineId: string | null = null;

  // ── Step 1: Auth ────────────────────────────────────────────────────────
  {
    const { result, value } = await step<string>('auth', async () => {
      const res = await fetchWithTimeout(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: `auth failed: ${body.slice(0, 200)}` };
      }
      const json = (await res.json()) as { access_token?: string };
      if (!json.access_token) {
        return { ok: false, status: res.status, error: 'no access_token in response' };
      }
      return { ok: true, status: res.status, value: json.access_token };
    });
    results.push(result);
    if (!result.ok) return reportAndExit(results);
    jwt = value!;
  }

  const authHeaders = () => ({ Authorization: `Bearer ${jwt}` });

  // ── Step 2: Pipeline membership lookup ──────────────────────────────────
  {
    const { result } = await step('pipeline_membership', async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/api/pipeline`, {
        headers: authHeaders(),
      });
      if (res.status === 403) {
        const body = await res.text().catch(() => '');
        return {
          ok: false,
          status: 403,
          error: 'RLS 403 on /api/pipeline',
          detail: `Likely the RLS chicken-and-egg bug — run \`npx tsx scripts/rls-sweep.ts\` to find unpatched routes. Body: ${body.slice(0, 200)}`,
        };
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: body.slice(0, 200) };
      }
      return { ok: true, status: res.status };
    });
    results.push(result);
    if (!result.ok) return reportAndExit(results);
  }

  // ── Step 3: Grant matches load ──────────────────────────────────────────
  {
    const { result, value } = await step<{ matches: Array<{ grant_source_id?: string }> }>(
      'matches_load',
      async () => {
        const res = await fetchWithTimeout(`${BASE_URL}/api/matches`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          return { ok: false, status: res.status, error: body.slice(0, 200) };
        }
        const json = await res.json();
        return { ok: true, status: res.status, value: json };
      }
    );
    results.push(result);
    if (!result.ok) return reportAndExit(results);

    // If no fixture configured, try to pick one from the matches list
    if (!fixtureGrantId && value && value.matches.length > 0) {
      fixtureGrantId = value.matches[0].grant_source_id ?? null;
    }
  }

  if (!fixtureGrantId) {
    results.push({
      name: 'fixture_grant',
      ok: false,
      durationMs: 0,
      error: 'No fixture grant available — set SMOKE_TEST_GRANT_ID or ensure the test org has matches',
    });
    return reportAndExit(results);
  }

  // ── Step 4: Save to pipeline ────────────────────────────────────────────
  {
    const { result, value } = await step<string>('save_to_pipeline', async () => {
      const res = await fetchWithTimeout(`${BASE_URL}/api/pipeline`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_source_id: fixtureGrantId, stage: 'identified' }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        // Duplicate (409) is OK — means a prior smoke-test row wasn't cleaned up
        if (res.status === 409) {
          return { ok: true, status: 409, detail: 'duplicate — prior cleanup may have failed, non-blocking' };
        }
        return { ok: false, status: res.status, error: body.slice(0, 200) };
      }
      const json = (await res.json()) as { item?: { id?: string } };
      return { ok: true, status: res.status, value: json.item?.id };
    });
    results.push(result);
    if (!result.ok) return reportAndExit(results);
    newPipelineId = value ?? null;
  }

  // ── Step 5: Grant detail ────────────────────────────────────────────────
  {
    const { result } = await step('grant_detail', async () => {
      const res = await fetchWithTimeout(
        `${BASE_URL}/api/grants/${fixtureGrantId}`,
        { headers: authHeaders() }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: body.slice(0, 200) };
      }
      return { ok: true, status: res.status };
    });
    results.push(result);
    if (!result.ok) return reportAndExit(results);
  }

  // ── Step 6: RFP upload (text paste) — tests upload-rfp + Anthropic ──────
  // This step WILL fail if Anthropic is disabled or mis-keyed. Skip if
  // SMOKE_TEST_SKIP_RFP=1 is set.
  if (process.env.SMOKE_TEST_SKIP_RFP !== '1' && orgId) {
    const { result } = await step('rfp_upload', async () => {
      const res = await fetchWithTimeout(
        `${BASE_URL}/api/writing/upload-rfp`,
        {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_type: 'text_paste',
            text: SAMPLE_RFP,
            org_id: orgId,
            grant_source_id: fixtureGrantId,
          }),
          timeoutMs: 60_000, // RFP parse can take 30s
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        // Specific known-errors get specific diagnoses
        if (body.includes('organization has been disabled')) {
          return {
            ok: false,
            status: res.status,
            error: 'Anthropic org disabled',
            detail: 'Billing issue — check console.anthropic.com. Not a code problem.',
          };
        }
        return { ok: false, status: res.status, error: body.slice(0, 300) };
      }
      return { ok: true, status: res.status };
    });
    results.push(result);
    // Don't fail-fast on rfp_upload — cleanup still matters
  }

  // ── Step 7: Cleanup the pipeline row we created ─────────────────────────
  if (newPipelineId) {
    const { result } = await step('cleanup', async () => {
      const res = await fetchWithTimeout(
        `${BASE_URL}/api/pipeline?id=${newPipelineId}`,
        { method: 'DELETE', headers: authHeaders() }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          ok: false,
          status: res.status,
          error: `cleanup failed: ${body.slice(0, 200)}`,
          detail: `Manual cleanup needed for pipeline_id ${newPipelineId}`,
        };
      }
      return { ok: true, status: res.status };
    });
    results.push(result);
  }

  return reportAndExit(results);
}

function reportAndExit(results: StepResult[]): never {
  console.log('');
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    const statusText = r.status ? ` (${r.status})` : '';
    console.log(`${icon} ${r.name}${statusText} — ${r.durationMs}ms`);
    if (!r.ok && r.error) console.log(`   → ${r.error}`);
    if (r.detail) console.log(`   ${r.detail}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log('');
  if (failed.length === 0) {
    console.log('VERDICT: ✅ Critical path GREEN');
    console.log('The app is safe to direct customers to.');
    process.exit(0);
  } else {
    console.log(`VERDICT: ❌ BROKEN — ${failed.length} step(s) failed`);
    for (const f of failed) {
      console.log(`  [${f.name}] ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('smoke-test crashed:', err);
  process.exit(2);
});
