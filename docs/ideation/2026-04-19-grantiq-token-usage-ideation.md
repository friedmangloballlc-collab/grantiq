---
date: 2026-04-19
topic: grantiq-token-usage
focus: reducing LLM/AI token usage and cost across 34 services
mode: repo-grounded
---

# Ideation: GrantIQ Token Usage & AI Cost Control

## Grounding Context

**Codebase shape:** Next.js 16 + TypeScript + Supabase + Vercel + a worker service. Dual AI provider setup via `@anthropic-ai/sdk` (Sonnet 4 / Opus 4 on writing + audit) and OpenAI (gpt-4o / gpt-4o-mini on scoring, matching, readiness). 34 AI services, 6,356 grants, about to launch (code complete, pending Stripe keys).

**Token-cost pain points observed:**
- 11 large system prompts (~178 lines each) re-sent every call, no prompt caching anywhere
- Verbose user-message context re-serialized per call — full org profile JSON, grant metadata, 990 data, award history
- Org profile duplicated ~50x across a single match sweep
- Per-section sequential calls in `draft-generator.ts` (6 sections × ~6K tokens = ~36K per proposal)
- Retry loops re-send full context on schema failures (funder-analyzer, review-simulator)
- Example inlining: 3-5 examples × 500-1000 tokens re-sent per section
- No model-tier router — hardcoded model per service
- `ai_usage` + `ai_generations` tables + `estimateCostCents()` exist, but no real-time budget enforcement

**Relevant files:** `src/lib/ai/client.ts`, `src/lib/ai/call.ts`, `src/lib/ai/prompts/*.ts`, `src/lib/ai/writing/draft-generator.ts`, `src/lib/ai/services/diagnostic-parallel.ts`.

**Prior art leaned on:** Anthropic prompt caching (90% discount on reads, ProjectDiscovery hit 85% cache rate → 59-70% bill cut). RouteLLM classifier routing (85% cost cut keeping 95% quality). LLMLingua 2-5x prompt compression. Batch API 50% discount. Pricing (2026): Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15, Opus 4.7 $5/$25 per M tokens. Semantic caching (Redis LangCache) 73% savings on repeat workloads.

## Ranked Ideas

### 1. Unified LLMGateway + task-level model router
**Description:** Single `gateway.invoke({promptId, vars, tier, budgetScope, lane})` function replaces direct SDK usage across all 34 services. Owns: provider selection, `cache_control` headers, Haiku→Sonnet→Opus tiering, Langfuse logging, retry policy, batch-queue routing, budget pre-checks. Ship a minimal eval harness (20-50 golden pairs per promptId, LLM-judge + regex for structured outputs) alongside so downgrades are safe.
**Rationale:** Foundational. Once every service flows through one function, every downstream optimization (caching, tiering, batch, compression, budgets, observability) lands as O(1) changes instead of O(34). Pre-launch timing makes this cheap; post-launch retrofit costs 5-10x more. Also the natural home for the eval harness that unlocks safe Sonnet→Haiku migrations (3x cost cut per service per RouteLLM benchmark).
**Downsides:** 1-2 weeks of refactor across 34 services before any direct savings. Test surface grows. Risk of latency in the hot path if the wrapper is careless.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Explored

