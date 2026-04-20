# Universal Service Manual Generator Prompt

**How to use:** Copy everything below the line. Replace all `[BRACKETS]` with your product's actual data. Paste into Claude, ChatGPT, or any AI. It will generate a complete service manual document covering every service your SaaS offers.

---

## — START OF PROMPT —

You are a senior SaaS operations consultant. I need you to create a **Complete Service Manual** for my SaaS product. This is an internal document that any team member, contractor, or virtual assistant can use to understand and fulfill every service we offer.

**Generate a Word document (.docx) with the following structure for EVERY service listed below.**

### MY PRODUCT DETAILS

```
PRODUCT NAME:           [Your Product Name]
PRODUCT URL:            [https://www.yourproduct.com]
WHAT IT DOES:           [One paragraph — what the product does and who it's for]
COMPANY NAME:           [Your Company Name]
TARGET MARKET:          [e.g., Small businesses, nonprofits, agencies, developers]
TECH STACK:             [e.g., Next.js, Supabase, OpenAI, Stripe, Resend]
AI PROVIDER:            [e.g., OpenAI GPT-4o, Claude, Groq, None]
PAYMENT PROCESSOR:      [e.g., Stripe, Paddle, LemonSqueezy]
EMAIL PROVIDER:         [e.g., Resend, SendGrid, Postmark]
```

### MY SERVICES (List every service your product offers)

For each service, provide:
```
SERVICE NAME:           [Name]
PRICE:                  [e.g., FREE, $99, $997, $249/mo]
TYPE:                   [Free / Subscription / One-time / Per-use / Add-on]
CATEGORY:               [e.g., Lead Generation, Core Platform, Service Engagement, Writing, Retention]
ONE-LINE DESCRIPTION:   [What it does in one sentence]
```

**List ALL services here — include free features, paid tiers, one-time services, add-ons, platform features, and automated systems:**

```
1.  [Service Name] — [Price] — [Type] — [One-line description]
2.  [Service Name] — [Price] — [Type] — [One-line description]
3.  [Service Name] — [Price] — [Type] — [One-line description]
4.  [Service Name] — [Price] — [Type] — [One-line description]
5.  [Service Name] — [Price] — [Type] — [One-line description]
6.  [Service Name] — [Price] — [Type] — [One-line description]
7.  [Service Name] — [Price] — [Type] — [One-line description]
8.  [Service Name] — [Price] — [Type] — [One-line description]
9.  [Service Name] — [Price] — [Type] — [One-line description]
10. [Service Name] — [Price] — [Type] — [One-line description]
[Add or remove as needed — include EVERY service, feature, and plan]
```

### FOR EACH SERVICE, GENERATE ALL OF THESE SECTIONS:

**Every service MUST have all 14 sections below. No exceptions. No shortcuts. Do not skip any section for any service, even if the service is free or automated.**

#### Section 1: What It Is
- Full description of the service in 3-5 sentences
- What problem it solves
- Why it exists in the product
- How it fits in the overall customer journey

#### Section 2: Who This Helps (Customer Types)
- List 3-7 specific customer types who would use this service
- Include their role, company stage, and why they need it
- Be specific (not "anyone" — name the persona)

#### Section 3: What Exactly It Does (Technical)
- Technical flow: what happens when the user triggers this service
- API routes involved (if applicable)
- AI models used (if applicable)
- Database tables affected
- Third-party services called
- Data flow from input to output

#### Section 4: Expected Outcome
- What the customer walks away with
- How their situation improves after using this service
- Conversion metrics (what % upgrade, purchase next, etc.)
- Emotional outcome (confidence, clarity, relief, etc.)

#### Section 5: Who Does the Work
- Exactly who fulfills this service: AI, human, VA, combination
- If human: what role (strategist, writer, reviewer, CSM)
- If AI: which model and what it generates
- If VA: what tasks they handle
- Total human hours required per delivery

