---
title: "feat: Grant Data Verifier — nightly sweep validating every grant_sources row"
type: feat
status: active
date: 2026-04-20
origin: docs/GrantIQ_Custom_Agents_Roadmap (Google Doc 1n7BOX83rt9_dDHZqqfUsoqDWhZA4EnvccAQEMzjZX-c) — agent #11
related: docs/plans/2026-04-19-002-feat-grantiq-rfp-crawler-plan.md (shares worker infra + HTTP fetch utilities)
---

# feat: Grant Data Verifier

## Overview

Ship agent #11 from the roadmap. Nightly worker job that walks every active row in `grant_sources` and verifies: deadline hasn't silently passed, funder URL still resolves, funder entity hasn't dissolved per IRS exempt-org status. Marks stale grants as archived, flags suspicious ones for manual review.

Stale grants in matches = customers wasting time on dead opportunities = trust erosion. Today nothing removes expired grants except manual curation. At 6,356 grants this doesn't scale.

Mostly mechanical — small LLM spend. High-leverage data hygiene.

## Problem Frame

Current state:
- Grants get imported (grants.gov API, ProPublica 990, manual) with `status='open'` and a deadline
- Deadlines pass, funders dissolve, URLs break — and nothing notices
- Customers see these in `/matches`, waste time, lose trust

Three specific failure modes we need to catch:
1. **Deadline passed silently** — grant still shows `status='open'` even though its deadline was last quarter
2. **URL is dead** — funder moved the page, grant page 404s; customer clicks "View details" and gets an error
3. **Funder dissolved** — foundation lost 501(c)(3) status or went inactive; grant is technically live but funder can't actually pay out

A nightly sweep catches all three before the customer hits them.

## Requirements Trace

