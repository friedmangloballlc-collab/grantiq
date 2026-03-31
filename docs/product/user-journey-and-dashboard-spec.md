# GrantAQ: Complete User Journey, Dashboard & Gap Analysis

**Author**: Alex (Product Manager)
**Date**: 2026-03-29
**Status**: Ready for Sprint Planning
**Version**: 1.0

---

## Executive Summary

GrantAQ has a strong Phase 1 foundation: landing page, signup, chat-style onboarding (15 steps), nonprofit formation wizard (5 phases), AI matching/readiness engines, grant directory, pipeline kanban, roadmap, and Grantie chat. 1,203 grants are seeded. The writing pipeline (3 tiers with compliance sentinel) is architecturally complete.

**The core gap is not missing pages -- it is missing connections between pages.** The app has screens but lacks the operational wiring that turns a collection of features into a product. Users complete onboarding and land on a dashboard showing zeros. They cannot trigger a match run from the dashboard. They cannot move a grant from match card to pipeline with one click. They cannot start a writing flow from the pipeline. Consulting clients complete the nonprofit formation wizard and then... nothing. No status tracking, no next step, no communication loop.

This document maps every user journey end-to-end, specifies exactly what the dashboard should show at each lifecycle stage, identifies every missing feature/flow required for a working product, and lays out how consulting revenue ($1,500-$15,000) integrates with SaaS revenue ($39-$349/mo).

---

## Part 1: Complete User Journeys

### Journey A: Self-Service SaaS Path

```
Landing Page --> Signup --> Onboarding (15 steps) --> [AUTO: Run First Match] --> Dashboard
                                                                                    |
                                                                                    v
                                                                              View Matches
                                                                                    |
                                                                              Save to Pipeline
                                                                                    |
                                                                              View Grant Detail
                                                                                    |
                                                                         Choose Action Path
                                                                        /        |          \
                                                                 DIY        AI-Assisted     Expert
                                                              Templates      Writing       Review
                                                                              |
                                                                        Purchase Tier
                                                                              |
                                                                        Writing Flow
                                                                              |
                                                                        Review Draft
                                                                              |
                                                                        Submit / Export
                                                                              |
                                                                    Track in Pipeline
                                                                              |
                                                                     Log Outcome
                                                                              |
                                                                    (loop) Next Grant
```

#### Step-by-step specification:

**Step 1: Landing Page --> Signup**
- CURRENT STATE: Working. Two paths: standard signup and nonprofit signup.
- NO CHANGE NEEDED.

**Step 2: Signup --> Onboarding**
- CURRENT STATE: Standard signup redirects to `/onboarding`. Nonprofit signup redirects to `/nonprofit-formation`.
- NO CHANGE NEEDED.

**Step 3: Onboarding Completion --> First Match Run**
- CURRENT STATE: Onboarding done screen says "Go to Dashboard" -- dashboard shows all zeros because no match has ever run.
- GAP: Nothing triggers the AI match engine after onboarding. The user walks into a dead-end.
- REQUIRED: When onboarding completes, automatically queue a match job (`POST /api/ai/match`) before redirecting to dashboard. The done screen should say "Finding your grants..." with a loading animation, then redirect to `/dashboard` when the job finishes (or after 30 seconds with a "we'll notify you" fallback).

**Step 4: Dashboard (First Visit)**
- CURRENT STATE: Shows "Today's Focus" (empty), "Stats Overview" (all zeros), "What's Changed" (empty).
- GAP: Empty state is a dead experience. No guidance, no momentum, no first action.
- REQUIRED: See Part 2 below for full dashboard empty-state design.

**Step 5: View Matches**
- CURRENT STATE: Working. Shows match cards with score rings, source type badges, amounts, deadlines.
- MINOR GAP: "Save to Pipeline" button on match card has no `onClick` handler -- it is a dead button.
- REQUIRED: Wire `Save to Pipeline` to `POST /api/pipeline/add` (create this endpoint) which inserts into `grant_pipeline` with stage `researching`.

**Step 6: Grant Detail Page**
- CURRENT STATE: Good layout with summary, readiness gauge, action paths, expandable sections.
- GAP: Readiness scores are hardcoded (`overallScore={68}`, hardcoded categories). Not connected to the AI readiness engine.
- GAP: "Save to Pipeline" button in sticky footer has no handler.
- GAP: "Start Application" links to `/grants/[id]/write` which does not exist.
- REQUIRED: (a) Wire readiness gauge to real readiness engine output. (b) Wire pipeline button. (c) Build the `/grants/[id]/write` page.