#### Section 6: AI vs Human Split
- Exact percentage: e.g., "70% AI, 30% human strategist"
- What AI handles vs what human handles
- Can this be fully automated? If not, why not?
- Could a VA replace the human component? At what quality tradeoff?

#### Section 7: How Long It Takes
- User time (how long the customer spends)
- System time (how long the AI/system takes)
- Delivery time (when the customer receives the deliverable)
- Total elapsed time from purchase to completion
- If there are human steps: how long each human step takes

#### Section 8: Exact Process (Scope of Work)
- Every single step from start to finish, numbered sequentially
- Include what the SYSTEM does automatically at each step
- Include what the HUMAN does (if applicable) with time estimates
- Include what the CUSTOMER does at each step
- For calls/meetings: provide minute-by-minute agenda
- For email sequences: list each email with trigger and timing
- For automated services: describe the exact API/AI flow
- Nothing should be vague — every step is actionable

#### Section 9: Competitor Pricing
- What competitors charge for an equivalent service
- Name specific competitors and their prices
- If no competitor offers this: state "No direct competitor" and explain closest alternative
- Calculate savings vs competitor pricing (e.g., "60-80% cheaper")
- Note any competitor advantages (e.g., larger database, more features)

#### Section 10: Cost to Deliver
- AI/API costs per delivery (token costs, API calls)
- Human labor costs per delivery (hours × rate)
- VA costs per delivery (if applicable)
- Tool/software costs per delivery
- Total cost per delivery
- Gross margin percentage
- Break-even analysis (how many deliveries to cover fixed costs)

#### Section 11: Exact Deliverables
- List every single item the customer receives
- Use bullet points — one item per line
- For complex deliverables: add sub-bullets with specifics
- Include both tangible (documents, reports) and intangible (calls, support time)
- Include any automated follow-ups (emails, reminders)

#### Section 12: Quality Checks
- What to verify before marking the service as complete
- Specific things to check (not generic "ensure quality")
- Common failure points and how to catch them
- Client satisfaction verification method

#### Section 13: Escalation Procedures
- What to do when something goes wrong
- Common issues and their solutions
- When to involve a manager
- When to offer a refund or redo
- How to handle difficult/unhappy clients

#### Section 14: Internal SOP (Standard Operating Procedure)
- What staff/contractors do DAILY regarding this service
- What to monitor WEEKLY
- What to review MONTHLY
- Performance metrics to track
- Tools used for fulfillment
- Where files/deliverables are stored
- How to hand off between team members

### DOCUMENT FORMATTING REQUIREMENTS

- Use Heading 1 for product name/title
- Use Heading 2 for each service name (numbered)
- Use Heading 3 for each of the 14 sections within a service
- Use bullet points for lists
- Use sub-bullets (indented) for nested items
- Bold key terms and important numbers
- Include price and category in italic under each service heading
- Add page breaks between major service categories
- Start with a table of contents listing all services

### ADDITIONAL REQUIREMENTS

1. **Do NOT output as chat text.** Build the actual .docx file and present for download.
2. **Every cell must be filled.** No "N/A" unless truly not applicable. No "See above." No "Same as previous."
3. **Be specific, not generic.** "Check that the report generates" is bad. "Verify that all 5 audit layers have content, scores are 0-100, funder matches are real programs, and PDF download works" is good.
4. **Process steps must be actionable.** Any new hire should be able to follow them without additional training.
5. **Include the economics.** Every service needs cost-to-deliver and margin. This is an operations manual, not a marketing document.
6. **Group services by category** with category headers and page breaks between categories.
7. **End with a summary table** showing: all services, prices, AI/human split, delivery time, cost, margin, in one sortable view.

### ALSO GENERATE AN EXCEL SPREADSHEET (.xlsx) WITH:

**Tab 1: Service Overview** — One row per service with columns: #, Service Name, Price, Category, Type, Customer Types, AI vs Human, Delivery Time, Cost to Deliver, Margin, Competitor Pricing

