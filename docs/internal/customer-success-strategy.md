# GrantAQ Customer Success Strategy
## Internal Playbook — Version 1.0 | March 2026

---

## Overview

This document defines GrantAQ's complete customer success framework across all six revenue segments. It is the operational source of truth for onboarding milestones, health scoring, engagement triggers, churn prevention, upsell timing, consulting renewal cadences, and NPS collection.

The underlying philosophy: **every customer interaction should either reduce churn risk, accelerate upgrade, or generate advocacy**. No touchpoint is neutral.

---

## Part 1: Activation Milestones — What Does "Activated" Mean?

Activation is segment-specific. A user who completes onboarding but never runs a match is not activated. Activation means the user has experienced the core value proposition of their tier.

### Free Tier — Activated When:
1. Onboarding wizard completed (entity type, mission, location, budget, grant history saved)
2. Readiness Score generated (A-J criteria assessed)
3. At least 3 grant matches viewed
4. Grantie AI chatbot queried at least once

**Time to activation target:** under 15 minutes from signup
**Activation rate goal:** 60% of free signups within 48 hours

**Why this matters:** Free users who see their readiness score and 3 matched grants have experienced the product's differentiated value. Users who do not reach this point almost never convert. Every free-tier automation should drive toward this four-step sequence.

---

### Starter ($39/mo) — Activated When:
1. Onboarding profile fully complete (all fields saved, no gaps)
2. Readiness Score run and reviewed
3. At least 5 grant matches reviewed with saved status set (saved, dismissed, or applied)
4. First AI Strategy Roadmap generated
5. At least one grant added to pipeline with a target deadline

**Time to activation target:** within 7 days of subscription start
**Activation rate goal:** 75% of new Starter subscribers within 7 days

**Why this matters:** The Starter value prop is "organized discovery with a strategic roadmap." If a Starter customer has not built a pipeline and run their roadmap, they have no reason to renew at month 2.

---

### Pro ($149/mo) — Activated When:
1. All Starter activation criteria met
2. At least one AI Writing draft started (any tier: AI-only, AI+Audit, or Expert)
3. Compliance Sentinel reviewed on at least one draft
4. At least one grant application moved to "submitted" status in pipeline
5. Strategy Roadmap reviewed and at least one recommended action marked complete

**Time to activation target:** within 14 days of subscription start
**Activation rate goal:** 80% of new Pro subscribers within 14 days

**Why this matters:** Pro users are paying for AI writing. If they have not used the writing pipeline, they are paying for capabilities they do not value — and they will churn at the first renewal. The 14-day window is long enough to be realistic but short enough to catch failure early.

---

### Enterprise ($349/mo) — Activated When:
1. All Pro activation criteria met
2. At least 2 team members invited and active (logged in within 14 days)
3. Organization profile admin roles assigned
4. At least one collaborative pipeline review completed (multiple members engaged with same grant)
5. Kickoff call completed with CSM

**Time to activation target:** within 21 days of subscription start
**Activation rate goal:** 85% of new Enterprise subscribers within 21 days

**Why this matters:** Enterprise buyers have teams. If only the contract signer is using the product, the account is at high risk — one personnel change and the account churns. Multi-seat engagement is the single strongest predictor of Enterprise renewal.

---

### Consulting Clients ($1,500–$15,000 engagements) — Activated When:
1. Intake form completed and reviewed by CSM
2. Kickoff call held within 72 hours of payment
3. GrantAQ organization profile created and populated
4. Readiness Assessment completed and shared with client
5. First deliverable milestone acknowledged in writing (email or signed SOW milestone)

**Time to activation target:** within 5 business days of payment
**Activation rate goal:** 100% (this is a managed service — activation is non-negotiable)

---

### Nonprofit Formation Clients ($499–$2,999) — Activated When:
1. Intake form submitted with all board member information
2. State name availability check completed and confirmed to client
3. Articles of Incorporation draft delivered for client review
4. Client has acknowledged receipt and approved draft (email confirmation)

**Time to activation target:** within 3 business days of payment
**Activation rate goal:** 100% (managed service)

---

## Part 2: Health Score Model

The GrantAQ Health Score is a 0–100 composite index computed per organization. It runs nightly for paid accounts and weekly for free accounts. It is the primary tool for identifying churn risk and expansion opportunity.

### Score Architecture

| Dimension | Weight | Signals |
|-----------|--------|---------|
| Product Usage | 30% | Login frequency, features used, grants viewed, pipeline activity |
| Adoption Depth | 25% | AI engines used, writing drafts created, roadmap actions completed |
| Engagement Quality | 20% | Grantie queries, readiness score recalculated, grants saved vs dismissed |
| Support Health | 15% | Open tickets, escalation history, resolution time, CSAT on tickets |
| Financial Health | 10% | Payment success rate, subscription age, plan tier, annual vs monthly |

