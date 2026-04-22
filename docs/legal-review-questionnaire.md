# GrantAQ — Legal Review Questionnaire

**Audience:** US-based SaaS attorney familiar with online services, Stripe payment
processing, and AI disclaimers. Target time: **30-minute review.**

**Entity:** Friedman Global LLC (operating GrantAQ)
**Jurisdiction clause:** State of Georgia, American Arbitration Association consumer rules
**Relevant docs:**
- `/terms` — https://www.grantaq.com/terms
- `/privacy` — https://www.grantaq.com/privacy

---

## Context in one paragraph

GrantAQ is a subscription SaaS (Free / $79 / $149 / $249 / $499 monthly tiers)
that uses AI to help US nonprofits and small businesses find and write grant
applications. Customers pay a **recurring subscription** AND a **success fee
of 3–5%** on any grant funding they receive where GrantAQ materially assisted
the application. We want the terms to be enforceable, hold up against
chargebacks, and survive subscription cancellation.

---

## The 10 questions we need answered

### 1. Success fee enforceability

We charge a percentage of awarded grant funding (3–5% by tier). Is this
structurally enforceable as a contractual obligation in all 50 states?
Specifically:
- Any states where success fees on grants are restricted or regulated
  differently than SaaS fees? (Nonprofits are the typical customer.)
- Does billing this via **Stripe invoice** (rather than a card on file)
  create any issues?

### 2. Success fee survives cancellation

Our terms say the fee is owed on awards from drafts created during an
active subscription, even if the customer cancels before the award is
received. Is this enforceable?

### 3. Reporting obligation

We require customers to notify us within 14 days of an award. We also
reserve the right to audit their pipeline. Is this enforceable? Any
jurisdiction-specific issues with the audit clause?

### 4. Rate lock at draft time

Current clause: "Your success fee rate is locked to the tier you held at
the time the grant application was drafted. Upgrading does not
retroactively lower fees on prior drafts; downgrading does not
retroactively raise them."

Is this standard language for tiered pricing or does it need reworking?

### 5. Non-refundable payment policy

We have **no refund policy** — all sales final, including unused
subscription time. Rationale: AI generation consumes real API compute cost
(OpenAI/Anthropic tokens) that we cannot recover.

- Does this hold up in small-claims or chargeback disputes?
- Should we add a carve-out for billing errors / duplicate charges?
- Any state laws that override this (e.g., California auto-renewal law)?

### 6. Chargeback clause

Current clause: "Initiating a chargeback without first contacting us to
resolve the issue is a violation of these Terms and may result in immediate
account termination plus collection of any outstanding success fees."

Does this clause survive the Visa/Mastercard merchant agreement terms? Will
Stripe support us if we invoke it?

### 7. AI disclaimer adequacy

We prominently disclose:
- AI-generated content must be reviewed before submission
- We don't guarantee grant funding
- User is solely responsible for accuracy

Is the current language (see `/terms` §3 "AI Disclosure" and §4 "No
Guarantee of Funding") sufficient to shield us from:
- A grant application containing AI hallucinations that costs a funder
- Claims of "unauthorized practice of grant writing" if we're not licensed

### 8. Nonprofit formation services (§6)

We prepare formation documents (IRS 1023/1023-EZ, articles of
incorporation, bylaws) but don't provide legal advice. Current disclaimer
says "not a law firm."

- Is the disclaimer enough or do we need additional language?
- Specific states (CA, NY, TX) that restrict non-attorney document
  preparation? Any compliance we need to add?

### 9. Arbitration + class action waiver (§10)

We require binding arbitration (AAA Consumer Rules) and waive class
actions. Georgia choice of law.

- Any concerns with this for a consumer-facing product?
- Do we need a mass arbitration defense clause (multiple coordinated
  claims)?

### 10. Data handling

We store customer-uploaded docs (organization docs, grant drafts, EIN,
board info). We use customer data to train AI only in aggregate /
anonymized form. Our Privacy Policy covers GDPR-style rights.

- Is the privacy policy sufficient for CCPA, CPRA, Virginia, Colorado, and
  Connecticut privacy laws?
- Any specific risk with storing EIN and 501(c)(3) determination letters?

---

## Biggest red flags we want you to challenge

- **Success fee audit right** — does it create a problematic ongoing
  relationship that customers could argue fiduciary against?
- **Chargeback clause** — is it a paper tiger or real deterrent?
- **Limitation of liability** — $100-or-trailing-12-month cap. Aggressive?

---

## What we're NOT asking you to do (save time)

- Draft new clauses from scratch — we'll do that with your guidance
- Review the Privacy Policy line-by-line unless you spot something obvious
- Advise on company formation, tax, or IP matters
- Advise on individual state-level marketing law compliance

---

## Deliverable we'd like back

A short memo (1-2 pages) with:
1. **Red flags** — clauses that won't survive as written, ranked by risk
2. **Suggested rewrites** — your preferred language for items in #1
3. **Tier-1 cleanups** — nice-to-have polish, not blocking launch

Budget: **30 minutes** at your usual rate. Follow-up tier if anything in
the above triggers a deeper review you'd recommend.

---

**Contact:**
- Primary: hello@grantaq.com
- Entity: Friedman Global LLC, State of Georgia
- Expected first paying customer: immediate (pending legal sign-off)
