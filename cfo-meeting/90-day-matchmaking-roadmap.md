# 90-Day Matchmaking Accuracy Roadmap

## EXECUTIVE SUMMARY

The matchmaking engine is structurally sound (15 hard filters, 5-component weighted scoring, vector recall, 7 daily crons) but has three critical gaps: (1) multi-facet vector recall is 50% broken — the profile facet does a table scan instead of vector search because `purpose_embedding` column exists but is never populated for grants, (2) feedback data is captured but completely disconnected from ranking — user save/dismiss signals are stored in `match_feedback` but never read, and (3) grant data quality varies significantly — crawled grants have thin descriptions and may have cross-source duplicates due to three conflicting dedup strategies.

## THE ONE THING

**If you could only do ONE thing this week: Populate `purpose_embedding` for all grants and activate the profile facet in vector recall.**

Why it beats every other option: The multi-facet recall code already exists (`src/lib/matching/vector-recall.ts:57-109`), the migration already created the column (`supabase/migrations/00041_purpose_embedding.sql`), and the org-side profile embedding is already generated (`src/app/api/onboarding/complete/route.ts:110`). But lines 80-86 of vector-recall.ts do a full table scan instead of vector search because grants don't have `purpose_embedding` populated. Fixing this activates the "who you are matches what kind of org should apply" dimension — which is a different signal from "what you do matches what the grant funds." This is the single largest accuracy lift with the least effort.

- **Effort:** M (3-4 days) — update generate-embeddings cron to produce purpose_embedding using `buildGrantProfileText()`, backfill 4,304 grants, update vector-recall.ts to use real vector search on purpose_embedding
- **Expected outcome:** Grants that match the org's profile (entity type, certifications, NAICS) rank 10-20% higher than grants that only match semantically. Measurable by checking if top-5 matches change for test orgs.
- **Prerequisite:** Migration 00041 already applied (confirmed).

---

## TOP 5 ITEMS RANKED BY ROI

| Rank | Item | Category | Accuracy | UX | Effort | ROI Score | Why |
|------|------|----------|----------|-----|--------|-----------|-----|
| 1 | **Activate purpose_embedding + profile facet** | Milestone 2 | 7 | 4 | M (4d) | 2.75 | 50% of multi-facet is dead code. Fixing it uses existing infrastructure. |
| 2 | **Use feedback to exclude dismissed + boost saved** | Milestone 8+11 | 6 | 7 | M (3d) | 4.33 | Feedback is captured but ignored. Reading match_feedback takes 2 lines of code. Dismissed exclusion already built but could weight saved grants higher. |
| 3 | **Structured criteria extraction (LLM parse grant descriptions)** | Milestone 1 | 8 | 5 | L (10d) | 1.30 | Most grants have empty eligibility_types/states from crawled sources. LLM extraction fills these, making hard filters actually fire. |
| 4 | **Unify dedup across all sources** | Non-milestone | 5 | 3 | S (1d) | 8.00 | Three dedup strategies = cross-source duplicates. One canonical dedup key fixes it. |
| 5 | **Three-state hard filters (match/mismatch/unknown)** | Milestone 6 | 7 | 6 | M (5d) | 2.60 | Current filters pass everything when fields are null. "Unknown" state would flag these as lower confidence instead of passing silently. |

---

## 90-DAY ROADMAP