### Score Bands

| Score | Band | Classification | Action |
|-------|------|----------------|--------|
| 80–100 | Green | Healthy | Nurture for expansion and advocacy |
| 60–79 | Yellow | Caution | Proactive outreach within 5 business days |
| 40–59 | Orange | At Risk | CSM intervention within 48 hours |
| 0–39 | Red | Critical | Immediate escalation, same-day outreach |

---

### Metric Weights by Segment

**Free Tier Health Score**
- Login in last 14 days: 20 pts
- Readiness score run: 20 pts
- 3+ grants viewed: 20 pts
- Grantie used at least once: 20 pts
- Referred someone (referral link clicked): 20 pts

Free health score is used only to time upgrade offers, not for churn prevention (free users cannot churn). A free user with a score above 60 is a conversion candidate.

---

**Starter Health Score**
- Logged in at least 3x in last 30 days: 25 pts
- Pipeline has 3+ active grants: 20 pts
- Readiness score updated in last 60 days: 15 pts
- Strategy roadmap generated: 15 pts
- Grantie queried in last 30 days: 10 pts
- Support tickets: 0 open = 15 pts, 1 open = 10 pts, 2+ open = 0 pts

**Churn predictors for Starter:** No login in 21+ days, zero pipeline activity, no roadmap generated. Any two of these three = Red.

---

**Pro Health Score**
- Logged in at least 4x in last 30 days: 20 pts
- At least 1 writing draft created in last 60 days: 25 pts
- Pipeline has 5+ active grants: 15 pts
- At least 1 grant moved to "submitted" in last 90 days: 20 pts
- Compliance Sentinel used on last draft: 10 pts
- Support ticket health: same as Starter: 10 pts

**Expansion predictors for Pro:** 3+ writing drafts in 90 days, pipeline 10+ grants, or user explicitly asks about team features. Any one = flag for Enterprise upsell.

---

**Enterprise Health Score**
- 3+ team members active in last 30 days: 25 pts
- Kickoff call completed: 10 pts
- Pipeline has 10+ active grants: 15 pts
- At least 1 writing draft per active user in last 60 days: 20 pts
- At least 1 grant submitted in last 90 days: 20 pts
- No escalated support tickets: 10 pts

**Churn predictors for Enterprise:** Only 1 active user (champion risk), 0 grants submitted in 120+ days, escalated ticket unresolved 5+ days.

---

**Consulting Client Health Score**
- Kickoff held on time: 15 pts
- All milestone deliverables on schedule: 25 pts
- Client responsiveness (replies within 48 hrs): 20 pts
- Midpoint check-in completed: 20 pts
- No active escalations: 10 pts
- Satisfaction score at midpoint 4/5 or higher: 10 pts

---

**Nonprofit Formation Client Health Score**
- Intake form submitted within 24 hours of payment: 20 pts
- Client approved Articles draft within 5 business days: 25 pts
- All board member information complete: 20 pts
- No missing document requests outstanding 5+ days: 20 pts
- No billing issues: 15 pts

---

## Part 3: Engagement Triggers

All engagement is segmented by channel: automated email, in-app message, or CSM-initiated call/email. Triggers below define the condition, timing, channel, and goal.

### Lifecycle Triggers (All Segments)

#### T-1: Welcome Sequence — Day 0 to Day 7

**Free Users**
- Day 0 (immediate): Welcome email. Subject: "Your grant matches are ready." CTA: View Your Matches. Do not pitch upgrade.
- Day 1 (in-app, on first login post-signup): Tooltip highlighting Readiness Score. CTA: "Run your free readiness assessment."
- Day 3 (email, if readiness score not run): Subject: "You're missing your most important first step." Body: explain what readiness score reveals. CTA: Run Assessment.
- Day 5 (in-app, if onboarding incomplete): "Your profile is X% complete — incomplete profiles get worse matches." CTA: Complete Profile.
- Day 7 (email, if not activated): Subject: "What's holding you back?" Soft check-in. Offer to answer questions. No hard sell.

**Starter (New Subscriber)**
- Day 0 (immediate): Transactional confirmation + welcome email. Subject: "Welcome to Starter — here is your first week roadmap." Include 5-step activation checklist.
- Day 1 (in-app): Activation checklist widget visible on dashboard.
- Day 2 (email, if pipeline empty): Subject: "Step 2: Add your first grant to your pipeline." CTA: View Matches.
- Day 4 (email, if roadmap not generated): Subject: "Your AI Strategy Roadmap is waiting." Body: explain what the roadmap reveals. CTA: Generate Roadmap.
- Day 7 (email, from CSM): Personal check-in. Subject: "One week in — how can I help?" Offer 15-minute onboarding call. CSM signs email personally.

