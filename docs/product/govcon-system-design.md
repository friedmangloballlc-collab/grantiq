# GovCon System Design — How Everything Works Together

## Overview

GrantIQ expands from grants-only to a full **Government Funding Platform** covering both grants AND government contracts. The GovCon module uses the same AI matching, pipeline, and readiness infrastructure but adds contract-specific features.

---

## User Journey: Grant Client vs GovCon Client

### Grant Client Journey (existing)
```
Signup → Onboarding (15 questions) → AI Match to 2,344 grants → Dashboard → Pipeline → AI Writing → Submit Application
```

### GovCon Client Journey (new)
```
Signup → Onboarding (detects for-profit/LLC) → GovCon Assessment → Certification Roadmap → Contract Matching → Bid/No-Bid Analysis → Proposal Pipeline → Capability Statement Builder → Submit Bid
```

### Combined Journey (both)
```
Signup → Onboarding → System detects org type:
  ├── Nonprofit → Grant matching flow (existing)
  ├── For-profit + qualifies for grants → Grant matching + GovCon matching
  └── For-profit + contracts focus → GovCon flow with optional grants
```

---

## New Dashboard Tabs

The dashboard gets a tab selector: **Grants | Contracts | Both**

### Tab 1: Grants Dashboard (existing)
- Stats (matches, pipeline, readiness)
- A-Z Qualification
- Industry Insights
- Today's Focus
- Service Tracker

### Tab 2: Contracts Dashboard (new)
Shows these cards:

#### 1. GovCon Readiness Score
Like the grant A-Z qualification but for government contracting:

| Criteria | What It Checks | Source |
|----------|---------------|--------|
| SAM.gov Registration | Active registration with UEI | Certifications Guide |
| NAICS Codes | Correct codes selected for their industry | NAICS & Size Standards |
| Size Standard | Under SBA size standard for their NAICS | NAICS & Size Standards |
| SBA Certifications | 8(a), HUBZone, WOSB, SDVOSB status | Set-Aside Programs |
| Past Performance | CPARS/PPIRS entries | Past Performance DB |
| GSA Schedule | On GSA MAS or other vehicles | Contract Vehicles |
| Capability Statement | Has one-page cap statement | Capability Statement |
| CMMC/Cyber Compliance | CMMC level for DOD work | CMMC & Cyber Certs |
| Bonding/Insurance | Has required bonds | Bonding & Insurance |
| Cost Accounting | DCAA-ready accounting | Cost Accounting Guide |

#### 2. Contract Pipeline
Similar to the grant pipeline Kanban but with contract-specific stages:
- **Tracking** — Monitoring a solicitation
- **Bid Decision** — Running Bid/No-Bid analysis
- **Teaming** — Finding partners/subs
- **Writing** — Drafting proposal
- **Submitted** — Bid submitted
- **Under Review** — Awaiting award decision
- **Won / Lost**

#### 3. Upcoming Opportunities
AI-matched contract opportunities from SAM.gov, filtered by:
- NAICS codes
- Set-aside eligibility
- Agency preferences
- Past performance requirements
- Contract vehicle access
- Geographic preference

#### 4. Certification Tracker
Visual roadmap showing which certifications the company has, which are in progress, and which to pursue next:
- SAM.gov ✓
- UEI ✓
- Small Business (SB) ✓
- 8(a) → In Progress
- HUBZone → Not Started
- WOSB → Not Applicable
- SDVOSB → Not Started
- GSA Schedule → Recommended
- CMMC Level 1 → Not Started

#### 5. Federal Fiscal Calendar
Shows where we are in the federal budget cycle (Oct 1 - Sep 30):
- Current month highlighted
- Opportunity levels (Q4 Aug-Sep = "Use it or lose it" spending surge)
- Key dates (budget submissions, continuing resolutions)
- Strategy recommendations per month

#### 6. Bid/No-Bid Analyzer
AI-powered decision tool for each opportunity:
- Scores opportunity on 10 criteria (from Bid-No Bid Checklist)
- Green/Yellow/Red recommendation
- Win probability estimate
- Resource requirements estimate
- Competitive landscape analysis

#### 7. Capability Statement Builder
Guided tool to create a one-page capability statement:
- Core Competencies (4-6 bullets)
- Past Performance (3-5 contracts)
- Differentiators
- Company Data (NAICS, CAGE, UEI, certs)
- Contact info
- Generates a professional PDF

