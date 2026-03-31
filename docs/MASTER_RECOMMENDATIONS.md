# GrantIQ Master Recommendations — All 6 Agents Combined

## Top 20 Priorities (Ranked by Impact × Feasibility)

### IMMEDIATE (This Week)

1. **Parallelize dashboard queries** — 10 sequential DB calls → 1 Promise.all. 3-5x faster dashboard. (Architect P0)
2. **Add OpenAI billing** — Unblocks ALL AI features. $10 enables embeddings for 2,344 grants. (Blocker)
3. **Build programmatic SEO pages** — /grants/healthcare, /grants/texas, etc. 5,000+ indexable pages from existing data. Single biggest growth lever. (Growth)
4. **Reduce onboarding to 5 core steps** — Move 10 steps to "Strengthen Your Profile" dashboard card. Increase completion 40%→75%. (UX)
5. **Submit sitemap to Google Search Console** — Site not indexed. Zero organic traffic until done. (Growth)

### NEXT 2 WEEKS

6. **Post-award compliance tracker** — Add stages: Awarded → Active → Reporting Due → Renewal → Closed. Nobody does this. Multi-year retention. (Product)
7. **Full-text search on grant_sources** — Add tsvector column + GIN index. Enables Grant Library search. (Architect)
8. **Grantie chat: route simple queries to Haiku** — 80% cost savings on chat. (AI)
9. **Cache readiness + match scores** — Skip re-computation when profile unchanged. (AI)
10. **Score calibration** — Add anchoring examples to prompts + post-LLM normalization to fix 65-80 clustering. (AI)

### NEXT MONTH

11. **Grant Library browsable database** — All 2,344 grants searchable with advanced filters (type, state, amount, deadline, keyword). Free users see basic info, paid see full details + AI scores. (Design)
12. **Qualification Scorecard** — 9 criteria, hybrid AI + user. Pre-fill 6 criteria from existing data (zero AI calls). User fills 3 judgment calls. (Design + AI)
13. **Grant Calendar** — 12-month view with deadlines, fiscal cycle, work-back timelines, proactive alerts. (Design)
14. **Document Vault** — Smart storage with Claude Vision extraction from 990s, audits, 501c3 letters. Auto-updates org profile. (Design + AI)
15. **Weekly personalized digest email** — New matches, upcoming deadlines, one action recommendation. Highest retention ROI. (Product)

### NEXT QUARTER

16. **Application checklist auto-generation** — When user pursues a grant, cross-reference requirements with document vault. "Ready to Apply" / "Missing 2 docs". (Product)
17. **Funder Intelligence profiles** — 990 data + giving patterns + past grantees. Turns search into strategy. (Product)
18. **Re-ranking stage** — Cohere rerank between vector recall and LLM scoring. Better matches, lower cost. (AI)
19. **Subscription pricing model** — Free / Starter $49 / Pro $149 / Enterprise $499. Per-use pricing caps revenue. (Revenue)
20. **Embeddable Grant Finder widget** — Partners (SCORE, SBDCs) embed on their sites. 500-2,000 signups/month. (Growth)

---

## Feature-Gating by Tier

| Feature | Free | Starter $49 | Pro $149 | Enterprise $499 |
|---------|:---:|:---:|:---:|:---:|
| Grant Library browsing | Basic info | Full details | Full + AI scores | Full + API |
| AI Matches | Top 5 only | Unlimited | Unlimited | Unlimited |
| Qualification Scorecard | — | 3/month | Unlimited | Unlimited |
| Pipeline | 1 grant | 10 grants | Unlimited | Unlimited |
| Calendar | Deadlines only | + Fiscal cycle | + Work-back + alerts | + Team calendar |
| Document Vault | — | 5 docs | Unlimited + AI extraction | Unlimited |
| AI Writing | — | — | 1/month included | 5/month included |
| Team members | 1 | 2 | 5 | Unlimited |
| Weekly Digest | 3 grants | Full | Full + priority | Full + custom |
| Compliance Tracker | — | — | Included | Included |

---

## Architecture Quick Wins

| Fix | Effort | Impact |
|-----|--------|--------|
| `Promise.all` on dashboard queries | 1 hour | 3-5x faster |
| React `cache()` to deduplicate org lookup | 2 hours | -1 query per page |
| Select specific columns (drop `*`) on matches | 15 min | -600KB transfer |
| Create `get_dashboard_stats` RPC | 2 hours | 4 queries → 1 |
| Worker concurrency (3 parallel jobs) | 3 hours | 3x throughput |
| HNSW vector index on grant_sources | 30 min | Faster matching at scale |
| Postgres full-text search column | 4 hours | Enables Grant Library |

---

## AI Cost Savings

| Change | Savings |
|--------|---------|
| Route simple Grantie queries to Haiku | ~80% on chat |
| Cache readiness scores (hash-based) | ~90% on repeat assessments |
| Cache match results (24hr TTL) | ~70% on re-visits |
| Use Sonnet for Tier 1 writing (not Opus) | ~80% per draft |
| Add Cohere re-ranking before LLM scoring | ~50% on scoring (fewer batches) |

---

## Growth Projections

| Channel | Month 3 | Month 6 | Month 12 |
|---------|---------|---------|----------|
| Programmatic SEO | +200 | +800 | +2,000 |
| Referral Program | +30 | +100 | +300 |
| Partnerships (SCORE, SBDCs) | +50 | +300 | +1,000 |
| Viral Loops | +15 | +80 | +250 |
| Content/Blog | +10 | +50 | +200 |
| **Total Monthly Signups** | **~425** | **~1,780** | **~4,850** |

At 5% conversion, ~$50/mo average: **$12K MRR by month 12** from organic alone.

---

## Revenue Model (Year 1)

| Stream | Month 6 MRR | Month 12 MRR | Year 1 Total |
|--------|-------------|-------------|-------------|
| Starter ($49) | $2,450 | $4,900 | $26K |
| Pro ($149) | $7,450 | $14,900 | $66K |
| Enterprise ($499) | $4,990 | $9,980 | $44K |
| AI Writing | $3,500 | $8,750 | $55K |
| Consulting referrals | $4,000 | $9,500 | $48K |
| Formation packages | $2,500 | $5,000 | $28K |
| **Total** | **$24,890** | **$53,030** | **$267K** |

---

*Compiled from: Product Manager, Software Architect, UX Researcher, AI Engineer, Business Analyst, Growth Hacker analyses.*