**Tab 2: Detailed Deliverables** — One row per deliverable across all services: Service Name, Deliverable Item, Format (PDF/email/call/document/badge), Delivery Method (instant/email/shared folder/in-app), Who Creates It (AI/human/system)

**Tab 3: Process Steps** — One row per process step across all services: Service Name, Step #, Step Description, Who Does It (system/human/customer), Time Estimate, Tools Used

**Tab 4: Economics** — One row per service: Service Name, Price, AI Cost, Human Hours, Human Cost, VA Hours, VA Cost, Tool Costs, Total Cost, Gross Margin %, Revenue at 10 sales, Revenue at 100 sales

**Tab 5: Competitor Comparison** — One row per service: Service Name, Our Price, Competitor 1 Name + Price, Competitor 2 Name + Price, Our Advantage, Customer Savings %

Format the spreadsheet professionally: headers with dark teal background (#0D9488) and white text, thin borders, wrapped text, frozen top row, auto-filters, column widths appropriate for content.

## — END OF PROMPT —

---

## TIPS FOR BEST RESULTS

1. **List ALL services** — don't skip free features or automated systems. Include everything a user can interact with.

2. **Be specific about your tech** — name the exact AI model, database, email provider. Generic answers produce generic manuals.

3. **Include pricing for everything** — even if something is "included" in a subscription, list it. The manual needs to know what's free vs paid.

4. **Name your competitors** — don't say "competitors charge more." Say "Instrumentl charges $299/mo for matching only, with no writing or diagnostics."

5. **Describe your ideal customers** — don't say "small businesses." Say "LLC owners with $100K-$500K revenue exploring grants for the first time."

6. **Run it in Claude with file creation** — Claude can generate both .docx and .xlsx files directly. ChatGPT may output text instead.

7. **For large service catalogs (20+)**: You may need to run this in 2 passes — first pass for services 1-15, second pass for 16+, then ask the AI to merge into one document.

8. **After generation**: Review each service for accuracy. The AI will make reasonable assumptions — correct any that don't match your actual operations.

## EXAMPLE FILLED IN (GrantAQ)

```
PRODUCT NAME:           GrantAQ
PRODUCT URL:            https://grantaq.com
WHAT IT DOES:           AI-powered grant discovery, eligibility assessment, readiness diagnostics, and grant writing platform for nonprofits and small businesses. Matches organizations to 6,300+ grants, runs 10-step readiness diagnostics, and provides AI + expert grant writing services.
COMPANY NAME:           Friedman Global LLC
TARGET MARKET:          First-time grant seekers — small businesses, new nonprofits, established organizations exploring grants
TECH STACK:             Next.js 16, Supabase (PostgreSQL + pgvector), Vercel, Tailwind CSS
AI PROVIDER:            OpenAI GPT-4o + GPT-4o-mini + text-embedding-3-small
PAYMENT PROCESSOR:      Stripe
EMAIL PROVIDER:         Resend

1.  Free Eligibility Check — FREE — Free — Instant AI eligibility verdict, no login required
2.  Eligibility Status — FREE — Free — Detailed AI eligibility assessment for signed-up users
3.  Readiness Diagnostic — FREE (1x) — Free — 10-step comprehensive AI diagnostic
4.  Compliance Calendar — FREE — Free — Auto-generated compliance deadlines
5.  Portfolio Tracker — FREE — Free — Post-award grant management
6.  Explorer Plan — $0/mo — Subscription — Free tier with 7-day trial
7.  Seeker Plan — $79/mo — Subscription — Full library, 10 pipeline, calendar
8.  Strategist Plan — $149/mo — Subscription — Unlimited scorecard, analytics, vault
9.  Applicant Plan — $249/mo — Subscription — AI writing, expert review
10. Organization Plan — $499/mo — Subscription — Dedicated writer, team, API, CSM
... [and so on for all 34 services]
```
