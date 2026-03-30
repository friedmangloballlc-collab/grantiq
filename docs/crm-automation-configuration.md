# CRM Automation Configuration Guide

**For:** Sales managers, CRM admins setting up HubSpot or Pipedrive
**Last Updated:** March 29, 2026

---

## Part 1: CRM Field Setup

### Contact Fields to Create

```
BASIC INFORMATION:
├─ First Name [Text]
├─ Last Name [Text]
├─ Email [Email]
├─ Phone [Phone]
├─ Title [Dropdown: Executive Director, CFO, Development Director, Grant Manager, Program Director, Other]
└─ Organization Name [Text]

FIRMOGRAPHIC DATA:
├─ Organization Size [Dropdown: <50, 50-250, 250-1000, 1000+]
├─ Annual Budget [Dropdown: <$100K, $100K-$250K, $250K-$500K, $500K-$1M, $1M+]
├─ Grant Budget [Currency: Estimated annual budget for grant services]
├─ Sector [Dropdown: Healthcare, Education, Arts, Community Development, Social Services, Environment, Other]
├─ Organization Type [Dropdown: 501c3 Nonprofit, Social Enterprise, Small Business, Individual]
└─ Entity Status [Dropdown: Registered, In Formation, Not Yet Verified]

QUALIFICATION SCORES:
├─ Lead Score (0-100) [Number - auto-calculated]
├─ Authority (A-score) [Dropdown: 0/4/8/12/16]
├─ Budget (B-score) [Dropdown: 0/7/11/14/17]
├─ Capacity (C-score) [Dropdown: 0/4/8/12/16]
├─ Deadline (D-score) [Dropdown: 0/4/8/12/16]
├─ Entity (E-score) [Dropdown: 0/8/12/14/16]
└─ Fed-Ready (F-score) [Dropdown: 0/5/9/13/17]

ENGAGEMENT SIGNALS:
├─ Email Opens [Number - auto-tracked]
├─ Email Clicks [Number - auto-tracked]
├─ Email Replies [Number - auto-tracked]
├─ Days Since Last Email [Number - auto-updated]
├─ LinkedIn Connected [Checkbox]
└─ Last Engagement Date [Date - auto-updated]

PAIN POINTS (Multi-select):
├─ Finding Grant Sources
├─ Proposal Writing Support
├─ Federal Compliance (SAM.gov, DUNS)
├─ Grant Strategy Planning
├─ Funding Gap Analysis
├─ Deadline Management
├─ Team Capacity Issues
└─ Board Reporting on Grants

SALES PIPELINE:
├─ Lead Source [Dropdown: Cold Email, LinkedIn, SaaS User, Referral, Inbound]
├─ Cold Email Sequence [Dropdown: Sequence A (Unfunded Grants), Sequence B (Federal Compliance), Sequence C (AI Writing), Sequence D (Dormant Account), None]
├─ Days in Current Stage [Number - auto-calculated]
├─ Next Action [Dropdown: Send Email, Schedule Call, Send Proposal, Follow-up Call, Nurture Track]
└─ Disqualification Reason [Dropdown: No Budget, No Authority, No Timeline, Mission Mismatch, Competitor, No Response, Other]

ENGAGEMENT HISTORY:
├─ Last Discovery Call Date [Date]
├─ Last Consultation Date [Date]
├─ Consultation Scheduled Date [Date]
├─ Proposal Sent Date [Date]
├─ Proposal Signed Date [Date]
└─ Notes [Long text - for discovery call summaries, objections, etc.]
```

### Deal/Opportunity Fields