From roadmap agent #11:
- **R1** (nightly sweep of grant_sources): Unit 3
- **R2** (deadline validation): Unit 1 (pure DB, no LLM)
- **R3** (URL reachability with retry): Unit 2
- **R4** (funder existence via IRS EO API): Unit 2
- **R5** (auto-archive expired one-time grants): Unit 3
- **R6** (flag ambiguous cases — don't false-archive): Unit 3
- **R7** (audit log of every verification decision): Unit 1
- **R8** (admin surface for review queue): Unit 4

## Scope Boundaries

**In scope:**
- Three verification dimensions: deadline, URL, funder existence
- Auto-actions: archive expired one-time grants, mark URL-dead, flag funder for review
- Audit log of every check (who, when, what changed)
- Admin page showing flags + recent verifier activity
- Worker cron scheduled nightly
- Batched + concurrent (p-limit 10) to complete in <30min

**Out of scope:**
- Re-crawling full RFP text (that's the Phase 3 RFP Crawler — different plan)
- Discovering new grants (that's the existing `data_source='api_crawl'` path)
- Attempting to fix broken URLs (find the new URL) — flag, don't try to auto-repair
- Per-funder dispute resolution (they'll challenge archives — separate admin workflow)

**Not changing:**
- Match scorer (it reads from `grant_sources`; Verifier updates the table, scorer picks up on next run)
- `/api/matches` (Verifier mutates status, user sees the result via normal flow)

## Implementation Units

### Unit 1: Schema

Migration `00063_grant_verification.sql`:

```sql
CREATE TABLE IF NOT EXISTS grant_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  run_id UUID NOT NULL,  -- groups all checks from one nightly run
  url_status TEXT CHECK (url_status IN ('ok','404','paywall','timeout','skipped','no_url')),
  url_final_url TEXT,  -- if redirected
  deadline_status TEXT CHECK (deadline_status IN ('future','passed_one_time','passed_rolling','no_deadline')),
  funder_status TEXT CHECK (funder_status IN ('active','revoked','not_found','lookup_failed','skipped')),
  action_taken TEXT NOT NULL CHECK (action_taken IN (
    'no_change', 'archived', 'url_flagged', 'funder_flagged', 'multi_flagged'
  )),
  notes TEXT,
  checked_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_grant_verification_log_grant ON grant_verification_log(grant_source_id, checked_at DESC);
CREATE INDEX idx_grant_verification_log_run ON grant_verification_log(run_id);
CREATE INDEX idx_grant_verification_log_action ON grant_verification_log(action_taken, checked_at DESC)
  WHERE action_taken != 'no_change';

-- Add flag columns to grant_sources if not already present
ALTER TABLE grant_sources
  ADD COLUMN IF NOT EXISTS url_status TEXT,
  ADD COLUMN IF NOT EXISTS funder_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_review_flag BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_review_reason TEXT;
```

Every check produces a row in `grant_verification_log` — searchable by run_id (see what one run did) or grant_source_id (see a grant's full history).

Files:
- `supabase/migrations/00063_grant_verification.sql` (new)

### Unit 2: Verification modules (three dimensions)

New directory: `src/lib/verifier/`

#### 2a: Deadline check (`deadline-check.ts`)

Pure DB logic, no network calls:

```typescript
export interface DeadlineCheckResult {
  status: 'future' | 'passed_one_time' | 'passed_rolling' | 'no_deadline';
  actionSuggested: 'no_change' | 'archive';
}

export function checkDeadline(grant: GrantRow): DeadlineCheckResult;
```

Rules:
- `deadline IS NULL` → `no_deadline`, no_change
- `deadline > now()` → `future`, no_change
- `deadline < now() AND recurrence = 'one_time'` → `passed_one_time`, **archive**
- `deadline < now() AND recurrence IN ('rolling','annual','quarterly')` → `passed_rolling`, no_change (the deadline refers to the last cycle — funder accepts continuously)

#### 2b: URL check (`url-check.ts`)

HTTP HEAD with 10s timeout + one retry on transient errors:

```typescript
export interface UrlCheckResult {
  status: 'ok' | '404' | 'paywall' | 'timeout' | 'skipped' | 'no_url';
  finalUrl: string | null;
  actionSuggested: 'no_change' | 'url_flagged';
}

export async function checkUrl(url: string | null): Promise<UrlCheckResult>;
```

Logic:
- `null || empty` → `no_url`, no_change (not a Verifier failure — grant just doesn't have a URL)
- HEAD with `User-Agent: GrantIQ/1.0 (grant-discovery-platform; verify@grantiq.com)` and `Accept: text/html,application/pdf`
- 200/301/302 → `ok`, capture `finalUrl` from redirect chain
- 404/410 → `404`, `url_flagged`
- 401/403 → `paywall`, `url_flagged` (can't verify behind auth)
- Network/DNS error → retry once after 5s; still failing → `timeout`, `url_flagged`
- Any 2xx response → `ok`

Use `p-limit(10)` concurrency at caller level (Unit 3). Never block the event loop.

#### 2c: Funder existence check (`funder-check.ts`)

IRS Exempt Organization Business Master File API (free, public) — or fallback to manual review flag.

```typescript
export interface FunderCheckResult {
  status: 'active' | 'revoked' | 'not_found' | 'lookup_failed' | 'skipped';
  actionSuggested: 'no_change' | 'funder_flagged';
}

export async function checkFunderByEin(ein: string | null): Promise<FunderCheckResult>;
```

Logic:
- `null` → `skipped` (no EIN to look up — not a failure)
- Hit IRS EO Select Check: `https://apps.irs.gov/app/eos/allSearch?ein=<ein>` (or the Publication 78 API if the Select Check is rate-limited)
- Status includes "revoked" → `revoked`, `funder_flagged`
- Returns a record → `active`, no_change
- No record → `not_found`, `funder_flagged` (do NOT auto-archive — some legit funders don't appear in EO database; flag for human)
- HTTP error → `lookup_failed`, no_change (skip this run, retry next)

Files:
- `src/lib/verifier/deadline-check.ts` (new)
- `src/lib/verifier/url-check.ts` (new)
- `src/lib/verifier/funder-check.ts` (new)
- `src/lib/verifier/types.ts` (new — shared interfaces)

Tests (per module):
- Deadline: one-time past → archive; rolling past → no_change; null → no_change
- URL: mock fetch for each response type; assert timeout behavior + retry works
- Funder: mock IRS response for active/revoked/not_found; assert skipped when EIN null

### Unit 3: Orchestrator + worker handler

New file `worker/src/handlers/grant-data-verifier.ts`:

```typescript
export async function runGrantVerification(): Promise<{
  runId: string;
  grantsChecked: number;
  archived: number;
  urlFlagged: number;
  funderFlagged: number;
  durationMs: number;
}>;
```

Flow:
1. Generate runId (UUID)
2. Query candidates:
   ```sql
   SELECT id, url, deadline, recurrence, funder_profiles.ein, manual_review_flag
   FROM grant_sources
   LEFT JOIN funder_profiles ON funder_profiles.id = grant_sources.funder_id
   WHERE is_active = true
     AND status IN ('open', 'forecasted')
     AND (last_verified IS NULL OR last_verified < now() - interval '7 days')
     AND manual_review_flag = false  -- don't re-verify flagged grants
   ORDER BY last_verified ASC NULLS FIRST
   LIMIT 2000;  -- batch per run; ~3 runs cover all 6,356 grants per week
   ```
3. For each grant (in parallel via `p-limit(10)`):
   - `const deadline = checkDeadline(grant)` (sync)
   - `const url = await checkUrl(grant.url)`
   - `const funder = await checkFunderByEin(grant.ein)`
   - Aggregate into an `action_taken`:
     - All three ok/skipped → `no_change`
     - Deadline suggests archive → `archived`
     - URL flagged + others ok → `url_flagged`
     - Funder flagged + others ok → `funder_flagged`
     - More than one flag → `multi_flagged`
   - Apply action:
     - `archived`: `UPDATE grant_sources SET is_active = false, status = 'closed' WHERE id = $1`
     - `*_flagged`: `UPDATE grant_sources SET manual_review_flag = true, manual_review_reason = '<summary>' WHERE id = $1` (stops further verifier runs until resolved)
   - Always: `UPDATE grant_sources SET last_verified = now(), url_status = $url_status WHERE id = $1`
   - Insert audit row into `grant_verification_log`
4. Log summary: `logger.info('grant_verification_complete', { ... })`

**Schedule**: nightly at `02:15 UTC`. Railway worker cron. 2000 grants × 1.5s/grant / 10 concurrent ≈ 5 min. Well under the 30min budget.

Files:
- `worker/src/handlers/grant-data-verifier.ts` (new)
- `worker/src/cron.ts` (modify — add schedule)

Tests:
- `worker/__tests__/grant-data-verifier.test.ts`: fixture DB with known-bad grants, run handler, assert correct mutations + log entries
- Resilience test: mock 30% URL failures → run completes, doesn't crash, logs timeouts

### Unit 4: Admin review surface

Admin page at `/admin/grant-verifier`:

- **Summary card**: "N grants checked in last run; M archived; K flagged for review"
- **Review queue**: grants with `manual_review_flag = true`, sortable by reason + age
- **Actions per flagged grant**:
  - "Mark verified (clear flag)" — sets `manual_review_flag = false`, Verifier picks it up again next run
  - "Archive manually" — sets `is_active = false, status = 'closed'`
  - "Keep and suppress" — sets flag false + adds a `verifier_suppressed` tag so we stop re-flagging this specific issue
- **Recent verifier runs**: log of the last 14 runs with stats each
- **Per-grant drill-down**: click into a grant → see all `grant_verification_log` rows for that grant (trend over time)

Files:
- `src/app/(app)/admin/grant-verifier/page.tsx` (new, admin-gated)
- `src/app/api/admin/grant-verifier/resolve/route.ts` (new — POST to clear/archive/suppress)

## Decisions (locked)

1. **No LLM for core verification**. Three mechanical checks are cheaper, faster, and more reliable than an LLM call. Roadmap assumed optional LLM for ambiguous funders — dropping that for v1 (can add later if manual-review queue gets too big).
2. **Auto-archive only for one-time deadlines passed.** Never auto-archive for URL or funder issues — those have too many false-positive modes. Flag for human review.
3. **Batch size 2000, nightly.** ~3 nights to cover all 6,356 grants; after that, 7-day `last_verified` window means steady state ~900/night. Manageable.
4. **Don't re-verify manual_review_flag grants.** Once a human has flagged something, Verifier stays out until human clears the flag.
5. **Skip funder check when EIN missing.** Federal grants don't always have funder EINs; skipping is correct (not a failure).

## Risk

- **Anti-bot blocking our HEAD requests**: big platforms (Cloudflare, major foundations) may 403/503 our User-Agent. Mitigation: rotate User-Agent strings in a pool; detect systematic blocking per-domain and add a domain-level exclusion list.
- **IRS API rate-limiting or downtime**: their APIs are notoriously flaky. Mitigation: `lookup_failed` status means we skip this run for that grant, retry next night. Don't cascade a lookup failure into a false archive.
- **False archiving of rolling grants**: if we misinterpret `recurrence` (e.g., a grant is rolling but marked `one_time` in our DB due to bad import), we'd auto-archive it. Mitigation: audit log makes this reversible. Admin surface surfaces recent archives so humans can spot misfires.
- **Thundering herd on a domain**: 200 foundation grants pointing to `example-foundation.org` → we hit them 200 times in 5 min. Rude. Mitigation: p-limit is global but we could add per-domain throttling; defer unless a partner complains.

## Sequencing

Unit 1 (schema) → Unit 2 (three modules, can be parallel) → Unit 3 (orchestrator) → Unit 4 (admin surface).

Estimated effort:
- Unit 1: 0.25 day
- Unit 2a (deadline): 0.25 day
- Unit 2b (URL): 0.5 day
- Unit 2c (funder): 0.5 day
- Unit 3: 0.5 day
- Unit 4: 0.5 day
- **Total: 2.5 days.**

## Validation

1. Apply migration 00063; confirm table + column additions
2. Seed 10 test grants: 2 expired one-time, 2 expired rolling, 2 with 404 URLs, 1 paywall URL, 1 funder with revoked status, 2 fully valid
3. Run handler once manually → verify:
   - 2 expired one-time → archived
   - 2 expired rolling → no_change
   - 2 404s → url_flagged
   - 1 paywall → url_flagged
   - 1 revoked funder → funder_flagged
   - 2 valid → no_change (last_verified updated)
4. Re-run handler → should skip all 10 (last_verified < 7 days old)
5. Advance DB clock by 8 days, re-run → should re-check all 10
6. Admin page loads, review queue shows 4 flagged grants (2 URL + 1 paywall + 1 funder)
7. Mark one as "Keep and suppress" → next run skips it; row in log shows suppression

**Success criterion (week 1):**
- First full coverage of all 6,356 grants complete within 4 nights
- False-archive rate < 1% (verified by admin spot-check — did we archive anything that shouldn't have been?)
- Admin review queue steady-state <50 grants (if higher, flag thresholds need adjustment)