**Step 7: Writing Flow**
- CURRENT STATE: The backend writing pipeline exists (`src/lib/ai/writing/pipeline.ts`) with full 3-tier architecture (RFP parse, funder analysis, draft generation, coherence check, compliance sentinel, audit, review simulation). But there is NO frontend page for it.
- GAP: This is the single biggest missing feature. The writing pipeline has no UI.
- REQUIRED: Build `/grants/[id]/write` page with:
  1. RFP upload step (or auto-load if grant has structured requirements)
  2. Tier selection and payment (Stripe checkout)
  3. Progress indicator while pipeline runs
  4. Draft editor with section-by-section view
  5. Compliance sentinel results sidebar
  6. Export to PDF/DOCX
  7. Save and resume capability

**Step 8: Pipeline Tracking**
- CURRENT STATE: Kanban board exists with stages. `onStageChange` is a no-op (`async () => {}`).
- GAP: Cannot drag cards between stages (handler not wired). Cannot click into a pipeline item to see detail/progress.
- REQUIRED: (a) Wire `onStageChange` to update `grant_pipeline.stage` via API. (b) Add pipeline item detail view showing checklist, deadline, writing status, documents.

**Step 9: Outcome Tracking**
- CURRENT STATE: Does not exist.
- GAP: No way to record "won" or "lost" on a grant. No way to track award amount. No win rate calculation.
- REQUIRED: Add outcome recording to pipeline items when moved to "submitted" or final stage. Track won/lost/amount. Feed into dashboard win rate stat.

**Step 10: Roadmap**
- CURRENT STATE: Shows empty state directing to matches. When populated, shows quarters with recommended grants, goal progress, diversity score.
- GAP: No way to generate a roadmap. The strategy AI engine exists but has no trigger point.
- REQUIRED: Add "Generate Roadmap" button that calls `/api/ai/strategy`. Show loading state. Auto-populate after match run if user is on Pro or Enterprise tier.

---

### Journey B: Consulting Client Path

```
Landing Page --> "Start a Nonprofit" --> Nonprofit Signup --> Formation Wizard (5 phases)
                                                                        |
                                                                  Select Package ($499-$2,999)
                                                                        |
                                                                  [PAY via Stripe]
                                                                        |
                                                                  Confirmation + Dashboard Access
                                                                        |
                                                                  Consulting Dashboard
                                                                  (formation progress tracker)
                                                                        |
                                                                  [Friedman Global delivers work]
                                                                        |
                                                                  Formation Complete
                                                                        |
                                                                  Transition to SaaS Dashboard
                                                                  (auto-run first match)
                                                                        |
                                                                  Upsell: Grant Strategy ($1,500)
                                                                  Upsell: Grant Writing ($3,000-$15,000)
                                                                  Upsell: Advisory Subscription ($2,500-$6,000/mo)
```

#### Step-by-step specification:

**Step 1: Nonprofit Signup --> Formation Wizard**
- CURRENT STATE: Working. 5-phase wizard with 11+ steps collecting contact, mission, org details, board, officers, financials, programs, populations, existing docs, file upload, package selection, review.
- NO CHANGE NEEDED to the wizard itself.

**Step 2: Package Selection --> Payment**
- CURRENT STATE: Three packages displayed ($499, $1,499, $2,999). Review step exists.
- GAP: No Stripe integration. The "Submit" button on the review step calls `/api/nonprofit/intake` to save data but there is no payment flow.
- REQUIRED: After intake save, redirect to Stripe Checkout with the selected package as a one-time charge. On success, create the engagement record and redirect to consulting dashboard.

**Step 3: Post-Payment --> Consulting Dashboard**
- CURRENT STATE: Does not exist. After submitting the formation wizard, the user sees a success message but has no dashboard, no progress tracking, no communication channel.
- GAP: This is the second biggest missing feature.
- REQUIRED: Build a consulting client dashboard (see Part 2 below) that shows:
  - Engagement status and progress through the 12-step delivery process
  - Next action required (from them or from Friedman Global)
  - Document uploads and downloads
  - Messages / notes from the consulting team
  - Timeline with estimated completion dates

**Step 4: Formation Complete --> SaaS Transition**
- CURRENT STATE: No transition mechanism.
- GAP: When Friedman Global completes the formation, there is no trigger to transition the client into the SaaS product.
- REQUIRED: When engagement status changes to "complete", auto-run a match engine job and surface SaaS features. If the client bought the "Full Grant-Ready Package" ($2,999), they should get 30 days of Pro tier access included.