```
DEAL INFORMATION:
├─ Deal Name [Text: "[Organization] - [Service Tier]"]
├─ Service Tier [Dropdown: Sourcing ($750), Audit ($750), Strategy ($1.5K), Compliance ($1K-$3K), Writing ($5K-$15K)]
├─ Deal Value [Currency]
├─ Deal Stage [Dropdown: See below]
├─ Probability [%: Auto-set based on stage]
├─ Close Date [Date: Expected]
├─ Close Date [Date: Actual]
├─ Expected Grant Amount [Currency: Estimated grant they could win if they use our services]
├─ Days in Stage [Number: Auto-calculated]
└─ Notes [Long text: Deal-specific info]

DEAL STAGE (7-stage pipeline):
├─ Stage 0: PROSPECT (0% probability)
├─ Stage 1: QUALIFIED (30% probability)
├─ Stage 2: CONSULTATION_SCHEDULED (50% probability)
├─ Stage 3: CONSULTATION_COMPLETED (60% probability)
├─ Stage 4: PROPOSAL_SENT (75% probability)
├─ Stage 5: NURTURE (10% probability)
└─ Stage 6: WON (100% probability) + LOST (0% probability)
```

---

## Part 2: Automation Workflows (HubSpot Example)

### Workflow 1: "Cold Email Sequence Automation"

**Trigger:** Contact added to list "Cold Email Prospects"

```
Step 1: Send Email
├─ Email: "Email 1: Problem Identification"
├─ Timing: Immediately
└─ Track: Opens, Clicks, Replies

Step 2: Wait
├─ Delay: 3 days

Step 3: Check: Did they open Email 1?
├─ If YES → Skip to Step 5
├─ If NO → Send Email 1 resend with different subject

Step 4: Wait 2 days

Step 5: Send Email 2
├─ Email: "Email 2: Case Study + Social Proof"
├─ Track: Opens, Clicks, Replies

Step 6: Wait 4 days

Step 7: Check: Did they reply to any email?
├─ If YES → Stop workflow (assign to sales, move to manual)
├─ If NO → Continue

Step 8: Send Email 3
├─ Email: "Email 3: Scarcity + Limited Availability"
├─ Track: Opens, Clicks, Replies

Step 9: Wait 3 days

Step 10: Set Task
├─ Task: "Call [Name] - ready for phone outreach"
├─ Assign to: Sales team
├─ Due date: Today
└─ Note: If no opens after 3 emails, decide to extend or disqualify

[Auto-tag these actions in CRM for tracking]
```

### Workflow 2: "Discovery Call Scheduled Automation"

**Trigger:** Discovery call appears on calendar (both parties accepted)

```
Step 1: Send Confirmation Email (Immediate)
├─ Email: Discovery call confirmation + agenda
├─ Include: Call time, call format (Zoom/phone), agenda
└─ Include: Pre-call research prompts

Step 2: Wait 1 day

Step 3: Send Task to Sales (Immediate)
├─ Task: "Pre-call research for [Name]"
├─ Deadline: 1 day before call
└─ Description: Review 990, recent grants, LinkedIn, news

Step 4: Wait until 1 day before call

Step 5: Send Pre-Call Email
├─ Email: "One day away - here's what we'll cover"
├─ Include: Call agenda + prep materials
└─ Tone: Casual reminder, not salesy

Step 6: Wait until 1 hour before call

Step 7: Send Slack Alert (or SMS)
├─ Message: "[Sales person], [Name] call in 1 hour"
├─ Include: Zoom link + contact details

Step 8: After call completes

Step 9: Send Task to Sales
├─ Task: "Send post-call email to [Name]"
├─ Deadline: Within 2 hours of call end
└─ Note: Must include next steps + call summary

Step 10: If consultation scheduled after call
├─ Update deal stage → CONSULTATION_SCHEDULED
├─ Send confirmation email immediately
└─ Set 2-day reminder to send proposal
```

### Workflow 3: "Lead Scoring (A-Z Qualification)"

**Trigger:** Any field updated (A-score, B-score, C-score, D-score, E-score, F-score)