#### 8. Subcontracting Opportunities
Shows prime contractors looking for subs in the company's NAICS codes:
- Top 100 GovCon prime contractors
- Their subcontracting goals
- How to find their subcontracting portals
- Teaming arrangement guidance

---

## How The Systems Work Together

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────┐
│                 USER ONBOARDING                      │
│  (Org type, industry, NAICS, certifications, etc.)  │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  Organization        │
    │  Profile              │
    │  (Supabase)           │
    └──────┬───────┬───────┘
           │       │
    ┌──────▼──┐  ┌─▼────────┐
    │ Grant    │  │ GovCon   │
    │ Matching │  │ Matching │
    │ Engine   │  │ Engine   │
    └──────┬──┘  └─┬────────┘
           │       │
    ┌──────▼───────▼───────┐
    │   Unified Pipeline    │
    │   (Grants + Contracts)│
    └──────┬───────┬───────┘
           │       │
    ┌──────▼──┐  ┌─▼────────┐
    │ Grant    │  │ Proposal │
    │ AI       │  │ AI       │
    │ Writer   │  │ Writer   │
    └──────┬──┘  └─┬────────┘
           │       │
    ┌──────▼───────▼───────┐
    │   Submission +        │
    │   Tracking             │
    └──────────────────────┘
```

### Module Interactions

**1. Onboarding → GovCon Assessment**
When a user selects LLC/Corporation/Partnership during onboarding, the system:
- Adds GovCon-specific questions (NAICS codes, current certifications, contract experience)
- Routes to the GovCon dashboard tab by default
- Still shows grants they qualify for (SBIR/STTR, state programs, etc.)

**2. GovCon Readiness → Certification Roadmap**
The readiness engine scores the company on 10 GovCon criteria. For each gap:
- Generates a step-by-step fix action
- Estimates timeline and cost
- Prioritizes by ROI (which certification unlocks the most opportunities)
- Can trigger a consulting engagement ($1,500-$3,000)

**3. Contract Matching → Bid/No-Bid**
When AI finds matching contracts from SAM.gov:
- Presents them in a match card format (similar to grant matches)
- Each match gets a Bid/No-Bid score (0-100)
- Factors: qualification, competition, value, timeline, strategic fit
- Recommends: Bid, No-Bid, Team, or Subcontract

**4. Pipeline → Proposal Writing**
When a user adds a contract to their pipeline:
- System pulls the full solicitation from SAM.gov
- AI analyzes requirements, evaluation criteria, and FAR clauses
- Generates proposal outline based on Section L/M requirements
- AI Writer produces first draft (Technical Volume, Management Volume, Past Performance, Pricing)

**5. Fiscal Calendar → Opportunity Timing**
The system uses the federal fiscal calendar to:
- Alert users when Q4 spending surges (Aug-Sep)
- Flag when agencies release forecasts (Q1-Q2)
- Recommend when to build relationships vs. when to bid
- Show spending trends by agency

**6. Subcontracting DB → Teaming**
For companies too small to prime:
- Matches them with prime contractors in their NAICS
- Shows subcontracting goals (SB %, 8(a) %, HUBZone %)
- Facilitates teaming arrangements
- Tracks mentor-protégé opportunities

---

## New Sidebar Navigation (Combined App)

```
Dashboard
├── Grants (existing)
├── Contracts (new)
└── Combined View

Discovery
├── Grant Matches
├── Contract Matches (new)
└── Browse All

Pipeline
├── Grant Pipeline
├── Contract Pipeline (new)
└── All Active

Writing
├── Grant Applications
├── Contract Proposals (new)
└── Capability Statements (new)

Readiness
├── Grant Readiness (existing)
├── GovCon Readiness (new)
└── Certifications (new)

Strategy
├── Funding Roadmap (existing)
├── Contract Roadmap (new)
└── Fiscal Calendar (new)