**Pro (New Subscriber)**
- Day 0 (immediate): Confirmation + welcome. Subject: "Welcome to Pro — your AI writing credits are active." List what is unlocked.
- Day 1 (in-app): Writing pipeline onboarding tooltip sequence (3-step overlay).
- Day 3 (email, if no writing draft started): Subject: "You haven't written your first grant yet." CTA: Start a Draft. Include example output.
- Day 7 (CSM email): Personalized check-in. Offer 30-minute strategy call. Mention Full Confidence Package eligibility check.
- Day 14 (email, if no draft submitted): "Your Pro plan is most powerful when you submit — let us show you how." Attach 1-page guide: "First Grant in 14 Days."

**Enterprise (New Subscriber)**
- Day 0 (immediate): Welcome email to account owner + invitation instructions for team.
- Day 1 (CSM call or email): CSM schedules kickoff call within 24 hours.
- Day 3 (kickoff call): Review activation checklist, assign internal champion, set 30-day success plan.
- Day 7 (in-app, to all team members): "Your organization has X grants in progress — here's your dashboard."
- Day 14 (CSM email to account owner): Activation status report — who has logged in, what has been done, gaps.
- Day 21 (if team < 2 active users): CSM call — champion risk conversation. Offer team training session.

---

#### T-2: Usage Drop Triggers (All Paid Tiers)

**Condition:** No login in 14 days (Starter), 10 days (Pro), 7 days (Enterprise)
**Channel:** Email from CSM
**Subject:** "We noticed you haven't been in GrantAQ lately."
**Body:** Acknowledge the gap. Share one relevant insight ("There are 3 new grants in your area this week matching your profile"). CTA: Log Back In. Offer a call if they are stuck.
**Goal:** Re-engage before the 21-day mark, which is the churn signal threshold.

**Condition:** Login but no action in 10 consecutive days (Starter/Pro)
**Channel:** In-app message on next login
**Message:** "It looks like you haven't made progress on your pipeline lately. Want us to suggest your next best action?"
**CTA:** Show Me What to Do Next (triggers Grantie with context pre-loaded)

---

#### T-3: Milestone Completion Triggers (Celebration + Upsell Setup)

**Condition:** First grant match saved to pipeline
**Channel:** In-app toast + email
**Message:** "You saved your first grant match. That is the first step — most funded organizations have 8-12 active applications at once."
**Goal:** Set expectation for pipeline depth. Do not upsell yet.

**Condition:** First writing draft completed
**Channel:** In-app notification + email
**Message:** "Your first AI-drafted grant application is ready. Here is what happens next." Include compliance check reminder.
**Goal:** Drive toward submission, which is the stickiest action in the product.

**Condition:** First grant submitted (status set to "submitted")
**Channel:** Email from CSM
**Message:** Congratulate. Share expected timeline for this grant type. Mention success fee disclosure if applicable. Ask: "What grants are next on your list?"
**Goal:** Deepen pipeline and surface Full Confidence Package eligibility.

**Condition:** Grant awarded (user updates status to "awarded")
**Channel:** Email from CSM (personal) + in-app celebration
**Message:** Congratulate with specific dollar amount. Mention success fee if applicable. Ask for testimonial. Offer case study participation.
**Goal:** Trigger advocacy funnel. This user is now an ideal reference.

---

#### T-4: Renewal and Expansion Triggers

These are defined in detail in Parts 5 and 6 below.

---

## Part 4: Churn Prevention Playbook

### Risk Segmentation

Every account is reviewed weekly against the Health Score model. Accounts in Orange or Red are assigned to the active intervention queue.

### Intervention Playbooks by Situation

---

#### Playbook 4-A: Login Gap (No Login 14-21 Days, Paid Tier)

**Day 14:** Automated email. Subject: "We miss you — here's what changed." Highlight new grants in their match profile. CTA: View Updates.

**Day 17:** If no login, CSM personal email. Subject: "Quick check-in from GrantAQ." 3 sentences max. Ask one question: "Is there anything getting in the way of your grant work right now?"

**Day 21:** If still no login, CSM phone call attempt. If no answer, leave voicemail + follow-up email. Offer to pause the account (30-day pause, if product supports it) rather than cancel. This reduces cancellations by approximately 20-30% based on SaaS industry benchmarks.

**Day 30:** If still no engagement, send "We respect your decision" email. Offer two choices: (1) hop on a 15-minute call, or (2) cancel with one click. Include downgrade to free option prominently. Closing: "Your data stays saved — you can return anytime."