```
Step 1: Calculate Total Score
├─ Formula: A + B + C + D + E + F = Total (0-100)
├─ Update field: "Lead Score [0-100]"

Step 2: Assign Segment
├─ If score >= 90 → Assign to "PRIORITY_CLOSE"
├─ If score 75-89 → Assign to "PRIORITY_NURTURE"
├─ If score 60-74 → Assign to "STANDARD_NURTURE"
├─ If score 45-59 → Assign to "LONG_NURTURE"
└─ If score < 45 → Assign to "DISQUALIFY"

Step 3: Route Assignment
├─ If PRIORITY_CLOSE → Assign to sales manager (for oversight)
├─ If PRIORITY_NURTURE → Assign to sales person
├─ If STANDARD_NURTURE → Add to automation sequence
├─ If LONG_NURTURE → Add to quarterly drip
└─ If DISQUALIFY → Move to "Stay in Touch" list

Step 4: Alert if threshold crossed
├─ If score moved from <75 to >=75 → Alert manager
├─ If score dropped from >=75 to <75 → Log reason in notes
└─ Send Slack notification if score >= 90

Step 5: Auto-tag for reporting
├─ Add contact to segment list (for dashboard, reports)
├─ Update "Last Score Update" field
└─ Add to relevant email segment
```

### Workflow 4: "Proposal Sent → Follow-up Cadence"

**Trigger:** Deal stage changes to "PROPOSAL_SENT"

```
Step 1: Send Proposal Email (Immediate)
├─ Email: Custom proposal cover email from sales person
├─ Include: Proposal PDF, next steps, timeline
└─ Track: Opens, clicks on proposal link

Step 2: Log in CRM
├─ Field: "Proposal Sent Date" = Today
├─ Field: "Next Action" = "Follow-up email (Day 3)"

Step 3: Wait 2 days

Step 4: Auto-check: Did they open proposal?
├─ If YES → Move to Step 6
├─ If NO → Send 1st reminder email

Step 5: Wait 1 day

Step 6: Send 1st Follow-up Email (Day 3)
├─ Email: "Just checking in - any questions on the proposal?"
├─ Tone: Light, no pressure
└─ Include: Quick summary of key points

Step 7: Wait 2 days

Step 8: Check: Any response?
├─ If YES (question) → Send answering email + schedule call
├─ If NO → Move to Step 9

Step 9: Send 2nd Follow-up Email (Day 5)
├─ Email: "One more thought on the proposal"
├─ Tone: Add social proof + ROI reminder
└─ Include: Case study or success metric

Step 10: Wait 2 days

Step 11: Set Phone Task
├─ Task: "Call [Name] to discuss proposal"
├─ Assign to: Sales person
├─ Due date: Today
└─ Note: "If no response to emails, call to understand status"

Step 12: If deal moves to "WON" before next task
├─ Stop all follow-up workflows
├─ Celebrate! (alert team)
└─ Begin onboarding workflow

Step 13: If deal moves to "NURTURE" or "LOST"
├─ Stop follow-ups
├─ Document reason in "Disqualification Reason" field
└─ Move to nurture sequence if applicable
```

### Workflow 5: "Nurture Drip for Non-Qualified Leads"

**Trigger:** Contact moved to deal stage "NURTURE"

```
Step 1: Assign to Appropriate Nurture Sequence
├─ If reason = "NO_TIMELINE" → Sequence: "Grant Planning Calendar" (monthly)
├─ If reason = "NO_BUDGET" → Sequence: "Cost-Saving Grants" (quarterly)
├─ If reason = "CAPACITY_ISSUE" → Sequence: "Grant Staffing Guide" (quarterly)
├─ If reason = "FED_COMPLIANCE" → Sequence: "Federal Compliance Roadmap" (monthly)
└─ Default → Sequence: "Educational Grant Updates" (bi-monthly)

Step 2: Send Email 1
├─ Timing: Immediately (educational, no hard sell)
├─ Topic: Addresses their specific blocker
└─ Include: Free resource or template

Step 3: Set Reminder for Sales
├─ Task: "Review [Name] for manual check-in"
├─ Deadline: 30 days
├─ Note: "Assess if situation has changed"

Step 4: Wait 30 days

Step 5: Auto-send Nurture Email 2
├─ Topic: Different angle on their pain point
└─ Include: Case study or success story

Step 6: Wait 30 days

Step 7: Auto-send Nurture Email 3
├─ Topic: Different angle on their pain point
└─ Include: ROI calculator or assessment tool

Step 8: After 3 nurture emails (90 days in nurture)
├─ Stop auto-sends
├─ Set task: "Manager review: Should we continue nurturing [Name]?"
├─ Decision options:
   ├─ Continue nurture (quarterly emails)
   ├─ Move to "Stay in Touch" (annual check-in)
   └─ Disqualify (remove from all sequences)

Step 9: If specific trigger occurs (e.g., "Grant deadline mentioned" in a reply)
├─ Move contact back to QUALIFIED
├─ Update scores
├─ Alert sales to begin active outreach
└─ Exit nurture sequence
```