### 2. Anthropic prompt caching + canonical OrgProfileHandle
**Description:** Restructure each of the 11 system prompts so invariant rules form a long stable prefix and dynamic per-call content lives at the tail — ProjectDiscovery's "relocation trick." Add `cache_control: ephemeral` breakpoints at the prefix boundary. Build a canonical `OrgProfileHandle` — one versioned, hash-keyed org doc (~2-4k tokens, deterministic ordering, compressed 990 + award history) that every service injects as the first cached block. No more per-service ad-hoc context assembly.
**Rationale:** Single biggest one-shot cost cut in the backlog. ProjectDiscovery went 4.2% → 73.7% cache hit in one deploy = 59-70% blended bill cut. OrgProfileHandle is the prerequisite that makes caching actually stick across services. 50-match sweeps go from $0.15 to $0.015.
**Downsides:** Needs prompt-authoring discipline going forward (dynamic content cannot drift into the prefix). Requires hash/versioning scheme for OrgProfileHandle. Hard to verify cache hit rate without observability (pair with #1).
**Confidence:** 95%
**Complexity:** Medium
**Status:** Unexplored

### 3. Embeddings-first grant matching (LLM only on "Explain")
**Description:** Precompute pgvector embeddings for all 6,356 grants (one-time ≈$0.02 in text-embedding-3-small). Run `OrgProfileHandle` through LLM once to emit a structured "ideal-grant fingerprint" (embedding + weighted criteria vector). Default match path = cosine similarity + deterministic rule filters, zero LLM. LLM only fires on user-clicked "Explain why this matches."
**Rationale:** Matching is likely the highest-volume AI service. Collapses O(orgs × grants) LLM calls to O(orgs) embedding calls. Embeddings cost ~$0.02/M tokens vs $3-15/M for chat — 150-750x ratio per scored grant. Also makes a GrantIQ Lite tier possible and doubles as a pre-filter for downstream LLM calls.
**Downsides:** Matching-quality regression risk; needs eval goldens before cutover. pgvector schema migration. User-visible explanations get gated behind a click.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 4. One-shot multi-section draft via structured output
**Description:** Rewrite `src/lib/ai/writing/draft-generator.ts` from per-section sequential calls into a single structured-output call (Anthropic tool use / JSON mode) that returns `{exec_summary, need_statement, methods, evaluation, budget_narrative, sustainability}` in one shot. Full context sent once. Non-urgent sections default to Batch lane (50% off) when UX allows.
**Rationale:** Largest per-invocation win in the product. Proposal today ≈36K tokens → ≈12K one-shot = 67% cut. Structured output also eliminates retry storms because schema validation happens in the model.
**Downsides:** Loses per-section streaming granularity. Cross-section coherence risk on first runs (also a potential improvement). Requires schema stability.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 5. "Does this need an LLM?" audit across 34 services
**Description:** Walk every AI service in `src/lib/ai/services/*` and classify: (a) deterministic — replace with TS logic on structured fields (readiness, eligibility, deadlines, budget validation); (b) classification — rules + distilled mini-model, LLM only on ambiguous ≈5%; (c) generation — keep LLM, tier via Gateway. Readiness scoring is the canonical example: deterministic rubric + Mad Libs explanation, zero LLM.
**Rationale:** Cheapest token is the one never sent. Likely 15+ of the 34 services are classifier/extractor shaped — worst possible fit for Sonnet/Opus. Removing LLM from 10+ services likely cuts platform spend 30-50% with zero quality loss. Matches aggressive-monetization preference by turning variable LLM cost into fixed compute.
**Downsides:** Each service needs its own replacement logic + tests. Some "classification" services have edge cases that need reasoning. Requires ongoing discipline against LLM-by-reflex on new services.
**Confidence:** 85%
**Complexity:** High (many small changes)
**Status:** Unexplored

### 6. Real-time per-org token budget ceiling + observability spine
**Description:** Pre-flight gate in Gateway (`call.ts`) reads rolling 24h spend per (org_id, feature) from `ai_usage`. Under soft cap → proceed; soft-to-hard → auto-downgrade tier (Sonnet→Haiku); over hard → reject or queue to batch. Pair with Langfuse + LiteLLM observability surfacing per-prompt/model/org spend, cache hit-rate, drift alerts. `TokenBudget` becomes a first-class session primitive.
**Rationale:** Existential for margin. Today one adversarial or runaway user on a $49 plan can make 10,000 Opus calls and burn through quarterly margin before anyone notices. Turns pricing from guess into contract. Observability is the data backbone that makes every other optimization legible.
**Downsides:** False positives on legit heavy users (needs tunable caps per plan tier). Downgrade path must be tested. Langfuse + LiteLLM are added dependencies.
**Confidence:** 92%
**Complexity:** Medium
**Status:** Unexplored

### 7. AI Credits as visible product surface
**Description:** Surface token spend as "GrantIQ Credits." Each plan tier gets N credits/month; each service has transparent credit cost (match sweep = 5, draft section = 10, full proposal = 50, Opus audit = 100). Visible balance in header, per-action cost preview, overage top-ups at premium margin, optional rollover. Default outputs favor Compact verbosity; users opt into Full/Premium and pay for it.
**Rationale:** Reframes cost from engineering problem to revenue lever — matches aggressive-monetization preference. Top 1% of users currently subsidize infra out of margin; Credits make them pay. Also creates honest upgrade pressure and a natural place to monetize verbose/Opus modes.
**Downsides:** Product redesign scope — touches pricing page, billing, UI, onboarding. Users resent visible meters done badly. Requires reliable pre-call cost estimation (depends on #6). Risks stingy-feel vs "unlimited AI" competitor pitches.
**Confidence:** 75%
**Complexity:** High
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Three-tier cache stack (exact + semantic + origin) | Premature at current scale; build after Gateway + prompt-cache land and observability proves cache-miss patterns. |
| 2 | Content-addressable cross-tenant prompt dedupe | Correctness/privacy risk — serving org A's response to org B is high blast radius. Defer until volume justifies eval investment. |
| 3 | RTB-style auction between providers | Overengineered at current scale; Gateway router captures main arbitrage. Revisit at 10x volume. |
| 4 | Diff-based audit | Niche (audit service only); becomes cheap after #1. Park as follow-up. |
| 5 | Streaming for long-form generation | UX win, not a direct token win; cost story is indirect. Bundle with #4 work. |
| 6 | Retry-storm circuit breaker as standalone | Absorbed into #1 Gateway — retry policy lives in `call.ts`. |
| 7 | Prompt registry as standalone | Absorbed into #1 — promptId is a Gateway parameter. |
| 8 | Batch queue worker as standalone | Absorbed into #1 — `lane: 'batch'` parameter. |
| 9 | Nightly precompute of top-grant narratives × personas | Low cache-hit-rate risk; storage + invalidation complexity. Revisit after #3 ships with real distribution data. |
| 10 | JIT pull-based matching with Kanban WIP cap | Partially solved by #3; defer WIP-cap layer. |
| 11 | LLMLingua prompt compression | Prerequisite = eval harness (part of #1). Park as #1's first post-landing optimization. |
| 12 | 500-token prompt hard ceiling | Aspirational outcome, not an action; real levers are #2 + compression. |
| 13 | "No-AI" free tier as separate product line | Product redesign scope; overlaps with #7. Better as dedicated brainstorm. |
| 14 | Hash-and-cache 990 org card as standalone | Absorbed into #2 OrgProfileHandle. |
| 15 | Real-time token meter as standalone UI | Absorbed into #7 Credits. |
| 16 | Audit — delete readiness LLM specifically | Absorbed into #5 as canonical example. |
| 17 | Inline-example retrieval as standalone | Absorbed into #2 (cached examples in stable prefix; retrieval pulls top-K). |

## Rollout Order (converged in conversation)

1. **Week 1:** Ship thin Gateway wrapping top 3 services (matching, draft-generator, readiness) — pass-through + `cache_control` support + token counting + promptId tagging. Land #2 prompt caching for those 3. Expect 50-70% savings in days.
2. **Week 2:** Migrate remaining 31 services to Gateway. Add #6 budget ceiling.
3. **Week 3+:** Tiering, #3 embeddings matching, #4 one-shot drafts, #5 service audit, #7 Credits product surface.