**Step 5: Upsell Paths**
- CURRENT STATE: No upsell mechanism exists.
- GAP: Consulting clients represent the highest-LTV users but there is no path from formation --> grant services.
- REQUIRED: Post-formation dashboard shows contextual upsell cards for Grant Strategy, Grant Writing, and Advisory Subscription with one-click purchase.

---

### Journey C: Referral Path (Existing Organization Needs Consulting Help)

```
SaaS Dashboard --> "Get Expert Help" (from Action Paths) --> Consulting Intake Form
                                                                     |
                                                              Select Service Tier
                                                                     |
                                                              [PAY via Stripe]
                                                                     |
                                                              Engagement Created
                                                                     |
                                                              Consulting Dashboard Tab
```

This path does not exist today. A SaaS user who wants human help has no clear path to purchase consulting services. The "Expert Review" action path on the grant detail page links to `#` (dead link).

---

## Part 2: Dashboard Design Specification

### 2.1 Self-Service Dashboard

The dashboard serves three lifecycle stages with fundamentally different needs.

#### State 1: First-Time User (Just Completed Onboarding)

The user arrives for the first time. Their match run is either in progress or just completed.

**Layout:**

```
+------------------------------------------------------------------+
| Welcome to GrantAQ, [Org Name]!                                   |
| Your first grant match is [running... / complete!]                |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| GRANT READINESS SCORE                           [Run Assessment]  |
| ============================================                      |
| Your readiness: [Not Yet Scored / 72/100]                        |
|                                                                   |
| Quick wins to improve your score:                                |
| [ ] Upload your 501(c)(3) determination letter                   |
| [ ] Register on SAM.gov                                          |
| [ ] Complete your mission statement                              |
+------------------------------------------------------------------+

+----------------------------+  +----------------------------+
| TOP MATCHES                |  | GETTING STARTED            |
| 1. [Grant Name] - 94%     |  | [x] Complete onboarding    |
| 2. [Grant Name] - 87%     |  | [x] Run first match        |
| 3. [Grant Name] - 82%     |  | [ ] Review your top 5      |
|                            |  | [ ] Save 1 grant to pipe   |
| [View All X Matches -->]   |  | [ ] Run readiness score    |
+----------------------------+  +----------------------------+

+------------------------------------------------------------------+
| YOUR PLAN: Free                                                   |
| You have 0 of 1 match runs remaining this month                  |
| Upgrade to Starter ($39/mo) for 5 match runs + state grants      |
| [Upgrade Now]                                                     |
+------------------------------------------------------------------+
```

**Specific components needed:**
- `WelcomeBanner` -- personalized greeting with match status (polling `/api/ai/match/status/[job_id]`)
- `ReadinessScoreCard` -- either "Not scored" with CTA or score with improvement checklist
- `TopMatchesPreview` -- top 3-5 matches from most recent run, with "View All" link
- `GettingStartedChecklist` -- tracks first 5 actions, persisted in `org_profiles`
- `PlanUsageBanner` -- shows current tier, usage, and upgrade CTA

#### State 2: Active User (Has Matches + Pipeline Items)

The user has been using the product. They have matches, pipeline items, maybe some drafts.

**Layout:**

```
+------------------------------------------------------------------+
| Dashboard                                                         |
| Welcome back. Here's what needs your attention.                   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| TODAY'S FOCUS (max 3 cards)                                       |
| [URGENT] SBIR Phase I deadline in 5 days - [Continue App]         |
| [THIS WEEK] 3 new matches found since Tuesday - [Review]          |
| [OPPORTUNITY] Your readiness improved - 2 new grants unlocked     |
+------------------------------------------------------------------+

+----------+  +----------+  +-----------+  +----------+
| Matches  |  | Pipeline |  | Pipeline  |  | Win Rate |
| 47       |  | 6 active |  | $1.2M     |  | 33%      |
+----------+  +----------+  +-----------+  +----------+

+------------------------------------------------------------------+
| WHAT'S CHANGED (last 7 days)                                      |
| * 3 new grants matched your profile                    [2 days]   |
| * "NEA Arts Grant" deadline moved to June 15           [3 days]   |
| * Your readiness score improved from 68 to 74          [5 days]   |
+------------------------------------------------------------------+

+----------------------------+  +----------------------------+
| PIPELINE SNAPSHOT          |  | UPCOMING DEADLINES         |
| Researching: 2             |  | Mar 31 - SBIR Phase I      |
| Writing: 3                 |  | Apr 15 - NEA Arts          |
| Submitted: 1               |  | May 1 - Ford Foundation    |
| [View Pipeline -->]        |  | [View All -->]             |
+----------------------------+  +----------------------------+

+------------------------------------------------------------------+
| AI WRITING STATUS                                                 |
| "Community Health Grant" - Draft 72% complete          [Resume]   |
| "SBIR Phase I" - Compliance check passed               [Review]   |
+------------------------------------------------------------------+
```