### Workflow 6: "SaaS User Conversion Automation"

**Trigger:** GrantIQ SaaS user signs up (webhook integration)

```
Step 1: Create Contact in CRM (Automatic)
├─ Source: "SAAS_USER"
├─ Add fields from signup: Name, Email, Org, Sector
└─ Set tag: "Days_Since_Signup" = 0

Step 2: Send Welcome Email (Immediate)
├─ Email: "Welcome to GrantIQ"
├─ Include: Quick start guide, feature tour
└─ Track: Opens, clicks

Step 3: Wait 3 days

Step 4: Check: How engaged?
├─ If logged in 3+ times → Add to "HIGH_ENGAGEMENT" list
├─ If logged in 1-2 times → Add to "MEDIUM_ENGAGEMENT" list
├─ If never logged in → Add to "LOW_ENGAGEMENT" list

Step 5: If HIGH_ENGAGEMENT
├─ Send Email 1: "AI Grant Writing" (soft pitch to consulting)
├─ Track: Opens, clicks, replies
└─ Goal: Book discovery call

Step 6: If MEDIUM_ENGAGEMENT
├─ Send Email 1: "How's the grant search going?" (re-engagement)
├─ Wait 5 days
├─ Send Email 2: "Your grants update" (value-add email)
└─ If still no engagement, move to Sequence C

Step 7: If LOW_ENGAGEMENT
├─ Send Email 1: "We missed you" (win-back)
├─ Wait 7 days
├─ If still no engagement, begin "Dormant Account" sequence

Step 8: Track In-App Behavior
├─ Proposal draft started → Move to "WRITING_READY" segment
├─ Pricing page viewed → Move to "CONSIDERATION" segment
├─ Profile 100% complete → Trigger immediate sales outreach

Step 9: If user books consultation from in-app link
├─ Auto-create deal (CONSULTATION_SCHEDULED stage)
├─ Alert sales team immediately
├─ Send confirmation email
└─ Begin consultation prep workflow
```

---

## Part 3: CRM Dashboard & Reporting Setup

### Weekly Sales Dashboard

Create this dashboard for daily/weekly reference:

```
OVERVIEW SECTION:
├─ This week's closed deals: [# and $]
├─ Pipeline value (30/60/90 days): [$ amounts]
├─ Average deal size: [$ amount]
└─ Close rate (YTD): [%]

ACTIVITY SECTION:
├─ Emails sent this week: [#]
├─ Discovery calls this week: [#]
├─ Consultations held this week: [#]
├─ Proposals sent this week: [#]
└─ Stage changes (movement): [Visual chart]

PIPELINE BY STAGE:
├─ PROSPECT: [# leads, $0 value]
├─ QUALIFIED: [# leads, $ total value]
├─ CONSULTATION_SCHEDULED: [# leads, $ total value]
├─ CONSULTATION_COMPLETED: [# leads, $ total value]
├─ PROPOSAL_SENT: [# leads, $ total value]
├─ NURTURE: [# leads, $0 value]
└─ WON/LOST: [# deals, $ value]

ENGAGEMENT METRICS:
├─ Email open rate (last 7 days): [%]
├─ Email reply rate (last 7 days): [%]
├─ Discovery call request rate: [%]
├─ Consultation attendance rate: [%]
└─ Consultation-to-close rate: [%]

CHANNEL PERFORMANCE:
├─ Cold Email: [# deals, $ value, % conversion]
├─ SaaS Users: [# deals, $ value, % conversion]
├─ LinkedIn: [# deals, $ value, % conversion]
└─ Referrals: [# deals, $ value, % conversion]
```