---

#### Playbook 4-B: Cancellation Request Received

**Step 1 (Immediate):** CSM or automated system acknowledges within 1 hour. Do not immediately process — offer a save call.

**Step 2 (Within 2 hours):** CSM calls or emails. Subject: "Before you go — can we talk for 10 minutes?" Purpose: identify the real reason (cost, fit, no time, competitor, or got what they needed).

**Step 3 (Exit Interview):** Always collect reason. Categorize into: (a) price, (b) feature gap, (c) no time/bandwidth, (d) completed objective, (e) chose competitor, (f) product not working.

**Step 4 (Save Offers by Reason):**
- Price: Offer annual plan at effective monthly rate. Offer 1-month free if they stay on annual.
- Feature gap: Escalate to product team. Offer extended trial of needed feature if buildable.
- No time: Offer account pause (30 days). Offer consulting engagement to do the work for them.
- Completed objective: Offer downgrade to free. Nurture for reactivation at renewal cycle.
- Chose competitor: Do not fight. Learn. Send off with goodwill. Ask if they would be willing to try GrantAQ again in 6 months.
- Product not working: Immediate escalation to support. Offer service credit. Do not let this be a churn reason.

**Step 5 (Win-Back):** If they cancel anyway, enter 90-day win-back sequence: email at day 15 ("here's what's new"), day 45 ("we built something you asked for"), day 90 ("ready to come back? here's an offer").

---

#### Playbook 4-C: Champion Departure (Enterprise)

**Signal:** Key user deactivated, or user sends goodbye email, or LinkedIn shows they left the org.

**Step 1 (Within 24 hours):** Email the account's billing contact and any remaining admin-level users. Subject: "Checking in on your GrantAQ account." Do not reference the departed person by name unless already in a relationship with remaining contacts.

**Step 2 (Within 3 business days):** Offer onboarding call for the new point of contact. Rebuild the relationship from scratch — do not assume the new person understands the value.

**Step 3:** Add account to "elevated risk" watch list for 60 days. Increase check-in cadence to bi-weekly during this window.

---

#### Playbook 4-D: Failed Payment

**Day 0 (Payment fails):** Automated email to billing contact. Subject: "Action required: payment issue on your GrantAQ account." Friendly, not threatening. CTA: Update Payment Method. Account remains fully active.

**Day 3 (If not resolved):** Second automated email. Same tone, slightly more urgent. Mention account access at risk in 7 days.

**Day 5 (If not resolved):** CSM personal email or call. This is now a relationship issue, not a billing system issue. Offer to help update card, switch to invoice (Enterprise), or discuss hardship options if applicable.

**Day 7 (If not resolved):** Account downgraded to free but data preserved. Email: "Your account has been paused — your data is saved and you can reactivate anytime." Easy one-click reactivation prominent in email.

**Day 30 (Win-back):** "Ready to reactivate? Here's a special offer." Offer first month at 50% off.

---

#### Playbook 4-E: Low Readiness Score — Consulting Upsell

**Signal:** Free or Starter user runs readiness assessment and scores below 50 (grades E–J on A-J scale).

**Trigger:** Automated in-app message + email within 1 hour of score generation.
**Message:** "Your readiness score shows some gaps that could prevent grant approvals. Our consulting team helps organizations like yours get grant-ready — often in 30-60 days." CTA: Book a Free Strategy Call.
**Goal:** Convert to consulting engagement. This is a high-value rescue that converts a struggling self-service user into a managed service client.

---

## Part 5: Upsell Timing

### Free to Starter — Upgrade When:

An account meets at least 3 of the following 5 conditions. Do not pitch before 3 conditions are met — it reads as pushy and damages trust.

1. Activated (4-step activation complete — readiness score, 3+ matches viewed, Grantie queried, profile complete)
2. Has viewed 5+ grant matches and saved or dismissed at least 3
3. Has asked Grantie a question that implies pipeline intent ("which grants should I apply for first?" / "what do I need to get SAM registered?")
4. Has been a free user for 7+ days (not day 1 — let them discover the product first)
5. Has returned to the product 3+ times in a 14-day window (demonstrated intent)

**Upgrade trigger email:**
Subject: "You've outgrown the free plan — here's what you're missing."
Body: Show the 3 specific grants they saved that require deeper strategy access. Show the roadmap they have not been able to generate. Price anchored: "$39/month — less than one grant application's materials cost."
CTA: Upgrade to Starter

**In-app trigger:** On third return visit after activation, show soft modal: "You've reviewed X grants. Starter subscribers win 3x more grants on average. Want to see your strategy roadmap?"

