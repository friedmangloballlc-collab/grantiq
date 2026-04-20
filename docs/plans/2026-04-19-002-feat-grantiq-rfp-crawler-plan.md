---
title: "feat: Background RFP crawler — populate grant_sources.raw_text for every grant"
type: feat
status: active
date: 2026-04-19
origin: in-conversation request 2026-04-19 from getreachmediallc@gmail.com
---

# feat: Background RFP crawler

## Overview

GrantIQ holds ~6,356 grants in `grant_sources` but `raw_text` is empty for most rows. The writing pipeline can only produce factually grounded drafts when the full RFP / NOFA text is the input. The interim prefill (commit `8524721`) covers the case where `raw_text` already exists and warns clearly when it doesn't — but that just exposes the data gap; it doesn't close it. This plan closes it.

A nightly background job walks every active grant in `grant_sources`, fetches the canonical RFP from the most authoritative source available for that grant type, extracts cleaned text, stores it in `raw_text`, and tracks per-grant extraction status so failures are visible and re-tryable. Federal grants resolve via the grants.gov API (structured, reliable). Foundation and state grants resolve via HTTP fetch + content extraction from the stored `url`. Grants where extraction fails after retry are flagged for manual sourcing.

The product principle this enforces: **no draft generated from fabricated input**. Today the system relies on the operator pasting the RFP; after this lands the system has its own ground-truth source for the majority of grants and a visible "no source on file" state for the rest.

## Problem Frame

The writing pipeline (`src/lib/ai/writing/`) is grounded entirely on the RFP text given to it. A thin description (one paragraph) is not an RFP. If the operator passes a description thinking it's the RFP, the AI will produce a fluent draft that invents specifics — funder priorities, evaluation criteria, allowable use of funds — that aren't in the source. That's the worst possible failure mode for grant writing software: confident, well-structured fabrication.

The current state forces every operator to manually source and paste the RFP for every application. That's both a UX tax and a quality risk: operators in a hurry will paste whatever's at hand. The system should own that sourcing job, do it consistently, and surface clearly when it can't.

This is also the prerequisite for any future "auto-draft on save" or "one-click application" feature. Both require canonical RFP text to be available without per-application operator effort.

## Requirements Trace

- **R1** (federal grants resolved via grants.gov API): Unit 2
- **R2** (foundation/state/corporate resolved via HTTP fetch from grant_sources.url): Unit 3
- **R3** (HTML → clean text extraction respecting RFP-specific structure): Unit 3
- **R4** (per-grant extraction status tracking with reason on failure): Unit 1
- **R5** (idempotent — re-running a grant doesn't duplicate work): Unit 4
- **R6** (rate limiting + retry-with-backoff per source): Unit 4
- **R7** (admin UI surface for failed extractions, manual override path): Unit 6
- **R8** (re-crawl cadence: nightly for failed, weekly for stale): Unit 5
- **R9** (write path uses raw_text without changes — interim prefill from `8524721` already wired): no change needed
- **R10** (operator override: manually paste RFP overrides any crawled text): Unit 1 + Unit 6

## Scope Boundaries

- **In scope**: federal (grants.gov), foundation, state, corporate. Crawl the URLs we already have on file.
- **Out of scope, deferred to follow-up**: discovering grants we don't already know about (that's the existing `data_source = 'api_crawl'` path, separate system). PDF extraction beyond what `pdf-parse` already handles in the writing pipeline. OCR for scanned-image RFPs. Foundation grants behind logins or paywalls — flag and skip; manual sourcing remains the only path.
- **Not changing**: the writing pipeline itself. raw_text consumption is already wired in `src/app/(app)/grants/[id]/write/page.tsx` (commit 8524721). When raw_text is populated by this crawler, the page will pre-fill it automatically with the green "✓ full RFP on file" banner.

## Implementation Units

### Unit 1: Schema additions

Add three columns to `grant_sources` to track extraction state. Add migration `00058_grant_source_extraction.sql`.

- `raw_text_status TEXT CHECK (raw_text_status IN ('not_attempted','extracted','failed','manual'))` — defaults to 'not_attempted'. Set to 'manual' when the operator has explicitly overridden via the write page (preserves operator paste over crawler overwrite).
- `raw_text_source TEXT` — short label of where the text came from: 'grants.gov', 'http_fetch', 'pdf_fetch', 'manual', null.
- `raw_text_failure_reason TEXT` — when `raw_text_status='failed'`, the human-readable reason (404, paywall_detected, robots_disallow, content_too_short, parse_error).
- `raw_text_extracted_at TIMESTAMPTZ` — when the text was last successfully extracted. Used by Unit 5 to decide re-crawl staleness.

Files:
- `supabase/migrations/00058_grant_source_extraction.sql`

Tests:
- Migration applies cleanly against current production schema (SELECT verification post-apply).

### Unit 2: grants.gov adapter