### Week 1-2: Foundation Fixes
**Items:** Activate purpose_embedding (#1), Unify dedup (#4)

- Generate purpose_embedding for all 4,304 grants using `buildGrantProfileText()` from multi-facet-embed.ts
- Update vector-recall.ts to use actual vector search on purpose_embedding instead of table scan
- Unify dedup strategy: add cross-source dedup key (cfda_number OR normalized name+funder hash) to all ingestion paths
- **Measure:** Run matching for 5 test orgs before/after. Compare top-10 overlap.
- **Unlocks:** Milestone 2 (multi-facet) fully operational

### Week 3-4: Feedback Loop
**Items:** Use feedback in ranking (#2), Instrument all match interactions (Milestone 8)

- Read match_feedback in matches page query: exclude dismissed, boost saved (+5 score)
- Add "not relevant" reason capture when user dismisses (dropdown: wrong industry, too competitive, wrong geography, not eligible, other)
- Track grant detail views, time-on-page, scroll depth in user_events
- **Measure:** Track dismiss rate before/after. Goal: <20% dismiss rate on top-5 matches.
- **Unlocks:** Milestone 11 (learned weights) — needs feedback data volume

### Week 5-6: Structured Criteria Extraction (Milestone 1)
**Items:** LLM-parse grant descriptions into structured JSON

- For each grant with description >200 chars, extract: required_entity_types, required_certifications, geographic_restrictions, matching_funds_pct, required_experience_level, target_beneficiaries, allowable_costs, period_of_performance
- Store in new `grant_extracted_criteria` JSONB column on grant_sources
- Feed extracted fields into hard filters (replacing current empty-field-passes-everything behavior)
- **Measure:** Count grants with populated eligibility_types before/after. Goal: >90% coverage.
- **Unlocks:** Milestone 6 (three-state filters) — needs extracted data to distinguish "explicitly allowed" from "not mentioned"

### Week 7-8: Three-State Hard Filters (Milestone 6)
**Items:** Convert binary pass/fail to match/mismatch/unknown

- Currently: null field = pass (lenient). Change to: null = "unknown" (lower confidence score, not rejected)
- Add `filter_confidence` field to match results: "verified" (both sides have data), "assumed" (one side missing), "unknown" (no data)
- Show confidence in UI: "✓ Verified match" vs "⚠ Unverified — complete your profile for better accuracy"
- **Measure:** Track % of matches with "verified" vs "assumed" status. Goal: >60% verified.
- **Unlocks:** Trust & transparency improvements

### Week 9-10: LLM Re-Ranking (Milestone 3)
**Items:** Top 20 matches get LLM scoring + natural language explanations

- After weighted scoring produces top 50, take top 20 and send to GPT-4o-mini with org profile + grant details
- LLM produces: relevance score (1-100), 2-sentence explanation, top concern, recommended action
- Replace generic "Matched by semantic similarity" with specific "This grant funds workforce training programs for small businesses in Florida — your project to hire 20 employees directly aligns with their priority to create jobs in underserved communities."
- **Measure:** User satisfaction survey on match explanations. A/B test: factual criteria vs LLM explanation.
- **Cost:** ~$0.02 per match run (20 grants × GPT-4o-mini)
- **Unlocks:** Milestone 12 (agentic assistant) — needs quality explanations as foundation

### Week 11-12: Application Tracking + Outcomes (Milestone 9)
**Items:** Users mark applied/awarded/rejected on pipeline grants

- Add outcome tracking to grant_pipeline: applied_date, outcome (awarded/rejected/withdrawn), amount_awarded, rejection_reason
- Build outcome dashboard showing win rate, average award, time-to-decision
- Feed outcomes back into competitiveness scoring: "3 of 5 users who applied to this grant were awarded"
- **Measure:** Track outcome submission rate. Goal: >30% of pipeline grants have outcomes recorded within 90 days.
- **Unlocks:** Milestone 10 (historical pattern matching) — needs outcome data

---

## PART 2: MILESTONE-BY-MILESTONE READINESS

### Milestone 1: Structured Criteria Extraction
| Field | Value |
|---|---|
| Prerequisites met | Partial — grant descriptions exist, enrichment cron exists |
| Blocking items | Need extraction prompt + new JSONB column + ingestion into hard filters |
| Effort | L (10 days) |
| Impact on match accuracy | 8 — most grants have empty eligibility fields; extraction fills them |
| Impact on user experience | 5 — users see fewer irrelevant matches |
| Cost to build | $0 (engineering time only) |
| Cost to operate | ~$3/month (GPT-4o-mini extraction for new grants) |
| Risk level | Low — extraction is additive, doesn't break existing |
| Data-dependent | Yes — needs grants with >200 char descriptions |
| Unlocks | Milestone 6 (three-state filters), Milestone 3 (LLM re-ranking) |

### Milestone 2: Multi-Facet Embeddings
| Field | Value |
|---|---|
| Prerequisites met | Partial — code exists but profile facet is placeholder |
| Blocking items | purpose_embedding not populated for grants, vector recall profile facet is table scan |
| Effort | M (4 days) |
| Impact on match accuracy | 7 — activates "who you are" dimension separate from "what you do" |
| Impact on user experience | 4 — better ranking, not visible UX change |
| Cost to build | $0 |
| Cost to operate | ~$2 one-time backfill + $0.50/month for new grants |
| Risk level | Low — additive to existing |
| Data-dependent | No — uses existing org + grant data |
| Unlocks | Better ranking across all queries |

### Milestone 3: LLM-as-Judge Re-ranking
| Field | Value |
|---|---|
| Prerequisites met | Partial — AI engines exist, match pipeline exists |
| Blocking items | Need re-ranking step after weighted scoring, before display |
| Effort | L (8 days) |
| Impact on match accuracy | 6 — LLM catches nuances hard filters miss |
| Impact on user experience | 8 — natural language explanations are product-defining |
| Cost to build | $0 |
| Cost to operate | ~$4/month (20 grants × $0.02 × 200 users) |
| Risk level | Medium — LLM quality varies, need fallback |
| Data-dependent | No |
| Unlocks | Milestone 12 (agentic assistant) |

### Milestone 4: Grant-Side Enrichment
| Field | Value |
|---|---|
| Prerequisites met | Yes — USAspending client exists, enrichment cron exists |
| Blocking items | Only 3 grants have CFDA numbers for USAspending; need more CFDA coverage |
| Effort | M (5 days) |
| Impact on match accuracy | 4 — competitiveness scoring helps but doesn't change which grants match |
| Impact on user experience | 6 — "12 awards last year" is valuable context |
| Cost to build | $0 |
| Cost to operate | $0 (USAspending API is free) |
| Risk level | Low |
| Data-dependent | Yes — needs CFDA numbers populated |
| Unlocks | Milestone 10 (historical pattern matching) |

### Milestone 5: Company-Side Enrichment
| Field | Value |
|---|---|
| Prerequisites met | Yes — company-enrichment.ts exists, enrich-profile endpoint exists |
| Blocking items | Requires user to provide website URL; not all users will |
| Effort | S (1 day) — already built |
| Impact on match accuracy | 4 — fills profile gaps but only for users with websites |
| Impact on user experience | 5 — "Auto-fill from website" is a nice UX feature |
| Cost to build | $0 (already built) |
| Cost to operate | ~$0.02 per enrichment |
| Risk level | Low |
| Data-dependent | Yes — needs website_url populated |
| Unlocks | Better profile completeness → better matching |

### Milestone 6: Three-State Hard Filters
| Field | Value |
|---|---|
| Prerequisites met | Partial — hard filter returns FilterResult with pass/reason, but no "unknown" state |
| Blocking items | Need extracted criteria (Milestone 1) to distinguish "allowed" from "not mentioned" |
| Effort | M (5 days) |
| Impact on match accuracy | 7 — transforms null-means-pass into null-means-uncertain |
| Impact on user experience | 6 — confidence indicators help users trust results |
| Cost to build | $0 |
| Cost to operate | $0 |
| Risk level | Medium — changing filter behavior could reduce match count |
| Data-dependent | Yes — needs Milestone 1 for meaningful "unknown" vs "verified" |
| Unlocks | Trust & transparency |

### Milestone 7: Progressive Profiling Expansion
| Field | Value |
|---|---|
| Prerequisites met | Partial — DeferredQuestionPrompt component exists, only TRL wired |
| Blocking items | Need more deferred questions defined + wired to grant detail pages |
| Effort | M (3 days) |
| Impact on match accuracy | 3 — fills niche fields over time |
| Impact on user experience | 5 — contextual questions feel intelligent |
| Cost to build | $0 |
| Cost to operate | $0 |
| Risk level | Low |
| Data-dependent | No |
| Unlocks | Better profile completeness for niche grants |

### Milestone 8: Feedback Capture
| Field | Value |
|---|---|
| Prerequisites met | Partial — feedback stored but not used |
| Blocking items | Need to read match_feedback in ranking; add dismiss reason capture |
| Effort | M (3 days) |
| Impact on match accuracy | 6 — dismissed grants excluded, saved grants boosted |
| Impact on user experience | 7 — matches improve over time based on user behavior |
| Cost to build | $0 |
| Cost to operate | $0 |
| Risk level | Low |
| Data-dependent | Yes — needs feedback volume (at least 50+ interactions per org) |
| Unlocks | Milestone 11 (learned weights) |

### Milestone 9: Application Tracking & Outcomes
| Field | Value |
|---|---|
| Prerequisites met | Partial — pipeline exists with 8 stages, but no outcome tracking |
| Blocking items | Need outcome fields on pipeline, outcome dashboard |
| Effort | L (8 days) |
| Impact on match accuracy | 3 (short-term) / 8 (long-term with pattern matching) |
| Impact on user experience | 7 — win/loss tracking is high engagement |
| Cost to build | $0 |
| Cost to operate | $0 |
| Risk level | Low |
| Data-dependent | Yes — needs users to report outcomes |
| Unlocks | Milestone 10 (historical patterns) |

### Milestone 10: Historical Pattern Matching
| Field | Value |
|---|---|
| Prerequisites met | No — needs outcome data (Milestone 9) and USAspending winner profiles |
| Blocking items | No outcome data yet; USAspending recipient data not integrated |
| Effort | XL (3+ weeks) |
| Impact on match accuracy | 9 — "orgs like you won this grant" is transformational |
| Impact on user experience | 8 — win probability based on real data |
| Cost to build | $0 |
| Cost to operate | ~$5/month (USAspending queries) |
| Risk level | High — requires significant data volume |
| Data-dependent | Yes — needs 100+ outcomes |
| Unlocks | Milestone 11 (learned weights) |

### Milestone 11: Learned Weights
| Field | Value |
|---|---|
| Prerequisites met | No — needs feedback data (Milestone 8) + outcomes (Milestone 9) |
| Blocking items | No ML pipeline, no training data, no A/B testing framework |
| Effort | XL (4+ weeks) |
| Impact on match accuracy | 8 — weights tuned to actual user preferences |
| Impact on user experience | 4 — invisible improvement |
| Cost to build | $0 |
| Cost to operate | ~$10/month (training compute) |
| Risk level | High — ML requires data volume and expertise |
| Data-dependent | Yes — needs 1000+ feedback signals |
| Unlocks | Continuously improving matching |

### Milestone 12: Agentic Application Assistant
| Field | Value |
|---|---|
| Prerequisites met | Partial — AI writing engine exists (8 modules in src/lib/ai/writing/) |
| Blocking items | Need reliable match explanations (Milestone 3), outcome tracking (Milestone 9) |
| Effort | XL (4+ weeks) |
| Impact on match accuracy | 2 — doesn't improve matching, improves conversion |
| Impact on user experience | 10 — auto-draft applications is product-defining |
| Cost to build | $0 |
| Cost to operate | ~$20/month (heavy GPT-4o usage) |
| Risk level | High — quality control on generated applications |
| Data-dependent | Yes — needs winning application examples |
| Unlocks | Premium tier value proposition |

---

## PART 3: NON-MILESTONE OPPORTUNITIES

| # | Improvement | Accuracy | UX | Effort | ROI | Detail |
|---|---|---|---|---|---|---|
| A | **Unify dedup across sources** | 5 | 3 | S (1d) | 8.0 | Three conflicting dedup keys. One canonical hash fixes cross-source duplicates. |
| B | **Fix 4 unused hard-filter fields** | 3 | 2 | S (0.5d) | 10.0 | has_501c3, has_sam_registration, has_audit, years_operating loaded but never checked. Wire them or remove. |
| C | **Add dismiss reason capture** | 2 | 5 | S (1d) | 7.0 | When user dismisses, ask "why?" (wrong industry, not eligible, too competitive, other). Feeds into learned weights. |
| D | **Fix keyword fallback ranking** | 4 | 3 | S (1d) | 7.0 | Keyword search returns all results with similarity=0.5. Add keyword relevance scoring. |
| E | **Add more deferred questions** | 3 | 5 | M (2d) | 4.0 | Only TRL is wired. Add SAM, audit, certifications as deferred prompts on grant detail. |
| F | **Populate CFDA numbers from Grants.gov** | 3 | 2 | S (1d) | 5.0 | Only 3 grants have CFDA. Grants.gov provides cfda_list — ensure all are captured. |
| G | **Add confidence indicator to matches** | 1 | 6 | M (3d) | 2.3 | Show "Verified match" vs "Partial match — complete your profile" based on data completeness. |
| H | **Budget ratio filter too lenient** | 2 | 1 | S (0.5d) | 6.0 | Currently allows grants with min_award = 10x budget. Should be 5x or absolute cap. |
| I | **Error monitoring (Sentry)** | 0 | 3 | S (1d) | 3.0 | No error aggregation. Silent failures undetected. |
| J | **Add test suite for matching engine** | 0 | 0 | L (10d) | 0.0 | Zero tests. Critical for refactoring confidence but no user-facing impact. |
| K | **Stale grant cleanup frequency** | 2 | 2 | S (0.5d) | 8.0 | validate-grants runs daily but only checks deadline. Add check for grants not updated in 180+ days. |
| L | **robots.txt checking in web crawler** | 0 | 0 | S (0.5d) | 0.0 | Legal risk mitigation. No accuracy/UX impact but reduces scraping liability. |
| M | **Worker deployment verification** | 0 | 2 | S (0.5d) | 4.0 | Confirm worker is running. Email sequences and background jobs may be stuck. |

---

## PART 4: ROI RANKING (All Items Combined)

ROI = (Accuracy + UX) / Effort_days

| Rank | Item | Type | Accuracy | UX | Effort Days | ROI |
|------|------|------|----------|-----|-------------|-----|
| 1 | Fix 4 unused hard-filter fields (B) | Non-milestone | 3 | 2 | 0.5 | 10.0 |
| 2 | Unify dedup across sources (A) | Non-milestone | 5 | 3 | 1 | 8.0 |
| 3 | Stale grant cleanup (K) | Non-milestone | 2 | 2 | 0.5 | 8.0 |
| 4 | Add dismiss reason capture (C) | Non-milestone | 2 | 5 | 1 | 7.0 |
| 5 | Fix keyword fallback ranking (D) | Non-milestone | 4 | 3 | 1 | 7.0 |
| 6 | Budget ratio filter (H) | Non-milestone | 2 | 1 | 0.5 | 6.0 |
| 7 | Populate CFDA numbers (F) | Non-milestone | 3 | 2 | 1 | 5.0 |
| 8 | **Use feedback in ranking (M8)** | Milestone 8 | 6 | 7 | 3 | 4.3 |
| 9 | Add more deferred questions (E) | Non-milestone | 3 | 5 | 2 | 4.0 |
| 10 | Worker deployment check (M) | Non-milestone | 0 | 2 | 0.5 | 4.0 |
| 11 | Error monitoring (I) | Non-milestone | 0 | 3 | 1 | 3.0 |
| 12 | **Activate purpose_embedding (M2)** | Milestone 2 | 7 | 4 | 4 | 2.75 |
| 13 | **Three-state hard filters (M6)** | Milestone 6 | 7 | 6 | 5 | 2.6 |
| 14 | **Company enrichment (M5)** | Milestone 5 | 4 | 5 | 1 | 9.0* |
| 15 | Confidence indicator (G) | Non-milestone | 1 | 6 | 3 | 2.3 |
| 16 | **Progressive profiling (M7)** | Milestone 7 | 3 | 5 | 3 | 2.7 |
| 17 | **Grant enrichment expansion (M4)** | Milestone 4 | 4 | 6 | 5 | 2.0 |
| 18 | **LLM re-ranking (M3)** | Milestone 3 | 6 | 8 | 8 | 1.75 |
| 19 | **Structured extraction (M1)** | Milestone 1 | 8 | 5 | 10 | 1.3 |
| 20 | **Application tracking (M9)** | Milestone 9 | 3 | 7 | 8 | 1.25 |
| 21 | Test suite (J) | Non-milestone | 0 | 0 | 10 | 0.0 |
| 22 | robots.txt checking (L) | Non-milestone | 0 | 0 | 0.5 | 0.0 |
| 23 | **Historical patterns (M10)** | Milestone 10 | 9 | 8 | 21 | 0.81 |
| 24 | **Learned weights (M11)** | Milestone 11 | 8 | 4 | 28 | 0.43 |
| 25 | **Agentic assistant (M12)** | Milestone 12 | 2 | 10 | 28 | 0.43 |

*M5 already built — ROI is technically infinite but listed as 9.0 since it needs user action to trigger.

---

## PART 7: RED FLAGS

### RED FLAG 1: Multi-Facet Profile Recall is Dead Code (CRITICAL)
**File:** `src/lib/matching/vector-recall.ts:80-86`
**Issue:** Lines 80-86 select from `grant_sources` WITHOUT vector search. Comment says "Full implementation would use purpose_embedding column." The profile facet of multi-facet recall is a full table scan pretending to be vector search.
**Impact:** 40% of the multi-facet scoring signal is noise. Every match run wastes a DB query.
**Fix:** 4 days — populate purpose_embedding, update query to use `<=>` operator.
**Does this change the plan?** No — it's already item #1 on the roadmap. But it should be communicated honestly: the "multi-facet embedding" feature marketed in the product is half-implemented.

### RED FLAG 2: Three Dedup Strategies = Potential Duplicates
**File:** refresh-grants (external_id), crawl-sources (name+funder), validate-grants (name+funder)
**Issue:** A grant from Grants.gov and the same grant crawled from a state website could both exist with different metadata.
**Impact:** Users may see the same grant twice with different scores, deadlines, or descriptions.
**Fix:** 1 day — add canonical dedup key.
**Does this change the plan?** No — it's item #2 on the roadmap.

### RED FLAG 3: No Test Suite
**Impact:** Cannot refactor matching logic with confidence. Any change to hard-filter.ts or weighted-score.ts could break matching for all users with no detection.
**Fix:** 10 days for comprehensive suite.
**Does this change the plan?** Not for accuracy, but critical before any white-label or acquisition deal.

---

*Report generated from codebase analysis. All file paths and line numbers reference the current state of the repository.*
