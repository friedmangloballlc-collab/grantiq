// src/app/(marketing)/terms/page.tsx
//
// Comprehensive Terms of Service — rewritten April 22, 2026 with
// maximum enforceable protection under US SaaS case law:
//
//   - Conspicuous no-guarantee-of-funding disclaimers (multiple places)
//   - Mandatory binding arbitration (AAA Consumer Rules) + class
//     waiver per AT&T v. Concepcion (2011), Epic Systems v. Lewis
//   - Mass arbitration defense (batch procedures, sequential filing
//     fees) — post-Viking River Cruises hardening
//   - Chargeback clause: pre-dispute contact requirement, evidence
//     consent, immediate account termination, success-fee acceleration
//   - Non-refundable payment policy with non-recoverable-cost rationale
//   - Limitation of liability at $100-or-12-month-fees
//   - 1-year contractual statute of limitations (reduced from UCC 4yr)
//   - E-SIGN consent to electronic contracting (15 U.S.C. §7001)
//   - No-reliance clause (waives fraud/misrepresentation beyond 4 corners)
//   - Indemnification from user for their misuse
//   - Assumption of risk for AI output
//   - Scrivener framing for nonprofit formation (UPL insulation)
//   - Success-fee rate table locked at tier-at-draft-time
//   - Reporting obligation (14 days) + audit rights
//
// Version tracked in src/lib/legal/terms-version.ts. When updating,
// bump the version string and the effective date in the header.

import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { CURRENT_TERMS_LABEL, CURRENT_TERMS_VERSION } from "@/lib/legal/terms-version";

export const metadata: Metadata = {
  title: "Terms of Service — GrantAQ",
  description:
    "Binding agreement governing your use of GrantAQ. Includes success fee, non-refundable payment, mandatory arbitration, and class action waiver.",
  alternates: { canonical: "https://grantaq.com/terms" },
};