Federal grants (`source_type='federal'`) resolve via the grants.gov Search2 + FetchOpportunity APIs. The opportunity ID is in `cfda_number` for already-imported grants; for new ones we resolve via `name + funder_name`.

- New file `src/lib/crawlers/grants_gov.ts`. Single exported function `extractRfpFromGrantsGov(grant): Promise<{ text, source }>`.
- Hits `https://www.grants.gov/grantsws/rest/opportunities/search/` then `https://www.grants.gov/grantsws/rest/opportunity/details`.
- Returns the structured `synopsis` field + linked `relatedDocuments` content concatenated.
- Throws `CrawlerError` subclasses: `OpportunityNotFound`, `RateLimitedError`, `UpstreamError`.

Files:
- `src/lib/crawlers/grants_gov.ts` (new)
- `src/lib/crawlers/types.ts` (new — shared `CrawlerError` hierarchy + `CrawlResult` type)

Tests:
- `src/lib/crawlers/__tests__/grants_gov.test.ts` — mock fetch, assert on URL shape, error types, text concatenation order.

### Unit 3: HTTP-fetch adapter

Foundation/state/corporate grants resolve from `grant_sources.url`. Approach: fetch HTML, run through readability extraction (use `@mozilla/readability` + `jsdom` — already battle-tested for this), then plain-text serialize.

- New file `src/lib/crawlers/http_fetch.ts`. Exports `extractRfpFromUrl(url): Promise<{ text, source }>`.
- 30s timeout, follow redirects (max 5), bail on non-200, bail on Content-Type that isn't text/html or application/pdf.
- For PDF responses, route through existing `pdf-parse` (already in the project for the upload-rfp path).
- Detect paywalls / login walls heuristically (look for known login form selectors, "Subscribe", "Sign in to continue" near body start) — throw `PaywallDetectedError`.
- Detect "content too thin" — if extracted text is under 500 chars, throw `ContentTooShortError` (almost certainly extraction failure or wrong page).

Files:
- `src/lib/crawlers/http_fetch.ts` (new)
- `package.json`: add `@mozilla/readability`, `jsdom` if not present (verify first)

Tests:
- `src/lib/crawlers/__tests__/http_fetch.test.ts` — fixture HTML files for: foundation grant page, paywall page, 404 page, PDF response. Assert each routes to the right outcome.

### Unit 4: Crawler orchestrator

The wrapper that picks the right adapter, applies retry/backoff, and writes results back to `grant_sources`. Idempotent — running on an already-extracted grant either re-extracts (if forced) or no-ops.

- New file `src/lib/crawlers/orchestrator.ts`. Exports `crawlGrantRfp(grantId, opts): Promise<CrawlResult>`.
- Loads grant, dispatches by `source_type`, on success writes `raw_text + raw_text_status='extracted' + raw_text_source + raw_text_extracted_at = now()`, on failure writes `raw_text_status='failed' + raw_text_failure_reason`.
- Skips if `raw_text_status='manual'` unless `opts.force === true` — operator override always wins.
- Retry: 2 attempts with 5s backoff for transient errors (`RateLimitedError`, `UpstreamError`); 0 attempts for permanent (`OpportunityNotFound`, `PaywallDetectedError`).
- Per-source rate limiting: in-process `p-throttle` at ~5 req/sec for grants.gov (their published limit), 1 req/sec for arbitrary HTTP fetch.

Files:
- `src/lib/crawlers/orchestrator.ts` (new)

Tests:
- `src/lib/crawlers/__tests__/orchestrator.test.ts` — mock adapters, assert dispatch logic, retry behavior, status persistence, manual-override skip.

### Unit 5: Nightly background job