### Monthly Performance Report

Generate this monthly for review:

```
EXECUTIVE SUMMARY:
├─ Revenue closed: $[X]
├─ New deals closed: [#]
├─ Pipeline added: $[X]
├─ Month-over-month growth: [+X%]
└─ Forecast (next 90 days): $[X]

SALES TEAM PERFORMANCE (by person):
├─ [Sales Person 1]: [# deals, $ closed, pipeline]
├─ [Sales Person 2]: [# deals, $ closed, pipeline]
└─ [Sales Person 3]: [# deals, $ closed, pipeline]

CONVERSION FUNNEL:
├─ Cold emails sent: [#]
├─ Discovery calls held: [#]
├─ Consultation meetings held: [#]
├─ Deals closed: [#]
├─ Conversion rate (email → close): [%]
└─ Average sales cycle: [X days]

LEAD QUALITY METRICS:
├─ Average lead score: [X/100]
├─ % leads scoring 80+: [X%]
├─ % leads scoring 60-79: [X%]
├─ % leads scoring <60: [X%]
└─ Average time to qualification: [X days]

EMAIL CAMPAIGN ANALYSIS:
├─ Sequence A open rate: [X%]
├─ Sequence B open rate: [X%]
├─ Sequence C open rate: [X%]
├─ Best subject line: [Winning subject]
├─ Best CTA: [Winning CTA]
└─ Recommended optimization: [Action for next month]

PIPELINE HEALTH:
├─ Deals moving forward: [#]
├─ Deals stalled (30+ days in stage): [#]
├─ Deals moved backward: [#]
├─ Disqualified this month: [#]
└─ Recommended follow-ups: [Action items]

A/B TEST RESULTS:
├─ Test 1: [Variable] - Winner: [Option A/B]
├─ Test 2: [Variable] - Winner: [Option A/B]
└─ Learning: [What to do next]
```

---

## Part 4: Integration Setup

### Email Integration (HubSpot)

```
SETUP:
├─ Connect email account (Gmail or Office 365)
├─ Enable tracking: Opens, clicks, bounces
├─ Enable templates: Use CRM template library
└─ Enable mail merge: Auto-personalize [variables]

EMAIL TRACKING RULES:
├─ Auto-log all sent emails to contact record
├─ Auto-log all received replies to contact record
├─ Auto-update "Last Email Date"
├─ Auto-update "Email Open Count"
├─ Auto-track clicks and identify most-clicked links
└─ Create list when reply received (for auto-response)

TEMPLATES TO SET UP:
├─ Email 1: Problem Identification
├─ Email 2: Case Study
├─ Email 3: Scarcity/Close
├─ Email 4: LinkedIn Follow-up
├─ Discovery Call Confirmation
├─ Post-Call Follow-up
├─ Proposal Cover Email
├─ Proposal Follow-up (3-email sequence)
├─ Nurture Emails (by segment)
└─ Win-Back/Dormant Account emails
```

### Calendar Integration

```
SETUP:
├─ Connect Calendly or HubSpot calendar
├─ Sync discovered meetings to CRM
├─ Auto-create tasks for meeting prep (1 day before)
├─ Auto-create tasks for follow-up (same day after meeting)

CALENDAR LINKS TO CREATE:
├─ Discovery Call (20-30 min)
├─ Consultation Call (45-60 min)
├─ Follow-up Call (15-20 min)
└─ Strategy Planning Session (60 min for accounts team)

AUTO-RESPONSES:
├─ When discovery call booked → Send confirmation + agenda
├─ 1 day before discovery → Send prep materials
├─ 1 hour before discovery → Send Zoom link reminder
└─ After discovery → Trigger post-call follow-up task
```