export default function TermsOfServicePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-warm-800 dark:text-warm-200">
      <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-warm-500 mb-2">
        {CURRENT_TERMS_LABEL} &mdash; Version{" "}
        <code className="font-mono text-xs">{CURRENT_TERMS_VERSION}</code>
      </p>
      <p className="text-sm text-warm-500 mb-8">
        These Terms are a legally binding contract. Please read them carefully.
      </p>

      {/* Prominent opening disclosures — placed before any section so they
          appear in full view on first load. Clickwrap enforceability
          (Meyer v. Uber, Specht v. Netscape) turns on "reasonable notice." */}
      <div className="mb-10 p-5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-100">
              Important — please read these five points before using GrantAQ:
            </p>
            <ol className="list-decimal pl-5 mt-3 space-y-2 text-amber-900 dark:text-amber-100 text-sm leading-relaxed">
              <li>
                <strong>We do NOT guarantee any grant award.</strong> AI
                matches, scores, and drafts are estimates. Funders decide, not
                us.
              </li>
              <li>
                <strong>All payments are final and non-refundable.</strong>{" "}
                Subscriptions, one-time fees, and success fees are not
                refunded for any reason.
              </li>
              <li>
                <strong>
                  You owe a 3%–5% success fee on any grant funds awarded
                </strong>{" "}
                on applications GrantAQ assisted with, even after your
                subscription ends.
              </li>
              <li>
                <strong>
                  Filing a chargeback without first contacting support is a
                  contract violation
                </strong>{" "}
                and triggers immediate account termination plus acceleration
                of all outstanding fees.
              </li>
              <li>
                <strong>
                  All disputes are resolved by binding arbitration.
                </strong>{" "}
                You waive your right to a jury trial and to participate in a
                class action.
              </li>
            </ol>
            <p className="mt-4 text-xs text-amber-800 dark:text-amber-200 font-medium">
              By clicking &quot;I agree&quot; at signup, you accept every
              section of these Terms.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <p className="text-sm mb-8 text-warm-700 dark:text-warm-300 leading-relaxed">
        These Terms of Service (the <strong>&quot;Terms&quot;</strong>) form a
        binding contract between you (<strong>&quot;you,&quot;</strong>{" "}
        <strong>&quot;your,&quot;</strong> or{" "}
        <strong>&quot;Customer&quot;</strong>) and{" "}
        <strong>Friedman Global LLC</strong>, a Georgia limited liability
        company operating GrantAQ (<strong>&quot;GrantAQ,&quot;</strong>{" "}
        <strong>&quot;we,&quot;</strong> <strong>&quot;us,&quot;</strong>{" "}
        <strong>&quot;our,&quot;</strong> or the{" "}
        <strong>&quot;Company&quot;</strong>). By creating an account, clicking
        &quot;I agree,&quot; accessing any part of grantaq.com, or using the
        GrantAQ platform in any way, you confirm that you (a) have read and
        understand these Terms, (b) have the authority to bind yourself and
        your organization to these Terms, and (c) accept every section below
        without modification. If you do not agree, you must not use GrantAQ.
      </p>

      <Section title="1. Acceptance &amp; E-Sign Consent">
        <p>
          These Terms are entered electronically. You consent to the use of
          electronic records and signatures under the federal E-SIGN Act (15
          U.S.C. §7001 <em>et seq.</em>) and comparable state statutes. An
          electronic &quot;I agree&quot; click, checkbox, or signup action is
          the legal equivalent of a wet-ink signature. You may withdraw this
          consent only by terminating your account.
        </p>
        <p className="mt-3">
          We record the version of these Terms you accepted, the date and
          time of acceptance, the IP address and browser string present at
          the moment of acceptance, and the user identifier of the accepting
          party. That record is admissible as evidence of this contract.
        </p>
      </Section>

      <Section title="2. Service Description">
        <p>
          GrantAQ is an AI-powered software platform that helps US
          nonprofits and small businesses discover, evaluate, and draft grant
          applications. The service includes AI-generated grant matching,
          AI-drafted application text, readiness scoring, pipeline
          management, compliance calendaring, and optional nonprofit
          formation document assistance.
        </p>
        <p className="mt-3">
          GrantAQ is <strong>software</strong>, not a grant-writing firm, law
          firm, accounting firm, or consulting firm. We do not become your
          agent. We do not communicate with funders on your behalf. Every
          grant application is submitted by you, in your name.
        </p>
      </Section>

      <Section title="3. AI Disclosure &amp; Assumption of Risk" id="ai-disclosure">
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
            AI-Generated Content — Critical.
          </p>
          <p>
            Grant matches, scores, drafts, critiques, and recommendations on
            GrantAQ are generated by large language models and other AI
            systems. AI output is probabilistic, may contain errors or
            hallucinated facts, and is not reviewed by a human on your behalf
            before delivery.
          </p>
        </div>
        <p className="mt-4">
          You agree: (a) to independently review every AI-generated output
          before submitting it to any funder, (b) that you are solely
          responsible for the truthfulness, accuracy, and completeness of
          anything submitted, (c) that AI drafts are a starting point and not
          a finished application, and (d) that submitting AI-generated
          content without human review is your decision and at your risk.
        </p>
        <p className="mt-3 font-semibold">
          <strong>
            You assume all risk arising from reliance on AI-generated output,
            including without limitation the risk of funder rejection,
            reputational harm, audit, or legal claims by a funder against
            you.
          </strong>
        </p>
      </Section>

      <Section title="4. No Guarantee of Funding or Outcome" id="no-guarantee">
        <div className="p-4 rounded-lg bg-warm-100 dark:bg-warm-800 border-2 border-warm-300 dark:border-warm-600">
          <p className="font-semibold">
            GrantAQ does not guarantee, promise, or warrant any grant award,
            funding outcome, or application success.
          </p>
          <p className="mt-3">
            Match scores, readiness assessments, and probability-of-award
            estimates are AI-generated approximations based on historical
            patterns. They are <strong>not predictions</strong>. Funders have
            sole and absolute discretion in their award decisions. Past
            performance of any grant program is not indicative of future
            results for your application.
          </p>
          <p className="mt-3">
            No employee, agent, or affiliate of GrantAQ is authorized to make
            a guarantee of funding. Any oral or written statement to the
            contrary is unauthorized and not binding on GrantAQ.
          </p>
        </div>
      </Section>

      <Section title="5. Account &amp; Accuracy Responsibility">
        <p>
          You are responsible for the accuracy and completeness of all
          information you provide, including your organization profile, EIN,
          financial data, board information, and uploaded documents. Inaccurate
          information produces poor AI outputs and is not grounds for a
          refund, fee waiver, or claim against GrantAQ.
        </p>
        <p className="mt-3">
          You are responsible for the security of your account credentials
          and for all activity that occurs under your account. Notify us
          immediately at{" "}
          <a href="mailto:security@grantaq.com" className="text-brand-teal hover:underline">
            security@grantaq.com
          </a>{" "}
          if you suspect unauthorized access. We are not liable for any loss
          resulting from your failure to protect your credentials.
        </p>
      </Section>

      <Section title="6. Payment Terms">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Subscription billing:</strong> Paid plans are billed via
            Stripe on a monthly or annual basis. Subscriptions automatically
            renew at the then-current price until canceled. California
            customers receive an annual renewal reminder as required by Cal.
            Bus. &amp; Prof. Code §17600 <em>et seq.</em>
          </li>
          <li>
            <strong>Plan changes:</strong> Upgrades take effect immediately
            and are prorated. Downgrades take effect at the next billing
            cycle with no refund for the unused portion of the higher tier.
          </li>
          <li>
            <strong>Failed payments:</strong> If a payment fails, we may
            restrict access to the platform until payment is resolved. We may
            attempt retries and charge you for reasonable collection costs.
          </li>
          <li>
            <strong>Taxes:</strong> All fees are exclusive of sales, use,
            VAT, or similar taxes. You are responsible for any taxes
            applicable to your use of the service.
          </li>
          <li>
            <strong>Price changes:</strong> We may change prices with 30
            days&apos; notice to your email on file. Continued use after the
            change effective date constitutes acceptance.
          </li>
        </ul>
      </Section>

      <Section title="7. Non-Refundable Policy" id="no-refunds">
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800">
          <p className="font-bold text-red-900 dark:text-red-100 mb-2">
            All sales are final. All payments are non-refundable.
          </p>
          <p className="text-red-900 dark:text-red-200">
            This includes, without limitation: monthly subscription fees,
            annual subscription fees, one-time purchase fees, add-on fees,
            success fees on awarded grants, and any other amount paid to
            GrantAQ. No refund will be issued for:
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-1 text-red-900 dark:text-red-200 text-sm">
            <li>Unused portions of a subscription period after cancellation</li>
            <li>Change of mind, change of need, or loss of funding</li>
            <li>Failure of a grant application to be awarded</li>
            <li>Dissatisfaction with AI-generated output</li>
            <li>Your organization ceasing operations</li>
            <li>Any reason at all unless required by applicable law</li>
          </ul>
        </div>
        <p className="mt-4">
          Rationale: AI generation consumes real, non-recoverable compute
          costs (third-party API tokens billed to us by our model providers)
          the moment a request is initiated. We cannot recover those costs
          on a refund, and we decline to offer one.
        </p>
        <p className="mt-3">
          <strong>Cancellation alternative:</strong> You may cancel a
          recurring subscription at any time from account settings to stop
          future charges. Cancellation stops the next billing cycle; it does
          not refund the current or any prior cycle.
        </p>
        <p className="mt-3">
          <strong>Billing errors only:</strong> If you believe you were
          charged in error (for example, a duplicate charge or a charge for
          a plan you did not select), you must contact us at{" "}
          <a href="mailto:billing@grantaq.com" className="text-brand-teal hover:underline">
            billing@grantaq.com
          </a>{" "}
          within <strong>7 days</strong> of the charge. We will investigate
          in good faith and correct genuine errors. Failure to contact us
          within 7 days waives any billing-error claim.
        </p>
      </Section>

      <Section title="8. Chargeback &amp; Dispute Terms" id="chargebacks">
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="font-semibold text-red-900 dark:text-red-100">
            Filing a chargeback with your card issuer without first
            contacting GrantAQ is a material breach of these Terms.
          </p>
        </div>
        <p className="mt-4">
          Before initiating any chargeback, reversal, or dispute with your
          card issuer, bank, or payment provider, you must give GrantAQ at
          least <strong>ten (10) business days</strong> to respond by
          emailing{" "}
          <a href="mailto:billing@grantaq.com" className="text-brand-teal hover:underline">
            billing@grantaq.com
          </a>{" "}
          with a good-faith description of your dispute. We will respond and
          attempt in good faith to resolve the issue.
        </p>
        <p className="mt-3">
          <strong>Consent to evidence submission.</strong> If you file a
          chargeback, you consent to GrantAQ submitting to the card issuer
          and payment network the following as evidence of your legitimate
          use of the service: account creation timestamp, IP address at
          signup, Terms of Service acceptance record, usage logs, AI
          generation records, email delivery logs, your identity
          verification records, and any communication between you and
          GrantAQ support. This consent survives chargeback.
        </p>
        <p className="mt-3">
          <strong>Consequences of a chargeback filed without pre-contact.</strong>
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Immediate termination of your GrantAQ account</li>
          <li>
            <strong>
              Acceleration of all outstanding success fees
            </strong>{" "}
            owed under §9; full amount becomes immediately due
          </li>
          <li>
            Reasonable collection costs, including attorney&apos;s fees
            incurred to collect
          </li>
          <li>
            We may report the chargeback pattern to industry chargeback
            databases, which may affect your ability to make future online
            purchases
          </li>
        </ul>
        <p className="mt-3">
          We are not liable to you for account termination or fee
          acceleration triggered by a chargeback you filed without
          pre-contact.
        </p>
      </Section>

      <Section title="9. Success Fees" id="success-fees">
        <div className="p-4 rounded-lg bg-brand-teal/5 border border-brand-teal/20 mb-4">
          <p className="font-semibold text-warm-900 dark:text-warm-50 mb-2">
            Every GrantAQ account — including the free tier — owes a success
            fee on grant funding awarded on applications that GrantAQ
            materially assisted.
          </p>
          <p>
            The Success Fee is a <strong>technology performance fee</strong>,
            not a fundraising commission. GrantAQ never solicits
            contributions on your behalf, never contacts funders on your
            behalf, never takes custody or control of your grant funds, and
            never submits applications in its own name. Payment of the
            Success Fee is a contractual obligation between you and GrantAQ.
          </p>
        </div>

        <p className="font-semibold mt-6 mb-3">Rates by tier:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-warm-200 dark:border-warm-800 rounded-lg">
            <thead>
              <tr className="bg-warm-50 dark:bg-warm-900/50 text-xs uppercase tracking-wider text-warm-600 dark:text-warm-400">
                <th className="text-left font-semibold py-2 px-3 border-b border-warm-200 dark:border-warm-800">Tier</th>
                <th className="text-left font-semibold py-2 px-3 border-b border-warm-200 dark:border-warm-800">Subscription</th>
                <th className="text-right font-semibold py-2 px-3 border-b border-warm-200 dark:border-warm-800">Success fee</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50">Free</td><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50 text-warm-500">$0</td><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50 text-right tabular-nums font-semibold">5%</td></tr>
              <tr><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50">Starter</td><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50 text-warm-500">$79/mo</td><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50 text-right tabular-nums font-semibold">5%</td></tr>
              <tr><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50">Pro</td><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50 text-warm-500">$149/mo</td><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50 text-right tabular-nums font-semibold">5%</td></tr>
              <tr><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50">Growth</td><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50 text-warm-500">$249/mo</td><td className="py-2 px-3 border-b border-warm-100 dark:border-warm-800/50 text-right tabular-nums font-semibold">4%</td></tr>
              <tr><td className="py-2 px-3">Enterprise</td><td className="py-2 px-3 text-warm-500">$499/mo</td><td className="py-2 px-3 text-right tabular-nums font-semibold text-brand-teal-text">3%</td></tr>
            </tbody>
          </table>
        </div>

        <p className="font-semibold mt-6 mb-3">Terms:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>When a fee is owed:</strong> On any grant application
            that GrantAQ materially assisted by matching, drafting, editing,
            reviewing, or generating supporting content, and on which your
            organization subsequently receives any award of funding.
          </li>
          <li>
            <strong>Survives cancellation:</strong> The Success Fee is owed
            even if your subscription has been canceled or terminated at the
            time of the award, provided the relevant GrantAQ assistance
            occurred while your account was active.
          </li>
          <li>
            <strong>Rate locked at draft time:</strong> The Success Fee rate
            is locked to the tier held at the time the grant application was
            drafted, edited, or materially assisted. Upgrades do not
            retroactively lower rates on prior drafts; downgrades do not
            retroactively raise them.
          </li>
          <li>
            <strong>Reporting obligation:</strong> You must notify GrantAQ
            within <strong>fourteen (14) days</strong> of receiving notice
            of a grant award on any GrantAQ-assisted application. Notice to{" "}
            <a href="mailto:billing@grantaq.com" className="text-brand-teal hover:underline">
              billing@grantaq.com
            </a>{" "}
            with the funder name, award amount, and date of award.
          </li>
          <li>
            <strong>Audit rights:</strong> We reserve the right to audit
            your pipeline, public grant databases, and any other source of
            award information for up to three (3) years after the end of
            your subscription. You agree to cooperate with reasonable audit
            inquiries.
          </li>
          <li>
            <strong>Calculation:</strong> Fee = (Awarded Amount) × (Locked
            Rate). On partial awards, calculated on the actual awarded
            amount. On multi-year grants, calculated on the full total
            awarded value across the grant period, not annualized.
          </li>
          <li>
            <strong>Payment timing:</strong> Success Fees are due within{" "}
            <strong>thirty (30) days</strong> of your organization receiving
            the awarded funds.
          </li>
          <li>
            <strong>Invoicing:</strong> GrantAQ will issue an invoice via
            Stripe. Invoices not paid within 30 days accrue interest at
            1.5% per month on the outstanding balance, compounded monthly.
          </li>
          <li>
            <strong>Collection costs:</strong> If we refer a past-due
            Success Fee to collection, you agree to pay all reasonable
            collection costs, including attorney&apos;s fees.
          </li>
          <li>
            <strong>No custody of funds:</strong> GrantAQ never takes
            custody of your grant funds. You receive the award directly and
            pay the Success Fee separately.
          </li>
        </ul>
      </Section>

      <Section title="10. Nonprofit Formation Services (Scrivener Position)">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="font-semibold text-blue-900 dark:text-blue-100">
            GrantAQ is not a law firm. GrantAQ does not provide legal
            advice. Using the formation features does not create an
            attorney-client relationship.
          </p>
        </div>
        <p className="mt-4">
          Any nonprofit formation assistance — including but not limited to
          Form 1023 preparation, articles of incorporation, bylaws templates,
          or state-registration checklists — is self-help software. The
          software compiles information you provide into document templates.
          GrantAQ does not select forms for you, determine which forms
          apply to your situation, customize legal language for your
          specific circumstances, or interpret any statute or regulation.
        </p>
        <p className="mt-3">
          <strong>You should consult a licensed attorney before filing any
          formation document.</strong> GrantAQ is not responsible for rejection
          of documents by any state or federal agency, for errors arising
          from your selection of a form, or for consequences of filing. State
          and federal filing fees are your responsibility.
        </p>
      </Section>

      <Section title="11. Intellectual Property &amp; License">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Your content:</strong> You own all content you upload
            or input. You grant GrantAQ a worldwide, royalty-free,
            non-exclusive license to process, store, transmit, and display
            your content strictly to operate the service, improve the
            service in anonymized aggregate form, and comply with legal
            obligations.
          </li>
          <li>
            <strong>AI-generated content:</strong> You own the grant drafts
            and similar AI-generated output created from your inputs, subject
            to your payment of all applicable fees. AI-generated output is
            delivered as-is; GrantAQ makes no warranty that the output is
            original, non-infringing, or suitable for any particular use.
          </li>
          <li>
            <strong>Our platform:</strong> GrantAQ owns all rights to the
            platform, algorithms, scoring models, prompt templates, training
            data, interfaces, designs, and underlying technology. You may
            not copy, reverse-engineer, scrape, disassemble, or create
            derivative works from any part of the platform, except as
            expressly permitted by law.
          </li>
          <li>
            <strong>Feedback:</strong> If you provide feedback or
            suggestions, we may use them freely without obligation to you.
          </li>
          <li>
            <strong>Trademarks:</strong> &quot;GrantAQ&quot;, the GrantAQ
            logo, and associated marks are trademarks of Friedman Global LLC.
            Unauthorized use is prohibited.
          </li>
          <li>
            <strong>DMCA:</strong> We respond to valid DMCA notices. Send
            takedown notices to{" "}
            <a href="mailto:dmca@grantaq.com" className="text-brand-teal hover:underline">
              dmca@grantaq.com
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="12. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-3">
          <li>
            Submit false or misleading information about your organization
          </li>
          <li>
            Use the service to submit fraudulent grant applications
          </li>
          <li>Resell, sublicense, or white-label the service</li>
          <li>
            Scrape, crawl, or extract data from GrantAQ (use our API instead,
            if offered)
          </li>
          <li>Attempt to circumvent rate limits, usage caps, or billing</li>
          <li>Upload malware or attempt to compromise the platform</li>
          <li>
            Use the service in violation of any applicable law, including
            OFAC sanctions, export controls, or privacy regulations
          </li>
          <li>
            Use the service to solicit or contact funders on our behalf or
            while impersonating GrantAQ
          </li>
        </ul>
        <p className="mt-3">
          We may suspend or terminate your account for any violation.
        </p>
      </Section>

      <Section title="13. Privacy">
        <p>
          Our collection, use, and disclosure of your personal information
          is governed by our{" "}
          <Link href="/privacy" className="text-brand-teal hover:underline">
            Privacy Policy
          </Link>
          , which is incorporated into these Terms by reference.
        </p>
      </Section>

      <Section title="14. Disclaimer of Warranties" id="disclaimer">
        <p className="uppercase text-xs tracking-wider font-bold">
          the service is provided &quot;as is&quot; and &quot;as
          available&quot; without warranty of any kind.
        </p>
        <p className="mt-3">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, GRANTAQ AND
          FRIEDMAN GLOBAL LLC DISCLAIM ALL WARRANTIES, EXPRESS, IMPLIED, OR
          STATUTORY, INCLUDING WITHOUT LIMITATION WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          NON-INFRINGEMENT, ACCURACY, RELIABILITY, AVAILABILITY,
          UNINTERRUPTED OR ERROR-FREE OPERATION, AND THAT THE SERVICE OR
          ANY AI OUTPUT WILL MEET YOUR REQUIREMENTS OR PRODUCE ANY
          PARTICULAR RESULT.
        </p>
        <p className="mt-3">
          Some jurisdictions do not allow the exclusion of certain
          warranties; in those jurisdictions our warranties are limited to
          the minimum permitted by law.
        </p>
      </Section>

      <Section title="15. Limitation of Liability" id="limitation">
        <p className="uppercase text-xs tracking-wider font-bold">
          to the maximum extent permitted by law, grantaq and friedman
          global llc shall not be liable for any indirect, incidental,
          special, consequential, exemplary, or punitive damages.
        </p>
        <p className="mt-3">
          This includes without limitation: lost profits, lost grant
          funding, lost opportunities, loss of goodwill, loss of data,
          business interruption, cost of substitute services, or reputational
          harm — whether arising in contract, tort (including negligence),
          strict liability, or otherwise, and even if GrantAQ has been
          advised of the possibility of such damages.
        </p>
        <p className="mt-3">
          <strong>Aggregate cap.</strong> Our total cumulative liability to
          you for any and all claims arising from or related to these Terms
          or the service shall not exceed the greater of (a) the total
          amount you paid GrantAQ in subscription fees during the twelve
          (12) months preceding the event giving rise to the claim, or (b)
          one hundred US dollars ($100).
        </p>
        <p className="mt-3">
          The limitations in this §15 apply even if any remedy fails of its
          essential purpose.
        </p>
      </Section>

      <Section title="16. Indemnification">
        <p>
          You agree to defend, indemnify, and hold harmless GrantAQ,
          Friedman Global LLC, its officers, directors, employees, and
          agents from and against any and all claims, damages, obligations,
          losses, liabilities, costs, debt, and expenses (including
          attorney&apos;s fees) arising from:
        </p>
        <ul className="list-disc pl-5 mt-3 space-y-1">
          <li>Your use of and access to the service</li>
          <li>Your violation of any term of these Terms</li>
          <li>
            Your violation of any third-party right, including any
            intellectual property, publicity, confidentiality, property, or
            privacy right
          </li>
          <li>
            Any claim that content you submitted caused damage to a third
            party, including to a funder to which you submitted an AI-drafted
            application
          </li>
          <li>Your submission of false or misleading information</li>
        </ul>
      </Section>

      <Section title="17. Dispute Resolution &mdash; Binding Arbitration" id="arbitration">
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="font-bold text-amber-900 dark:text-amber-100 uppercase text-xs tracking-wider">
            Please read this section carefully. It affects your legal
            rights, including your right to a jury trial and to participate
            in a class action.
          </p>
        </div>
        <p className="mt-4">
          <strong>Binding arbitration.</strong> Any dispute, claim, or
          controversy arising out of or relating to these Terms or the
          service (each, a &quot;Dispute&quot;) shall be resolved
          exclusively by binding individual arbitration administered by the
          American Arbitration Association (<strong>AAA</strong>) under its
          Consumer Arbitration Rules, available at{" "}
          <a
            href="https://www.adr.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-teal hover:underline"
          >
            www.adr.org
          </a>
          . The arbitrator&apos;s decision is final and binding. Judgment on
          the award may be entered in any court of competent jurisdiction.
        </p>
        <p className="mt-3">
          <strong>Small-claims carve-out.</strong> Either party may bring an
          individual action in small-claims court for disputes within that
          court&apos;s jurisdictional limits, in lieu of arbitration.
        </p>
        <p className="mt-3">
          <strong>Injunctive relief carve-out.</strong> Either party may
          seek injunctive or other equitable relief in court to protect
          intellectual property rights, confidential information, or
          security of the platform, without first arbitrating.
        </p>
        <p className="mt-3">
          <strong>Class action waiver.</strong> You and GrantAQ agree that
          any arbitration or action shall be conducted only in your
          individual capacity. You waive the right to bring or participate
          in any class, collective, consolidated, representative, or private
          attorney general action. The arbitrator may not consolidate
          claims. If this class action waiver is held unenforceable as to
          any particular Dispute, the arbitration provision shall be void
          as to that Dispute only, and that Dispute shall proceed in court
          — but all other disputes shall remain in arbitration.
        </p>
        <p className="mt-3">
          <strong>Mass arbitration procedure.</strong> If 25 or more
          similar claims are filed in arbitration against GrantAQ in
          coordinated fashion within a 90-day period, GrantAQ may, at its
          option, elect to have the claims proceed in batches of no more
          than 10 claims at a time. Filing fees for subsequent batches are
          stayed pending resolution of the initial batch. This procedure
          is enforceable under the Federal Arbitration Act (9 U.S.C. §1
          <em>et seq.</em>).
        </p>
        <p className="mt-3">
          <strong>Pre-arbitration notice.</strong> Before filing any
          arbitration demand, you must send a written notice of dispute to{" "}
          <a href="mailto:legal@grantaq.com" className="text-brand-teal hover:underline">
            legal@grantaq.com
          </a>{" "}
          describing the Dispute in detail, identifying the relief sought,
          and giving GrantAQ <strong>60 days</strong> to attempt resolution.
          Arbitration demands filed without this pre-arbitration notice are
          subject to dismissal.
        </p>
        <p className="mt-3">
          <strong>Seat &amp; rules.</strong> The seat of arbitration is
          Atlanta, Georgia. Unless the parties agree otherwise in writing,
          arbitration may be conducted by videoconference. The AAA Consumer
          Arbitration Rules govern procedure. The Federal Arbitration Act
          governs enforceability.
        </p>
        <p className="mt-3">
          <strong>Jury waiver.</strong> You waive any right to a trial by
          jury.
        </p>
      </Section>

      <Section title="18. Governing Law &amp; Statute of Limitations">
        <p>
          These Terms are governed by and construed under the laws of the
          State of Georgia, without regard to its conflict of laws
          principles. The United Nations Convention on Contracts for the
          International Sale of Goods does not apply.
        </p>
        <p className="mt-3">
          <strong>One-year limitation.</strong> Any claim arising out of
          these Terms or the service must be filed within{" "}
          <strong>one (1) year</strong> after the claim accrued, or that
          claim is permanently barred. This contractual shortening is
          enforceable to the extent permitted by applicable law.
        </p>
      </Section>

      <Section title="19. Termination">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>By you:</strong> You may cancel recurring subscriptions
            at any time through account settings. Cancellation takes effect
            at the end of the current billing period. Cancellation does not
            entitle you to a refund (§7) and does not extinguish any owed
            Success Fee (§9).
          </li>
          <li>
            <strong>By us:</strong> We may suspend or terminate your
            account immediately for breach of these Terms, non-payment,
            fraudulent activity, abusive behavior toward staff, chargeback
            filed without pre-contact, or misuse of the platform. We will
            provide notice when practicable but are not required to.
          </li>
          <li>
            <strong>Survival.</strong> Sections 4 (No Guarantee), 7
            (Non-Refundable), 8 (Chargeback), 9 (Success Fees), 11 (IP),
            14 (Disclaimer), 15 (Limitation), 16 (Indemnification), 17
            (Arbitration), 18 (Governing Law), and this §19 survive
            termination.
          </li>
          <li>
            <strong>Data on termination:</strong> Your data is retained for
            30 days after termination, during which you may request an
            export. After 30 days, personal data is deleted per our Privacy
            Policy. Anonymized, aggregate data may be retained indefinitely.
          </li>
        </ul>
      </Section>

      <Section title="20. Notices">
        <p>
          All notices to GrantAQ must be sent to{" "}
          <a href="mailto:legal@grantaq.com" className="text-brand-teal hover:underline">
            legal@grantaq.com
          </a>{" "}
          (general), <a href="mailto:billing@grantaq.com" className="text-brand-teal hover:underline">billing@grantaq.com</a>{" "}
          (billing disputes), or{" "}
          <a href="mailto:dmca@grantaq.com" className="text-brand-teal hover:underline">dmca@grantaq.com</a>{" "}
          (DMCA).
        </p>
        <p className="mt-3">
          Notices to you will be sent to the email address on your account
          and are deemed received when sent. You are responsible for
          maintaining a current email address on file.
        </p>
      </Section>

      <Section title="21. Changes to Terms">
        <p>
          We may modify these Terms at any time. For material changes, we
          will provide at least <strong>30 days&apos; advance notice</strong>{" "}
          by email to your account address and by a prominent in-platform
          banner. Continued use of the service after the effective date of
          changes constitutes acceptance of the updated Terms. If you do
          not agree to the changes, you must cancel your subscription
          before the effective date. Version history is maintained at{" "}
          <a
            href="https://github.com/friedmangloballlc-collab/grantiq/commits/master/src/app/(marketing)/terms/page.tsx"
            className="text-brand-teal hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            our public commit history
          </a>
          .
        </p>
      </Section>

      <Section title="22. No Reliance &amp; Integration">
        <p>
          These Terms, together with our Privacy Policy, constitute the
          entire agreement between you and GrantAQ regarding the service
          and supersede all prior or contemporaneous agreements,
          understandings, representations, and warranties.
        </p>
        <p className="mt-3">
          <strong>
            You acknowledge that you have not relied on any statement,
            promise, or representation — whether oral, written, or
            otherwise — except as expressly set forth in these Terms.
          </strong>{" "}
          Any sales, marketing, or customer-support statement not
          incorporated into these Terms is not binding on GrantAQ and may
          not be used as the basis for any claim.
        </p>
      </Section>

      <Section title="23. Miscellaneous">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Severability.</strong> If any provision is found
            unenforceable, the remainder of these Terms remains in effect
            and the unenforceable provision is reformed to the minimum
            extent necessary.
          </li>
          <li>
            <strong>No waiver.</strong> Our failure to enforce any provision
            does not waive our right to enforce it later.
          </li>
          <li>
            <strong>Assignment.</strong> You may not assign your rights
            under these Terms. GrantAQ may assign freely, including to a
            successor by merger or acquisition.
          </li>
          <li>
            <strong>No third-party beneficiaries.</strong> These Terms are
            for the benefit of you and GrantAQ only.
          </li>
          <li>
            <strong>Force majeure.</strong> Neither party is liable for
            delay or non-performance caused by events beyond reasonable
            control, including acts of God, labor actions, internet
            outages, provider outages (Stripe, Supabase, OpenAI, Anthropic),
            war, terrorism, or government action.
          </li>
          <li>
            <strong>Headings.</strong> Section headings are for convenience
            only and do not affect interpretation.
          </li>
          <li>
            <strong>Language.</strong> The English-language version
            controls. Any translation is for convenience only.
          </li>
        </ul>
      </Section>

      <div className="mt-12 p-4 rounded-lg bg-warm-100 dark:bg-warm-800 text-sm text-warm-700 dark:text-warm-300 flex items-start gap-3">
        <ShieldCheck
          className="h-5 w-5 text-brand-teal-text shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-warm-900 dark:text-warm-50 mb-1">
            Questions or to send formal notice?
          </p>
          <p className="text-xs">
            Legal:{" "}
            <a href="mailto:legal@grantaq.com" className="text-brand-teal hover:underline">
              legal@grantaq.com
            </a>{" "}
            · Billing:{" "}
            <a href="mailto:billing@grantaq.com" className="text-brand-teal hover:underline">
              billing@grantaq.com
            </a>{" "}
            · Support:{" "}
            <a href="mailto:support@grantaq.com" className="text-brand-teal hover:underline">
              support@grantaq.com
            </a>
          </p>
          <p className="text-xs mt-2">
            Entity: Friedman Global LLC, a Georgia limited liability company,
            operating GrantAQ at grantaq.com.
          </p>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="mb-10 scroll-mt-16" id={id}>
      <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-3 pb-2 border-b border-warm-200 dark:border-warm-700">
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-warm-700 dark:text-warm-300">
        {children}
      </div>
    </section>
  );
}