Cron job (Railway worker, since Vercel functions can't run long batch jobs) that runs the crawler against grants needing it.

- New file `worker/src/handlers/rfp_crawler.ts`. Exports `runRfpCrawl()`.
- Query: `WHERE is_active = true AND status IN ('open','forecasted') AND raw_text_status != 'manual' AND (raw_text_status = 'not_attempted' OR (raw_text_status = 'failed' AND updated_at < now() - interval '7 days') OR (raw_text_status = 'extracted' AND raw_text_extracted_at < now() - interval '30 days'))`.
- Process in batches of 50 with `p-limit(5)` concurrent (5 simultaneous crawls, 50 total per batch flush).
- Logs to `logger.info('rfp_crawl_batch_complete', { processed, succeeded, failed_transient, failed_permanent })`.
- Schedule: nightly via worker cron at 02:00 UTC (low Vercel-side traffic).

Files:
- `worker/src/handlers/rfp_crawler.ts` (new)
- `worker/src/cron.ts` or equivalent — add the schedule entry

Tests:
- `worker/__tests__/rfp_crawler.test.ts` — mock orchestrator, assert query filters, batch behavior, summary log shape.

### Unit 6: Admin surface for failed extractions

Operators need visibility into which grants failed extraction so they can either fix the URL or manually paste an RFP.

- Extend the existing admin grant list view (or add a small `/admin/rfp-status` page if no grant list exists) showing: count by `raw_text_status`, table of `failed` grants with reason + last-attempted timestamp + "Retry now" button + "Mark as manual" button.
- "Retry now" → POST to `/api/admin/rfp-crawler/retry` with `grantId`. Calls orchestrator with `force: true`.
- "Mark as manual" → POST to `/api/admin/rfp-crawler/mark-manual` with `grantId`. Sets `raw_text_status='manual'` (so the nightly job stops touching it).

Files:
- `src/app/(app)/admin/rfp-status/page.tsx` (new, admin-gated)
- `src/app/api/admin/rfp-crawler/retry/route.ts` (new)
- `src/app/api/admin/rfp-crawler/mark-manual/route.ts` (new)

Tests:
- API routes: assert admin gate (non-admin gets 403), valid grantId, status updates persist.

### Unit 7: Operator-paste preservation

When the operator pastes a custom RFP on the write page, that needs to win permanently — the crawler should not overwrite it on the next nightly run.

- Modify `src/app/api/writing/upload-rfp/route.ts` (or wherever the paste persists). After saving the RFP for the grant, also update `grant_sources.raw_text_status = 'manual'` for that grant_source_id. (If the upload-rfp route currently writes to a different table — `grant_rfp_analyses` — we still set the manual flag on `grant_sources` so the crawler knows to leave it alone.)

Files:
- `src/app/api/writing/upload-rfp/route.ts`

Tests:
- After a manual paste, run the orchestrator with that grantId. Assert no overwrite occurs unless `force: true`.

### Unit 8: Initial backfill run

One-time invocation against the existing 6,356 grants. Run from the worker on first deploy after the cron lands. ETA at 5 concurrent × ~1.5 sec/grant ≈ 30 min.

- Document the trigger command (just calling `runRfpCrawl({initialBackfill: true})` from a one-off worker job).
- Surface progress + final stats in worker logs.

Files: none new — uses Unit 4/5.

## Open Questions

- **grants.gov API key**: do we already have one provisioned? If yes, env var name? If no, sign up for one before Unit 2 starts (free, 24-hr provision time).
- **Foundation grant URL coverage**: how many of the 6,356 grants have a non-null `url`? Run `SELECT source_type, COUNT(*) FILTER (WHERE url IS NOT NULL) AS with_url, COUNT(*) AS total FROM grant_sources GROUP BY 1` before Unit 3 — if foundation `with_url` ratio is below 30%, the http_fetch adapter is shipping for very limited value and we should re-scope.
- **Cost / timing**: 6,356 grants × 1.5 sec/grant ≈ 2.6 hrs single-threaded. At 5 concurrent ≈ 30 min for backfill. Ongoing nightly load is much smaller — only failed/stale rows requeue.

## Risk

- **Anti-bot blocks**: foundations and large platforms increasingly block server-side fetchers. Mitigation: respect robots.txt, set a reasonable User-Agent identifying GrantIQ, fall back to manual flag rather than retry-storming.
- **Stale RFP overwrite**: if a foundation publishes a new RFP version, the 30-day re-crawl will eventually pick it up — but a freshly opened grant might still hold last cycle's text for up to 30 days. Acceptable for Phase 3; tighter freshness is Phase 4.
- **Legal gray area on scraping**: most grant RFPs are explicitly public (federal NOFAs are public-domain by statute; foundation RFPs are published to attract applicants). Mitigation: respect robots.txt; immediately drop and flag any source that responds with explicit "no scraping" terms.

## Sequencing

Sequential dependency: Unit 1 (schema) → Unit 2/3 in parallel (adapters) → Unit 4 (orchestrator depends on adapters) → Unit 5 (cron depends on orchestrator) + Unit 7 (paste preservation depends on Unit 1's `manual` status). Unit 6 (admin UI) and Unit 8 (backfill) come last.

Estimated effort: 3-5 working days. The crawler adapters (Units 2 + 3) are the bulk of the work and the highest test surface; the rest is straightforward orchestration and persistence.

## Validation

- Post-Unit 8: query `SELECT raw_text_status, COUNT(*) FROM grant_sources WHERE is_active GROUP BY 1`. Acceptance bar: ≥80% extracted, <10% failed, remainder not_attempted (newly imported, will pick up next nightly run).
- Manual smoke: pick 5 grants across all 4 source_types, open `/grants/[id]/write` for each. Confirm the green "✓ full RFP on file" banner shows and the textarea has substantive content for the extracted ones; confirm the amber stub banner shows for the failed ones.
- Operator-paste preservation: paste a custom RFP for a grant, run the orchestrator with that grantId, confirm raw_text is unchanged.