### LinkedIn Integration (Dripify or native)

```
SETUP:
├─ Connect LinkedIn account
├─ Enable profile view tracking
├─ Set up connection requests automation

AUTOMATION RULES:
├─ If email opened 2+ times but not replied → Send LinkedIn connection request (Day 10)
├─ If LinkedIn connected → Send DM (if allowed)
├─ If LinkedIn profile viewed our company page → Flag for outreach

MANUAL PROCESS:
├─ Sales person sends personalized connection request
├─ After 3 days, if accepted → Send DM
├─ DM content: Re-introduce self + link to relevant resource
└─ Track accepts/engagement in CRM
```

---

## Part 5: CRM Admin Maintenance

### Daily Tasks

```
[ ] Check for untracked emails (sync if needed)
[ ] Review workflow errors (any failures?)
[ ] Monitor bounced emails (update addresses or remove)
[ ] Check for high lead scores (ensure sales team is calling)
└─ Time: 10 minutes
```

### Weekly Tasks

```
[ ] Audit data quality (any missing fields?)
[ ] Review contact deduplication (merge duplicates)
[ ] Validate automation workflows (working correctly?)
[ ] Check email deliverability rates (any issues?)
[ ] Prepare pipeline report (by stage, by person)
└─ Time: 30 minutes
```

### Monthly Tasks

```
[ ] Review and update scoring thresholds (still working?)
[ ] Analyze A/B test results (winners implemented?)
[ ] Audit lost deals (why are they lost?)
[ ] Verify all email sequences are active and sending
[ ] Update case studies in CRM library
[ ] Run full pipeline report (forecast, growth, bottlenecks)
[ ] Team training on new features or workflows
└─ Time: 2 hours
```

---

## Part 6: CRM Best Practices

### Data Integrity Rules

```
REQUIRED FIELDS before creating deal:
├─ Organization Name
├─ Contact Name
├─ Email
├─ Title
├─ Lead Source
├─ Service Tier interest
└─ At least 3 of 6 A-Z scores

VALIDATION:
├─ No duplicate contacts (check before adding)
├─ Email format must be valid ([name]@[domain].com)
├─ Phone format must be valid (if filled)
├─ Dates must be in future if it's a "deadline" field
└─ "Notes" field should have entry for every deal movement
```

### Deal Closure Process

```
BEFORE MARKING DEAL WON:
├─ [ ] Proposal signed (attach PDF to deal)
├─ [ ] Payment received or payment terms agreed
├─ [ ] Service tier confirmed
├─ [ ] Project start date set
├─ [ ] Onboarding steps documented
└─ [ ] Client contact updated with implementation manager

AFTER MARKING DEAL WON:
├─ [ ] Create case study template entry (post-project)
├─ [ ] Set upsell reminder (30 days out)
├─ [ ] Set referral request reminder (90 days out)
├─ [ ] Add to "Customer" list for ongoing communications
└─ [ ] Move from sales pipeline to success/implementation pipeline
```

### Reporting for Leadership

```
WEEKLY (Monday morning):
├─ Email: Pipeline value by stage, weekly activities, top leads
├─ Audience: Sales manager + leadership
├─ Format: 1-page email with dashboard screenshots

MONTHLY (Last day of month):
├─ Email: Full performance report (see "Monthly Performance Report" above)
├─ Audience: Sales manager + CFO + CEO
├─ Format: Deck or written report

QUARTERLY (End of quarter):
├─ Presentation: Full sales review + trends + forecast
├─ Audience: Entire leadership team
├─ Content: Revenue, growth rate, channel analysis, team performance, A/B test learnings
```

---

End of CRM Configuration Guide