---

### Starter to Pro — Upgrade When:

An account meets at least 3 of the following 5 conditions:

1. Pipeline has 5+ active grants
2. User has attempted to access AI Writing (hit the upgrade paywall) at least once
3. User has submitted at least 1 grant application (proven they are actively applying)
4. User's readiness score is 65+ (they are ready to write, not just discover)
5. User has been on Starter for 60+ days and renewed at least once (not an impulse churner)

**Upgrade trigger email:**
Subject: "You're ready for AI-written grants."
Body: Reference the specific grants in their pipeline. Show the time savings of AI writing vs. manual ("8 hours vs. 30 minutes"). Price anchor: "Pro is $110/month more — one successful grant pays for years of Pro."
CTA: Upgrade to Pro — Try AI Writing Now

**Pro upsell timing note:** Do not pitch Pro before the Starter user has proven they are applying. Selling AI writing to someone who has not submitted anything yet is selling a tool they do not understand how to use.

---

### Pro to Enterprise — Upgrade When:

1. Account owner mentions a team member, colleague, or board member who "also needs access"
2. Pro user has 3+ writing drafts in 60 days (heavy usage, Enterprise volume)
3. User asks Grantie about "collaboration" or "sharing" features
4. Account has 2+ grants awarded — they are now a real grant-getter who needs organizational infrastructure
5. The organization has grown (employee count updated, budget updated to $500K+)

**Upgrade trigger:** CSM-initiated call, not automated email. Enterprise is a relationship sale.
**Talk track:** "It sounds like your grant program has grown significantly. Enterprise gives your whole team access, reduces the per-person cost, and includes priority support. Can I walk you through what that looks like for an organization your size?"

---

### SaaS to Consulting — When to Offer:

1. Free or Starter user with readiness score below 50 (not grant-ready — needs hands-on help)
2. Pro user who has attempted 3+ grants and received no awards in 6 months (may need expert strategy)
3. Any user who contacts support asking questions that are consulting-level ("what narrative approach works best for HRSA grants?" / "how do I structure a logic model?")
4. Any user who asks Grantie about nonprofit formation (immediate formation service referral)
5. Enterprise user whose team is not adopting the product (champion never invited team) — offer to embed a consulting engagement to build their internal grant program

**Key principle:** Consulting is offered as a solution to a problem the customer is experiencing, not as an upsell pitch. CSM identifies the moment the customer is stuck and offers consulting as the relief.

---

### SaaS to Nonprofit Formation — When to Offer:

1. Free or Starter user selects entity type as "LLC," "Sole Proprietorship," or "Other" but checks the "interested_in_nonprofit" flag during onboarding
2. Any user who asks Grantie: "how do I become a nonprofit?" or "can I apply for grants as an LLC?"
3. Any consulting client who does not yet have 501(c)(3) status

**Offer trigger:** Immediate in-app message + email within 1 hour of formation interest signal.
Subject: "You asked about becoming a nonprofit — here's how we can help."
Body: Explain the three formation packages. Anchor on $499 entry point. Mention that Full Grant-Ready ($2,999) includes SAM registration, Grants.gov setup, and 3 matched grants.
CTA: Book a Free Formation Consultation

---

## Part 6: Renewal Strategy for Consulting Clients

Consulting engagements are finite but generate multiple renewal opportunities: continuation engagements, escalation to higher-tier packages, and SaaS subscription upgrades. The renewal process begins at contract signature, not at engagement end.

### Consulting Renewal Framework

The renewal timeline is anchored to the engagement midpoint. For a typical 60-day engagement, the midpoint is day 30.

---

### Midpoint Check-In (Day 30 of 60-Day Engagement)

**Purpose:** Course-correct, demonstrate value, and plant the renewal seed.

**Format:** 30-minute video call. CSM attends alongside delivery team.

**Agenda:**
1. Progress review — deliverables completed vs. planned (10 minutes)
2. Client satisfaction temperature check — direct question: "On a scale of 1-5, how are we doing?" (5 minutes)
3. Obstacles conversation — what is slowing the client down? (10 minutes)
4. Preview of remaining deliverables (5 minutes)
5. Soft introduction: "We want to make sure you have everything you need after we wrap up — can we talk about what ongoing support looks like?" (This plants the continuation seed without pressure.)

**CSM actions after midpoint call:**
- Log satisfaction score in CRM
- If score is 3 or below: escalate to principal immediately, flag as at-risk, and schedule follow-up within 5 business days
- If score is 4-5: proceed to renewal outreach cadence
- Send follow-up summary email within 24 hours of call with action items and timeline

---

### 60-Day Pre-Engagement-End Mark — Renewal Cadence Start