**Specific components needed (beyond what exists):**
- `TodaysFocus` -- EXISTS but needs real data. Wire to: (a) pipeline items with deadlines within 7 days, (b) new unreviewed matches since last login, (c) readiness improvements that unlock new matches.
- `StatsOverview` -- EXISTS but hardcoded to zeros. Wire to real queries: count of `grant_matches`, count of active `grant_pipeline`, sum of `grant_sources.amount_max` for pipeline items, calculated win rate.
- `WhatsChanged` -- EXISTS but empty. Wire to: new matches, deadline changes, readiness score changes, pipeline stage transitions.
- `PipelineSnapshot` -- NEW. Compact summary of pipeline stages with counts.
- `UpcomingDeadlines` -- NEW. Next 5 pipeline item deadlines sorted by date.
- `WritingStatus` -- NEW. Active writing drafts with progress and resume links.

#### State 3: Mature User (Tracking Outcomes)

Same as State 2 but with:
- Win rate populated from outcome data
- "Won Grants" total and amount
- Funding diversification chart (pie chart by source type)
- Year-over-year comparison if multiple years of data

### 2.2 Consulting Client Dashboard

Consulting clients need a fundamentally different view focused on their engagement progress, not self-service grant discovery.

**Layout:**

```
+------------------------------------------------------------------+
| Your Nonprofit Formation                                          |
| Package: Formation + 501(c)(3) | Started: Mar 15, 2026           |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| PROGRESS                                                          |
| [=============================>..........] 7 of 12 steps          |
|                                                                   |
| Completed:                                                        |
| [x] 1. Intake & Assessment                    Mar 15             |
| [x] 2. Readiness Audit                        Mar 18             |
| [x] 3. Strategy Development                   Mar 22             |
| [x] 4. Articles of Incorporation Filed        Mar 25             |
| [x] 5. EIN Obtained                           Mar 26             |
| [x] 6. Bylaws Drafted                         Mar 27             |
| [x] 7. Conflict of Interest Policy            Mar 28             |
|                                                                   |
| In Progress:                                                      |
| [~] 8. IRS Form 1023 Preparation              Est. Apr 5         |
|                                                                   |
| Upcoming:                                                         |
| [ ] 9. Financial Projections                                      |
| [ ] 10. IRS Submission                                            |
| [ ] 11. State Registration                                        |
| [ ] 12. Grant Readiness Setup                                     |
+------------------------------------------------------------------+

+----------------------------+  +----------------------------+
| ACTION REQUIRED FROM YOU   |  | DOCUMENTS                  |
| Upload board member bios   |  | [v] Articles of Incorp.    |
| by Apr 2, 2026            |  | [v] EIN Confirmation       |
|                            |  | [v] Bylaws (Draft)         |
| [Upload Documents]         |  | [v] COI Policy             |
+----------------------------+  +----------------------------+

+------------------------------------------------------------------+
| MESSAGES FROM YOUR CONSULTANT                                     |
| Mar 28 - "Your articles have been approved by the state. EIN     |
|           was issued today. Next: we're starting on Form 1023.   |
|           Please upload board member bios by April 2."           |
| [View All Messages] [Send a Message]                              |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| WHAT'S NEXT AFTER FORMATION?                                      |
| Once your nonprofit is established, unlock grant funding:         |
| [Grant Strategy & Roadmap - $1,500]  [Grant Writing - from $3K]  |
| [Grant Advisory - $2,500/mo]                                      |
+------------------------------------------------------------------+
```

**Database additions needed:**
- `consulting_engagements` table: `id`, `org_id`, `package`, `status`, `started_at`, `completed_at`, `consultant_id`
- `engagement_milestones` table: `id`, `engagement_id`, `step_number`, `title`, `status` (pending/in_progress/completed), `completed_at`, `notes`
- `engagement_messages` table: `id`, `engagement_id`, `sender_type` (client/consultant), `message`, `created_at`
- `engagement_documents` table: `id`, `engagement_id`, `name`, `file_path`, `uploaded_by`, `created_at`
- `engagement_action_items` table: `id`, `engagement_id`, `description`, `due_date`, `assigned_to` (client/consultant), `status`

### 2.3 Admin Dashboard (for Friedman Global Team)

Not user-facing, but critical for operating the consulting business. Needed for MVP.

**Key views:**
- All active engagements with status, assigned consultant, next action
- Client intake queue (new formation submissions awaiting payment confirmation)
- Revenue dashboard (MRR from SaaS, consulting pipeline, one-time payments)
- Client communication hub (respond to messages, update milestones)