Settings
├── Organization
├── Billing
├── Team
└── Referrals
```

---

## Database Schema Additions

### New Tables

```sql
-- Contract opportunities (like grant_sources but for contracts)
CREATE TABLE contract_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_number TEXT,
  title TEXT NOT NULL,
  agency TEXT NOT NULL,
  sub_agency TEXT,
  type TEXT CHECK (type IN ('solicitation', 'presolicitation', 'sources_sought', 'award', 'special_notice')),
  set_aside TEXT, -- SB, 8(a), HUBZone, WOSB, SDVOSB, Full & Open
  naics_code TEXT,
  psc_code TEXT, -- Product/Service Code
  contract_value_min NUMERIC,
  contract_value_max NUMERIC,
  response_deadline TIMESTAMPTZ,
  posted_date TIMESTAMPTZ,
  place_of_performance TEXT,
  description TEXT,
  description_embedding vector(1536),
  sam_gov_url TEXT,
  contract_vehicle TEXT, -- GSA MAS, OASIS+, etc.
  status TEXT CHECK (status IN ('active', 'closed', 'awarded', 'cancelled')),
  data_source TEXT DEFAULT 'sam_gov',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contract matches (like grant_matches)
CREATE TABLE contract_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contract_opportunities(id),
  match_score REAL NOT NULL DEFAULT 0,
  bid_no_bid_score REAL,
  score_breakdown JSONB DEFAULT '{}',
  win_probability TEXT,
  recommended_action TEXT CHECK (recommended_action IN ('bid', 'no_bid', 'team', 'subcontract', 'research')),
  match_reasons JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- GovCon certifications tracking
CREATE TABLE org_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL, -- sam_gov, sb, 8a, hubzone, wosb, sdvosb, gsa_schedule, cmmc_l1, cmmc_l2
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'active', 'expired', 'not_applicable')),
  obtained_date TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contract pipeline (like grant_pipeline)
CREATE TABLE contract_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contract_opportunities(id),
  stage TEXT CHECK (stage IN ('tracking', 'bid_decision', 'teaming', 'writing', 'submitted', 'under_review', 'won', 'lost')),
  solicitation_number TEXT,
  agency TEXT,
  contract_value NUMERIC,
  response_deadline TIMESTAMPTZ,
  bid_no_bid_result JSONB,
  team_partners JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NAICS codes for the organization
CREATE TABLE org_naics_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  naics_code TEXT NOT NULL,
  description TEXT,
  size_standard TEXT, -- e.g., "$34M revenue" or "500 employees"
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Pricing Impact

### New Service Tiers

**GovCon SaaS Tiers:**
| Tier | Price | Features |
|------|-------|----------|
| GovCon Starter | $79/mo | 5 contract matches, pipeline tracking, readiness score |
| GovCon Pro | $249/mo | Unlimited matching, bid/no-bid analyzer, capability statement builder |
| GovCon Enterprise | $499/mo | Everything + team, proposal AI, fiscal calendar alerts |

**GovCon Consulting Services:**
| Service | Price | From Playbook |
|---------|-------|---------------|
| GovCon Readiness Audit | $2,500-$5,000 | Certification assessment + roadmap |
| SAM.gov + Certifications Setup | $1,500-$3,000 | SAM, SBA certs, GSA prep |
| Capability Statement Design | $750-$1,500 | Professional one-pager |
| GSA Schedule Application | $5,000-$15,000 | Full GSA MAS application |
| Proposal Writing (State/Local) | $3,000-$7,500 | Complete bid response |
| Proposal Writing (Federal) | $7,500-$25,000 | Technical + management volumes |
| GovCon Advisory Subscription | $3,000-$8,000/mo | Ongoing strategy + sourcing |

---

## Implementation Priority

### Phase 1 (Week 1-2): Foundation
1. Add GovCon onboarding questions (NAICS, certifications, contract experience)
2. Create contract_opportunities table + seed from GovCon ULTIMATE
3. Build GovCon Readiness Score card for dashboard
4. Add "Contracts" tab to dashboard

### Phase 2 (Week 3-4): Matching + Pipeline
5. Build contract matching engine (reuse grant matching pattern)
6. Create contract pipeline with GovCon-specific stages
7. Build Bid/No-Bid analyzer
8. Activate SAM.gov contract crawler

### Phase 3 (Week 5-6): Tools + Revenue
9. Build Capability Statement builder
10. Build Certification Tracker
11. Add Federal Fiscal Calendar
12. Create GovCon pricing page + checkout

### Phase 4 (Week 7-8): AI + Growth
13. Build contract proposal AI writer
14. Add subcontracting opportunities matching
15. Create GovCon-specific industry hub pages for SEO
16. Launch GovCon consulting services