For a 60-day engagement, this is Day 0 of the renewal cadence (30 days before end).

**Day 0 (60 days before end / at engagement start for shorter engagements):**
Set internal reminder for all renewal steps. Create renewal opportunity in CRM. Identify: is this client a continuation candidate, an upgrade candidate, or a one-and-done?

---

### 45-Day Mark (Renewal Cadence Day 15)

**Action:** CSM sends personalized email to client.
**Subject:** "What happens after we wrap up — let's talk."
**Body:** Reference the specific outcomes delivered so far. Mention 1-2 things still coming. Introduce the idea of ongoing support options without specific pricing. Ask: "Have you thought about what grant work looks like after this engagement?"
**Goal:** Open the continuation conversation without closing it. Get client thinking about their post-engagement gap.

---

### 30-Day Mark (Renewal Cadence Day 30)

**Action:** Renewal proposal call. 45-minute video call.

**Agenda:**
1. Delivery update — what was accomplished (10 minutes)
2. Gap analysis — what does the client still need? What comes after this? (15 minutes)
3. Renewal options presentation — present 2-3 specific options, not a menu (10 minutes)
4. Q&A and next steps (10 minutes)

**Renewal options to present (tailor to client's situation):**
- Continuation engagement at same tier (month-to-month retainer at 15% discount vs. new engagement rate)
- Escalation package (Formation client upgrades to Grant-Ready; Grant-Ready client moves to active grant writing engagement)
- SaaS subscription upgrade (client transitions to Pro or Enterprise for ongoing self-service with quarterly CSM check-ins included)
- Hybrid model (lighter consulting retainer paired with Pro or Enterprise SaaS subscription)

**Pricing principle:** Always present the mid-tier option as the default and frame the lower option as "if budget is the constraint." Do not lead with the lowest price.

**Document:** Send written proposal within 24 hours of the call. Proposal expires at the 14-day mark (creates urgency without being aggressive).

---

### 14-Day Mark (Renewal Cadence Day 46)

**Action:** Follow-up on proposal. CSM calls or emails.
**Subject:** "Following up on your continuation options."
**Body:** Reference the proposal sent. Ask directly: "Have you had a chance to review? Do you have questions?" If no decision, ask what is holding them back. Offer to adjust the proposal if needed (scope, timeline, or payment structure).

**If client is leaning toward "no continuation":** Do not push. Instead, offer the SaaS downgrade with dignity — "We want you to keep the momentum going even if the timing isn't right for another engagement. Let's make sure you have Pro access and I'll check in quarterly." This preserves MRR and keeps the door open.

---

### 7-Day Mark (Renewal Cadence Day 53)

**Action:** Final pre-end outreach.
**Subject:** "We're wrapping up in 7 days — a few things to confirm."
**Body:** Final deliverables checklist. Confirm handoff documentation is ready. Restate the renewal option one final time — "The continuation offer is still on the table through [date]." Ask: "Is there anything else you need from us before we wrap up?"

**Do not use this email to hard-close.** If the client has not decided, they are not ready. The relationship matters more than the renewal. A client who felt respected at close will refer others and return.

---

### Post-Engagement (Day 60 / Engagement End)

**Day 0 (Engagement end):**
- Send final deliverables package with organized folder structure
- Send closing email: thank the client, summarize outcomes, provide 90-day emergency contact option (even without a continuation, CSM remains available for urgent questions at no charge — this is a goodwill investment)
- Request testimonial: "We'd love to share your story — would you be willing to write a few sentences about your experience?"

**Day 30 (Post-engagement check-in):**
- CSM emails: "How are things going?" Ask about grants applied, readiness progress, any obstacles.
- If GrantAQ SaaS is active: review health score. If below 60, trigger re-engagement.
- If GrantAQ SaaS is not active: soft pitch to start free tier and discover new matches.

**Day 90 (Post-engagement follow-up):**
- CSM email or call: "Checking in at the 90-day mark."
- Ask: "Have you applied for any of the grants we identified? Any awards?"
- If award received: trigger advocacy sequence immediately (testimonial, case study, referral ask).
- If no progress: offer win-back consultation (1-hour paid strategy call at $250 — low barrier, re-establishes engagement).

---

## Part 7: NPS and Feedback Collection Strategy

### NPS Philosophy

NPS is not a vanity metric. Every NPS response must result in an action: a thank-you to Promoters (with an ask), a conversation with Passives (with a diagnosis), and an escalation for Detractors (with a resolution). If no one acts on the score, do not collect it.

**Target NPS:** 55+ for the SaaS product, 65+ for consulting engagements.

---

### NPS Collection Schedule

**Free Tier:**
- Triggered NPS at Day 30 (if activated — scored 60+ on free health model)
- Survey channel: In-app modal, not email (higher response rate for free users)
- Question: "How likely are you to recommend GrantAQ to another nonprofit or grant-seeking organization?"
- Follow-up open text: "What's the one thing that would make GrantAQ more valuable to you?"
- Do not send NPS to unactivated free users — the score will be artificially low and unactionable.

**Starter:**
- Day 30 (first survey, after activation confirmed)
- Day 90 (second survey, before first renewal decision)
- In-app modal + email backup (send email 48 hours after in-app if not responded)

**Pro:**
- Day 14 (after first writing draft completed, not by calendar date)
- Day 60
- Day 120
- After first grant submitted (event-triggered, not calendar)

**Enterprise:**
- Day 30 (sent to account owner and any active team members who have logged in 3+ times)
- Day 90
- Day 180
- After any team member sets a grant to "awarded" (event-triggered)

**Consulting Clients:**
- Midpoint satisfaction check (structured 1–5 scale during midpoint call — not NPS format but equivalent data)
- Post-engagement NPS via email within 48 hours of final deliverable delivery
- 90-day post-engagement NPS via email (measures sustained satisfaction, not just closing-day relief)

**Nonprofit Formation Clients:**
- After each phase completion: post-Articles delivery, post-501(c)(3) approval, post-Grant-Ready package
- Use 1-5 scale at each phase (shorter than NPS, appropriate for milestone-by-milestone service)
- Final NPS 30 days after engagement close

---

### NPS Follow-Up Actions

**Promoters (Score 9-10):**
1. Automated thank-you email within 24 hours, signed by CSM.
2. Referral ask: "We'd love to introduce GrantAQ to organizations like yours. Do you know anyone who would benefit?" Include referral link.
3. Advocacy ask 7 days later: "Would you be willing to share a short testimonial or join our customer advisory board?"
4. Case study invitation for high-revenue accounts (Pro, Enterprise, consulting clients).

**Passives (Score 7-8):**
1. CSM follow-up email within 48 hours: "Thank you for your response. What would it take to make this a 10 for you?"
2. Listen for feature gaps or usage friction. Log all feedback to the product board.
3. Offer a check-in call if they mention specific friction. This call is diagnostic, not sales-oriented.
4. Monitor health score — Passives who hit a usage drop trigger within 30 days of their NPS survey are high-churn risk.

**Detractors (Score 0-6):**
1. CSM personal call within 24 hours. Do not send an automated email — this requires a human.
2. Objective: understand the root cause. Do not defend the product. Listen.
3. If the issue is solvable (bug, feature gap, support failure): escalate immediately and follow up with resolution.
4. If the issue is fundamental (wrong fit, unmet expectations): offer path out without friction. A graceful exit preserves relationship for future referrals.
5. Log all Detractor reasons weekly. If any reason appears 3+ times in a month, escalate to product leadership as a systemic issue.

---

### Additional Feedback Channels

**In-App Micro-Surveys (All Tiers)**
- After each Grantie conversation (1-5 stars): "Was this helpful?"
- After each Writing Draft completion: "How satisfied are you with this draft?" (1-5 stars + optional text)
- After each Readiness Assessment: "Did this assessment help you understand your next steps?" (Yes / No / Somewhat)
- After each Match Report: "Did these matches feel relevant to your organization?" (Yes / No / Somewhat)

These micro-surveys are not NPS. They are product quality signals. Route them directly to the product team weekly with trend analysis, not individual responses.

**Support Ticket CSAT (All Paid Tiers)**
- Automatically sent 24 hours after ticket closure
- 1-5 scale: "How well did we resolve your issue?"
- Target: 4.5+ average
- If 1-2 received: CSM notified immediately. Follow up within 24 hours.

**Quarterly Product Feedback Calls (Enterprise and Consulting Clients)**
- 45-minute call scheduled quarterly
- Agenda: product feedback, roadmap preview, open Q&A
- CSM facilitates. Product manager joins when possible.
- Outputs: logged feature requests, sentiment notes, relationship health update

**Annual Voice of Customer Survey (All Active Paid Subscribers)**
- Sent in month 11 of each subscription year (before renewal)
- 10 questions covering: product value, support quality, AI writing quality, match accuracy, roadmap usefulness, pricing fairness
- Results shared with full team quarterly and used to set product priorities
- Response incentive: respondents receive a $25 Amazon gift card or equivalent platform credit

---

## Part 8: Advocacy Program

Activated when a customer has: NPS score of 9-10, at least one grant awarded, and has been a customer for 90+ days.

**Reference Program:** Customers can opt in as a reference for sales conversations. Compensation: 1 free month of Pro or equivalent credit.

**Case Study Track:** CSM proposes a co-authored case study (GrantAQ writes it, customer approves). Published on website and used in sales. Customer gets featured visibility and a co-branded PDF to share.

**Referral Program:** The existing referral system (built in Phase 6 with `src/lib/referral/index.ts`) handles referral link tracking and rewards. CSM's role is to surface the referral opportunity at the right moment (post-award, post-NPS, post-positive support ticket resolution).

**Advisory Board:** 8-12 customers across segments invited annually. Quarterly calls, product previews, direct access to founders. Selection criteria: NPS 9-10, varied segments (nonprofit, for-profit, formation, consulting), geographic diversity.

---

## Part 9: Success KPIs and Targets

| Metric | Free | Starter | Pro | Enterprise | Consulting |
|--------|------|---------|-----|------------|------------|
| Activation Rate | 60% / 48 hrs | 75% / 7 days | 80% / 14 days | 85% / 21 days | 100% / 5 days |
| NPS Target | — | 50+ | 60+ | 65+ | 70+ |
| CSAT (Support) | — | 90%+ | 92%+ | 95%+ | 97%+ |
| Churn Rate (Monthly) | N/A | <6% | <4% | <2% | <5% / engagement |
| Renewal Rate (Annual) | — | 75%+ | 85%+ | 92%+ | 60% continuation |
| Upsell Conversion | 8% to Starter | 15% to Pro | 10% to Enterprise | — | 40% to SaaS |
| Response Time (CSM) | 24 hrs (email) | 4 hrs | 2 hrs | 1 hr | 2 hrs |
| Health Score Avg | 50+ | 65+ | 70+ | 75+ | 80+ |
| Advocacy Enrollment | — | 5% of base | 10% of base | 20% of base | 30% of engagements |

---

## Appendix: Email Templates Index

The following templates should be built in Resend (GrantAQ's email provider) and triggered by the event conditions described above.

| Template ID | Trigger | Segment | Channel |
|-------------|---------|---------|---------|
| CS-001 | Signup | Free | Email |
| CS-002 | Day 3, readiness not run | Free | Email |
| CS-003 | Day 7, not activated | Free | Email |
| CS-004 | New subscriber welcome | Starter | Email |
| CS-005 | Day 7 check-in | Starter | CSM Email |
| CS-006 | New subscriber welcome | Pro | Email |
| CS-007 | Day 3, no draft started | Pro | Email |
| CS-008 | Day 7 check-in | Pro | CSM Email |
| CS-009 | New subscriber welcome | Enterprise | Email |
| CS-010 | Kickoff call invite | Enterprise | CSM Email |
| CS-011 | Login gap 14 days | Starter/Pro | Email |
| CS-012 | Login gap 7 days | Enterprise | CSM Email |
| CS-013 | Cancellation save attempt | All Paid | CSM Email |
| CS-014 | Failed payment day 0 | All Paid | Email |
| CS-015 | Failed payment day 3 | All Paid | Email |
| CS-016 | Failed payment day 7 | All Paid | Email |
| CS-017 | Free to Starter upsell trigger | Free | Email |
| CS-018 | Starter to Pro upsell trigger | Starter | Email |
| CS-019 | First grant awarded celebration | All Paid | CSM Email |
| CS-020 | NPS Promoter thank-you + referral | All | Email |
| CS-021 | NPS Passive follow-up | All | CSM Email |
| CS-022 | Consulting midpoint follow-up | Consulting | CSM Email |
| CS-023 | Consulting 45-day renewal | Consulting | CSM Email |
| CS-024 | Consulting 30-day renewal proposal | Consulting | CSM Email |
| CS-025 | Consulting 14-day renewal follow-up | Consulting | CSM Email |
| CS-026 | Consulting 7-day final notice | Consulting | CSM Email |
| CS-027 | Consulting post-engagement close | Consulting | CSM Email |
| CS-028 | Consulting 30-day post-engagement | Consulting | CSM Email |
| CS-029 | Consulting 90-day post-engagement | Consulting | CSM Email |
| CS-030 | Formation interest trigger | All | Email |
| CS-031 | Low readiness score (<50) consulting offer | Free/Starter | Email |
| CS-032 | Win-back day 15 | Churned Paid | Email |
| CS-033 | Win-back day 45 | Churned Paid | Email |
| CS-034 | Win-back day 90 | Churned Paid | Email |
| CS-035 | Annual Voice of Customer survey | All Paid (Month 11) | Email |

---

*Document maintained by: Customer Success Lead*
*Last updated: March 2026*
*Review cycle: Quarterly*