---

## Part 3: What is Missing to Make the App Fully Functional

### Critical Path (Must Have for Launch)

| # | Gap | Current State | What to Build | Effort |
|---|-----|---------------|---------------|--------|
| 1 | **Auto-match after onboarding** | Onboarding ends, user sees zeros | Queue match job on onboarding complete, poll for results, redirect when done | S |
| 2 | **Wire dashboard to real data** | All stats show 0, Today's Focus empty, What's Changed empty | 3 Supabase queries: matches count, pipeline count/value, recent changes | S |
| 3 | **Save to Pipeline button** | Dead button (no onClick) on match cards and grant detail | POST endpoint to insert into grant_pipeline, wire both buttons | S |
| 4 | **Pipeline drag-and-drop** | onStageChange is `async () => {}` | Wire to PATCH endpoint updating grant_pipeline.stage | S |
| 5 | **Grant writing UI** | Backend pipeline exists, no frontend | Build `/grants/[id]/write` with RFP upload, tier select, Stripe payment, progress view, draft editor, export | XL |
| 6 | **Stripe checkout for SaaS tiers** | Pricing table links to `/signup`, no checkout | Build `/api/checkout/session` creating Stripe Checkout sessions for each tier. Handle webhook for subscription creation. | L |
| 7 | **Stripe checkout for consulting packages** | Formation wizard has no payment step | Add Stripe one-time payment after review step. Create engagement record on payment success. | M |
| 8 | **Stripe checkout for writing tiers** | Writing tiers defined but no purchase flow | One-time Stripe payment for AI Draft ($149), AI Draft + Audit ($499), Expert Review ($1,749) | M |
| 9 | **Consulting client dashboard** | Does not exist | New page + 5 new tables + milestone tracker + messaging | L |
| 10 | **Readiness gauge wired to AI** | Hardcoded values on grant detail page | Call readiness engine, cache result, display real scores | M |
| 11 | **Strategy roadmap generation** | Empty state with "Find Matches" button | Add "Generate Roadmap" trigger, wire to strategy AI engine | M |
| 12 | **Dashboard empty state (Getting Started)** | Shows empty sections | Build GettingStartedChecklist component, track completion in org_profiles | S |
| 13 | **Outcome tracking** | No win/loss recording | Add outcome fields to grant_pipeline, build recording UI, calculate win rate | M |
| 14 | **Notifications / email triggers** | Resend is installed but no transactional emails wired | Build email templates: welcome, match results ready, deadline reminders, engagement updates, payment receipts | M |
| 15 | **Upgrade / billing management page** | No billing page in app | Build `/settings/billing` showing current plan, usage, Stripe Customer Portal link | M |

### Important but Not Launch-Blocking

| # | Gap | Description | Effort |
|---|-----|-------------|--------|
| 16 | **Grant detail: real application requirements** | Currently says "will be populated from grant_requirements table" | Need to seed requirements data or parse from descriptions. M |
| 17 | **Document management** | Onboarding has file upload but no way to view/manage uploaded docs later | Build document library in settings. S |
| 18 | **Team member management** | Sidebar has no team/invite features despite tier limits | Build invite flow, role management page. M |
| 19 | **Admin panel for Friedman Global** | No way to manage consulting engagements | Build admin routes with engagement management. L |
| 20 | **Referral program UI** | Referral schema exists (pending migration 00017) but no UI | Build referral page, tracking, and reward display. M |
| 21 | **Mobile responsive polish** | Mobile sidebar via Sheet exists but app pages not tested | Responsive audit and fixes across all pages. M |
| 22 | **Grant detail: "DIY" path** | Links to # | Build templates/checklists page for each grant type. M |
| 23 | **Search and filter on matches page** | No filtering by source type, amount, deadline | Add filter bar component. S |
| 24 | **Webhook handling for Stripe** | No webhook endpoint | Build `/api/webhooks/stripe` for subscription lifecycle events. M |
| 25 | **Success fee tracking** | Pricing mentions success fees but no tracking mechanism | Build success fee calculation and invoicing flow. L |

### Nice to Have (Post-Launch)

| # | Feature | Notes |
|---|---------|-------|
| 26 | Calendar view of deadlines | Visual timeline complement to kanban |
| 27 | Grant alerts (new grants matching profile) | Cron job + push notifications |
| 28 | Comparative analytics | How does your org compare to similar orgs |
| 29 | Multi-org support | Consultants managing multiple nonprofits |
| 30 | White-label for consulting partners | Other consulting firms using GrantAQ |
| 31 | Public grant profiles (SEO) | Individual grant pages indexed by Google |
| 32 | API access for Enterprise tier | Programmatic grant data access |

---

## Part 4: Revenue Integration Strategy

### The Core Principle

**Consulting and SaaS are not separate products. They are a single revenue flywheel.** Every consulting client should become a SaaS subscriber. Every SaaS user should see a clear path to consulting services when they hit the limits of self-service.

### Revenue Architecture

```
                          CONSULTING FUNNEL
                    (one-time + recurring services)
                               |
    +------- Nonprofit Formation ($499-$2,999) -------+
    |                          |                       |
    |              Grant Readiness Audit               |
    |              ($1,500-$3,000)                     |
    |                          |                       |
    |              Grant Strategy & Roadmap            |
    |              ($1,500)                            |
    |                          |                       |
    |              Grant Writing                       |
    |              ($3,000-$15,000 per app)            |
    |                          |                       |
    |              Advisory Subscription               |
    |              ($2,500-$6,000/mo recurring)        |
    |                                                  |
    +--------------------------------------------------+
                               |
                    [All clients get SaaS access]
                               |
                          SAAS FUNNEL
                    (monthly subscriptions)
                               |
    Free --> Starter ($39/mo) --> Pro ($149/mo) --> Enterprise ($349/mo)
                               |
                    [SaaS users see consulting upsells]
                               |
                    AI Writing Add-ons
                    ($149 / $499 / $1,749 per draft)
```

### Specific Integration Rules

**Rule 1: Every consulting client gets SaaS access included.**

| Consulting Package | SaaS Tier Included | Duration |
|--------------------|-------------------|----------|
| Nonprofit Formation ($499) | Starter | 30 days |
| Formation + 501(c)(3) ($1,499) | Pro | 60 days |
| Full Grant-Ready Package ($2,999) | Pro | 90 days |
| Grant Readiness Audit ($1,500-$3,000) | Pro | 30 days |
| Grant Strategy & Roadmap ($1,500) | Pro | 30 days |
| Grant Writing (any tier) | Pro | Duration of engagement |
| Advisory Subscription ($2,500-$6,000/mo) | Enterprise | Duration of subscription |

Implementation: When a consulting payment is confirmed, set `subscriptions.tier` to the appropriate level with an `expires_at` date. Send email explaining their SaaS access. At expiration, downgrade to Free unless they've started a paid subscription.

**Rule 2: SaaS users see consulting upsells at natural friction points.**

| Friction Point | Upsell Shown | CTA |
|----------------|-------------|-----|
| Readiness score below 50 | Grant Readiness Audit ($1,500) | "Get expert help improving your readiness" |
| Viewing a federal grant without SAM.gov | Federal Grant Readiness ($2,500) | "Not SAM.gov registered? We can help" |
| Viewing an AI writing tier | Expert Review ($1,749) | "Want a human expert to review your application?" |
| 3+ grants in pipeline, none submitted | Grant Strategy consultation ($1,500) | "Not sure which to pursue first? Talk to an expert" |
| Free tier match limit hit | Starter subscription + Readiness Audit bundle | "Upgrade and get a free readiness consultation" |
| Grant won (outcome logged) | Advisory Subscription | "Congratulations! Keep the momentum going" |

Implementation: Build a `ConsultingUpsellCard` component that appears conditionally based on user state. Track impressions and conversions.

**Rule 3: Consulting services are purchasable from within the app.**

Do NOT send consulting clients to an external intake form or separate website. The entire consulting purchase flow should happen inside GrantAQ:

1. User clicks "Get Expert Help" on any relevant screen
2. Service selection page shows available consulting packages with pricing
3. Brief intake form (5-7 questions, pre-filled from existing profile data)
4. Stripe Checkout for one-time payment
5. Engagement record created, consulting dashboard appears
6. Friedman Global team notified of new engagement

**Rule 4: Success fee model bridges both revenue streams.**

For "Full Confidence Package" users (no upfront cost, 10% success fee):
- User signs up for Free tier
- Uses AI matching to find grants
- Uses AI writing (at Friedman Global's cost as an investment)
- If the grant is won, Friedman Global invoices 10% of the award amount
- Implementation: Track via `grant_pipeline.outcome = 'won'` + `award_amount` field. Auto-generate invoice via Stripe when outcome is logged. Payment terms: Net 30 from award receipt.

### Projected Revenue Mix (Year 1 Target)

| Stream | Monthly Target | Notes |
|--------|---------------|-------|
| SaaS subscriptions | $15,000 MRR | ~100 Starter + 50 Pro + 10 Enterprise |
| AI writing add-ons | $8,000/mo | ~30 drafts/month across tiers |
| Consulting: Formation | $12,000/mo | ~6 engagements at avg $2,000 |
| Consulting: Strategy/Audit | $6,000/mo | ~4 engagements at avg $1,500 |
| Consulting: Grant Writing | $20,000/mo | ~2-3 applications at avg $7,500 |
| Consulting: Advisory | $10,000/mo | ~3 clients at avg $3,500/mo |
| Success fees | $5,000/mo | Ramps as wins accumulate |
| **Total** | **~$76,000/mo** | |

---

## Part 5: Sprint Prioritization Recommendation

### Sprint 1 (Next 2 Weeks): "Make the Loop Work"

Goal: A user can sign up, get matched, save a grant, and see a real dashboard. This is the minimum viable loop.

| Story | Points | Owner |
|-------|--------|-------|
| Auto-queue match after onboarding complete | 3 | Eng |
| Wire dashboard to real Supabase queries (stats, focus, changes) | 5 | Eng |
| Build dashboard empty state with Getting Started checklist | 3 | Eng |
| Wire "Save to Pipeline" on match card + grant detail page | 3 | Eng |
| Wire pipeline kanban drag-and-drop to update stage | 3 | Eng |
| Build `/api/checkout/session` for SaaS tier upgrades | 5 | Eng |
| Build `/api/webhooks/stripe` for subscription lifecycle | 5 | Eng |
| Build `/settings/billing` page (current plan + portal link) | 3 | Eng |
| **Total** | **30** | |

### Sprint 2 (Weeks 3-4): "Consulting Revenue On"

Goal: Consulting clients can pay, track progress, and communicate.

| Story | Points | Owner |
|-------|--------|-------|
| Stripe checkout integration for formation wizard packages | 5 | Eng |
| Create consulting engagement tables (5 tables + migrations) | 5 | Eng |
| Build consulting client dashboard (progress tracker, messages, docs) | 8 | Eng |
| Build admin intake queue for Friedman Global team | 5 | Eng |
| Wire readiness gauge to AI readiness engine on grant detail | 5 | Eng |
| Build Stripe checkout for AI writing tiers | 3 | Eng |
| Email templates: welcome, match results, payment receipt | 5 | Eng |
| **Total** | **36** | |

### Sprint 3 (Weeks 5-6): "Writing is the Product"

Goal: Users can purchase and complete an AI-assisted grant application.

| Story | Points | Owner |
|-------|--------|-------|
| Build `/grants/[id]/write` page: RFP upload + tier selection | 8 | Eng |
| Build writing progress view (pipeline stages with live status) | 5 | Eng |
| Build draft editor (section view, compliance sidebar) | 8 | Eng |
| Build PDF/DOCX export from draft | 5 | Eng |
| Build outcome tracking (win/loss recording on pipeline items) | 3 | Eng |
| Wire roadmap generation to strategy AI engine | 5 | Eng |
| Consulting upsell cards at friction points | 3 | Eng |
| **Total** | **37** | |

### Sprint 4 (Weeks 7-8): "Polish and Launch"

Goal: Production-ready with all critical paths working end-to-end.

| Story | Points | Owner |
|-------|--------|-------|
| Deadline reminder emails (7 days, 3 days, 1 day before) | 3 | Eng |
| Pipeline item detail view (checklist, docs, writing status) | 5 | Eng |
| Matches page filter bar (source type, amount range, deadline) | 3 | Eng |
| Document management in settings (view/delete uploaded docs) | 3 | Eng |
| Success fee tracking and invoice generation | 5 | Eng |
| Mobile responsive audit and fixes | 5 | Eng |
| End-to-end smoke tests for both user journeys | 5 | Eng |
| Production deploy: env vars, Stripe products, Resend config | 3 | Eng |
| **Total** | **32** | |

---

## Part 6: Key Product Decisions (Requiring Stakeholder Alignment)

### Decision 1: Should consulting clients see the full SaaS dashboard or a stripped-down version?

**Recommendation**: Give consulting clients a DUAL dashboard. Default view is their engagement tracker (formation progress, messages, docs). A tab or toggle lets them access the SaaS view (matches, pipeline, roadmap). This prevents overwhelming formation-stage clients while giving them a clear "what's next" after formation completes.

**Trade-off**: More frontend work (two dashboard modes) vs. simpler but potentially confusing single view.

### Decision 2: Free tier -- how much access for consulting clients post-engagement?

**Recommendation**: After their included SaaS access period expires, downgrade to Free tier rather than locking them out entirely. Free tier still gives 1 match run/month and 3 pipeline items. This keeps them engaged and creates natural upgrade moments. A locked-out user never comes back. A free user sees what they are missing.

### Decision 3: Should the admin panel be inside GrantAQ or a separate tool?

**Recommendation**: Build it inside GrantAQ at `/admin`. The Friedman Global team needs to see the same data the client sees (engagement status, documents, messages) plus additional context (revenue, pipeline, team assignments). A separate tool creates data synchronization headaches. Role-based access control already exists in `org_members.role`.

### Decision 4: Pricing for the "consulting intake from SaaS" flow

**Recommendation**: Do NOT discount consulting services for existing SaaS subscribers. The SaaS subscription gives them the tools; consulting gives them the expertise. These are complementary, not competing. However, DO credit 1 month of their SaaS subscription cost toward any consulting engagement over $1,500. This makes them feel valued without meaningfully reducing revenue.

---

## Appendix A: Database Tables Needed

### New tables (consulting engagement system)

```sql
-- Consulting engagements
CREATE TABLE consulting_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  package TEXT NOT NULL,
  service_type TEXT NOT NULL, -- 'formation', 'readiness_audit', 'strategy', 'writing', 'advisory'
  status TEXT NOT NULL DEFAULT 'pending_payment', -- pending_payment, active, paused, completed, cancelled
  amount_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  consultant_id UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Milestones within an engagement
CREATE TABLE engagement_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES consulting_engagements(id),
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, blocked
  assigned_to TEXT DEFAULT 'consultant', -- consultant, client
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages between client and consultant
CREATE TABLE engagement_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES consulting_engagements(id),
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL, -- 'client', 'consultant'
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents exchanged during engagement
CREATE TABLE engagement_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES consulting_engagements(id),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  document_type TEXT, -- 'articles', 'bylaws', 'ein_confirmation', 'form_1023', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Action items for client or consultant
CREATE TABLE engagement_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES consulting_engagements(id),
  description TEXT NOT NULL,
  assigned_to TEXT NOT NULL, -- 'client', 'consultant'
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, overdue
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Modifications to existing tables

```sql
-- Add outcome tracking to grant_pipeline
ALTER TABLE grant_pipeline ADD COLUMN outcome TEXT; -- 'won', 'lost', 'withdrawn', NULL
ALTER TABLE grant_pipeline ADD COLUMN award_amount INTEGER; -- in cents
ALTER TABLE grant_pipeline ADD COLUMN outcome_date TIMESTAMPTZ;
ALTER TABLE grant_pipeline ADD COLUMN outcome_notes TEXT;

-- Add getting-started tracking to org_profiles
ALTER TABLE org_profiles ADD COLUMN onboarding_checklist JSONB DEFAULT '{}';
ALTER TABLE org_profiles ADD COLUMN first_match_job_id UUID;
ALTER TABLE org_profiles ADD COLUMN last_login_at TIMESTAMPTZ;

-- Add consulting SaaS access to subscriptions
ALTER TABLE subscriptions ADD COLUMN consulting_override_tier TEXT;
ALTER TABLE subscriptions ADD COLUMN consulting_override_expires_at TIMESTAMPTZ;
```

---

## Appendix B: API Endpoints Needed

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/pipeline/add` | Add grant to pipeline from match card or grant detail |
| PATCH | `/api/pipeline/[id]/stage` | Update pipeline item stage (kanban drag) |
| PATCH | `/api/pipeline/[id]/outcome` | Record win/loss/withdrawal |
| POST | `/api/checkout/session` | Create Stripe Checkout for SaaS subscription |
| POST | `/api/checkout/consulting` | Create Stripe Checkout for consulting package |
| POST | `/api/checkout/writing` | Create Stripe Checkout for AI writing tier |
| POST | `/api/webhooks/stripe` | Handle all Stripe webhook events |
| GET | `/api/dashboard/stats` | Aggregated dashboard statistics |
| GET | `/api/dashboard/focus` | Today's Focus items (deadlines, new matches) |
| GET | `/api/dashboard/changes` | What's Changed feed |
| GET | `/api/engagements/[id]` | Consulting engagement detail |
| GET | `/api/engagements/[id]/milestones` | Engagement milestones |
| POST | `/api/engagements/[id]/messages` | Send message on engagement |
| GET | `/api/ai/match/status/[job_id]` | Poll match job status |
| POST | `/api/ai/strategy` | Trigger roadmap generation |

---

*This document should be treated as the source of truth for the next 8 weeks of development. Every story in Sprints 1-4 traces back to a specific gap identified here. If scope needs to be cut, cut from Sprint 4 backward -- never from Sprint 1.*
