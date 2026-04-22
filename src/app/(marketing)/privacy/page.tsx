// src/app/(marketing)/privacy/page.tsx
//
// Privacy Policy rewrite (2026-04-22) for multi-state US compliance.
// Each major US state privacy law from 2023-2024 adds distinct
// requirements — this policy enumerates them explicitly instead of
// relying on a generic "GDPR-flavored" block.
//
// Laws addressed:
//   - CCPA / CPRA (California)          - Do Not Sell/Share link, 12-mo lookback, sensitive PI limits
//   - VCDPA (Virginia)                  - Appeal process (statutorily required)
//   - CPA (Colorado)                    - GPC honoring mandatory since 2024-07
//   - CTDPA (Connecticut)               - Appeal process
//   - UCPA (Utah)                       - Weaker regime but opt-out required
//   - TDPSA (Texas)                     - Statutory language for sensitive/biometric
//   - OCPA (Oregon)                     - Specific 3rd-party list on request
//   - MCDPA (Montana)                   - Appeal process
//
// Response-time SLA: 45 days with 45-day extension option — the
// floor required by every state law above.
//
// B2B carve-out no longer applies post-CPRA (Jan 2023). Board
// member / staff personal info stored by GrantAQ qualifies as
// personal data under CPRA.

import type { Metadata } from "next";
import Link from "next/link";
import { Shield, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — GrantAQ",
  description:
    "How GrantAQ collects, uses, and protects your data. Includes state-specific rights for California, Virginia, Colorado, Connecticut, Utah, Texas, Oregon, and Montana residents.",
  alternates: { canonical: "https://grantaq.com/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-warm-800 dark:text-warm-200">
      <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-warm-500 mb-2">
        Effective April 22, 2026
      </p>
      <p className="text-sm text-warm-500 mb-8">
        This policy describes how Friedman Global LLC (&quot;GrantAQ,&quot;
        &quot;we,&quot; &quot;us&quot;) collects, uses, shares, and protects
        personal information when you use grantaq.com.
      </p>

      {/* DSAR quick-reference box */}
      <div className="mb-10 p-4 rounded-lg border border-brand-teal/30 bg-brand-teal/5 flex items-start gap-3">
        <Shield
          className="h-5 w-5 text-brand-teal-text shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="text-sm">
          <p className="font-semibold text-warm-900 dark:text-warm-50 mb-1">
            Submit a privacy rights request
          </p>
          <p className="leading-relaxed">
            Email{" "}
            <a
              href="mailto:privacy@grantaq.com"
              className="text-brand-teal hover:underline font-medium"
            >
              privacy@grantaq.com
            </a>{" "}
            with your request (access, delete, correct, opt-out, or appeal). We
            respond within <strong>45 days</strong> and may extend once by
            another 45 days for complex requests. Identity verification
            required.
          </p>
        </div>
      </div>

      <Section title="1. Who We Are">
        <p>
          GrantAQ is operated by <strong>Friedman Global LLC</strong>, a Georgia
          limited liability company. For the purposes of state privacy laws
          (CCPA, VCDPA, CPA, CTDPA, UCPA, TDPSA, OCPA, MCDPA), we are the
          &quot;business&quot; or &quot;controller&quot; of the personal data
          described below.
        </p>
        <p className="mt-3">
          Questions, requests, or complaints:{" "}
          <a
            href="mailto:privacy@grantaq.com"
            className="text-brand-teal hover:underline"
          >
            privacy@grantaq.com
          </a>
          .
        </p>
      </Section>

      <Section title="2. Data We Collect">
        <h3 className="font-semibold mt-4 mb-2">Account &amp; Organization</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Name, email address, phone number</li>
          <li>Organization name, type, EIN, mission, state of operation</li>
          <li>Financial data (annual revenue, budget, prior grant history)</li>
          <li>Board member names and contact information</li>
          <li>Uploaded documents (audits, 990s, bylaws, letters of support)</li>
        </ul>

        <h3 className="font-semibold mt-4 mb-2">Usage &amp; technical</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pages visited, features used, time spent in the platform</li>
          <li>IP address, browser type, device type, operating system</li>
          <li>Referral source (UTM parameters, referral codes)</li>
          <li>Session tokens and authentication data</li>
        </ul>

        <h3 className="font-semibold mt-4 mb-2">AI interaction data</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Prompts and messages sent to Grantie (our AI chat assistant)</li>
          <li>Grant drafts generated or edited on the platform</li>
          <li>AI-generated scores, strategy recommendations, readiness assessments</li>
        </ul>

        <h3 className="font-semibold mt-4 mb-2">Payment data</h3>
        <p>
          Payment card data is handled directly by Stripe, our PCI-compliant
          processor. We receive tokenized payment identifiers and billing
          metadata, but never raw card numbers.
        </p>
      </Section>

      <Section title="3. How We Use Your Data">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Service delivery:</strong> match grants to your profile,
            generate AI drafts, score readiness, track pipeline stages
          </li>
          <li>
            <strong>Account administration:</strong> authentication, billing,
            support, fraud prevention
          </li>
          <li>
            <strong>Product improvement:</strong> aggregated, de-identified
            analytics and model improvement (not individual profiling)
          </li>
          <li>
            <strong>Communications:</strong> service announcements, billing
            notices, grant deadline reminders, and opt-in marketing
          </li>
          <li>
            <strong>Legal compliance:</strong> responding to lawful subpoenas,
            preserving evidence in disputes, enforcing our Terms
          </li>
        </ul>
        <p className="mt-3 font-medium">
          We do <strong>not</strong> sell your personal information in exchange
          for money. See &quot;Sharing&quot; below for the limited non-monetary
          disclosures we make.
        </p>
      </Section>

      <Section title="4. How We Share Your Data">
        <p>We disclose data only to:</p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>
            <strong>Service providers</strong> under contract (see
            sub-processor list in §5)
          </li>
          <li>
            <strong>Successor entities</strong> in connection with a merger,
            acquisition, or asset sale
          </li>
          <li>
            <strong>Law enforcement or courts</strong> when required by valid
            legal process
          </li>
          <li>
            <strong>Other parties with your consent</strong> (e.g., if you
            invite a collaborator to your org)
          </li>
        </ul>
      </Section>

      <Section title="5. Sub-processors">
        <p>
          The following vendors process your data on our behalf, under a
          written data-processing agreement:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border border-warm-200 dark:border-warm-800 rounded-lg">
            <thead>
              <tr className="bg-warm-50 dark:bg-warm-900/50 text-warm-600 dark:text-warm-400">
                <th className="text-left font-semibold py-2 px-3 border-b">Vendor</th>
                <th className="text-left font-semibold py-2 px-3 border-b">Purpose</th>
                <th className="text-left font-semibold py-2 px-3 border-b">Data</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="py-2 px-3 border-b">Supabase</td><td className="py-2 px-3 border-b">Primary database + auth</td><td className="py-2 px-3 border-b">All app data</td></tr>
              <tr><td className="py-2 px-3 border-b">Vercel</td><td className="py-2 px-3 border-b">Hosting + serverless functions</td><td className="py-2 px-3 border-b">Request metadata</td></tr>
              <tr><td className="py-2 px-3 border-b">Stripe</td><td className="py-2 px-3 border-b">Payment processing</td><td className="py-2 px-3 border-b">Billing + payment info</td></tr>
              <tr><td className="py-2 px-3 border-b">Anthropic</td><td className="py-2 px-3 border-b">LLM for AI drafting</td><td className="py-2 px-3 border-b">Prompts + context</td></tr>
              <tr><td className="py-2 px-3 border-b">OpenAI</td><td className="py-2 px-3 border-b">LLM + embeddings</td><td className="py-2 px-3 border-b">Prompts + context</td></tr>
              <tr><td className="py-2 px-3 border-b">Resend</td><td className="py-2 px-3 border-b">Transactional email</td><td className="py-2 px-3 border-b">Email addresses</td></tr>
              <tr><td className="py-2 px-3">PostHog</td><td className="py-2 px-3">Product analytics</td><td className="py-2 px-3">Usage events</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          A current list of sub-processors with specific third-party
          recipients is available to Oregon residents on request, as required
          by ORS 646A.578.
        </p>
      </Section>

      <Section title="6. Cookies and Tracking">
        <p>
          We use essential cookies for authentication and a minimal set of
          first-party analytics cookies (PostHog) to understand product usage.
          We do not use third-party advertising cookies.
        </p>
        <p className="mt-3">
          <strong>Global Privacy Control (GPC):</strong> If your browser sends
          a GPC signal, we treat it as a valid opt-out request from sale or
          sharing of your personal information, as required by the Colorado
          Privacy Act and California Privacy Rights Act.
        </p>
      </Section>

      <Section title="7. Your Rights — Universal" id="universal-rights">
        <p>
          Regardless of your state of residence, you have the right to:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-3">
          <li>Request access to the personal information we hold about you</li>
          <li>Request deletion of your personal information</li>
          <li>Request correction of inaccurate personal information</li>
          <li>Receive a copy of your personal information in a portable format</li>
          <li>Opt out of marketing emails at any time</li>
        </ul>
        <p className="mt-4">
          To exercise any right, email{" "}
          <a
            href="mailto:privacy@grantaq.com"
            className="text-brand-teal hover:underline"
          >
            privacy@grantaq.com
          </a>
          . We will verify your identity and respond within <strong>45
          days</strong>. We may extend once by an additional 45 days for
          complex requests, and will notify you of the extension within the
          first 45 days.
        </p>
      </Section>

      <Section title="8. State-Specific Rights" id="state-rights">
        <p>
          The following rights apply based on your state of residence. If your
          state is not listed, the Universal rights in §7 still apply.
        </p>

        <h3 className="font-semibold mt-6 mb-2">California (CCPA / CPRA)</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Right to know, access, delete, correct, and port your data</li>
          <li>
            Right to opt out of the sale or sharing of personal information.{" "}
            <Link
              href="/privacy/do-not-sell"
              className="text-brand-teal hover:underline"
            >
              Do Not Sell or Share My Personal Information
            </Link>
          </li>
          <li>
            Right to limit the use of sensitive personal information
          </li>
          <li>Right to non-discrimination for exercising CCPA rights</li>
          <li>Right to opt out of automated decision-making (when applicable)</li>
          <li>
            12-month lookback: on request, we will disclose categories of
            personal information collected, sold, shared, or disclosed in the
            preceding 12 months
          </li>
        </ul>

        <h3 className="font-semibold mt-6 mb-2">
          Virginia (VCDPA), Connecticut (CTDPA), Montana (MCDPA)
        </h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Right to access, correct, delete, and obtain a portable copy of your data</li>
          <li>Right to opt out of sale, targeted advertising, and profiling</li>
          <li>
            <strong>Appeal right:</strong> If we deny a rights request, you may
            appeal by emailing{" "}
            <a
              href="mailto:privacy@grantaq.com?subject=Privacy%20Rights%20Appeal"
              className="text-brand-teal hover:underline"
            >
              privacy@grantaq.com
            </a>{" "}
            with &quot;Privacy Rights Appeal&quot; in the subject. We will
            respond within <strong>60 days</strong>. If the appeal is denied,
            you may file a complaint with your state Attorney General.
          </li>
        </ul>

        <h3 className="font-semibold mt-6 mb-2">Colorado (CPA)</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Same rights as Virginia, plus:</li>
          <li>
            <strong>Universal opt-out honoring:</strong> We honor Global
            Privacy Control (GPC) signals as opt-out requests for sale and
            targeted advertising, as required by Colo. Rev. Stat. §6-1-1306
          </li>
          <li>Appeal process as described above (60-day response)</li>
        </ul>

        <h3 className="font-semibold mt-6 mb-2">Utah (UCPA)</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Right to access, delete, and port your data</li>
          <li>Right to opt out of sale and targeted advertising</li>
        </ul>

        <h3 className="font-semibold mt-6 mb-2">Texas (TDPSA)</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Right to access, correct, delete, and port your data</li>
          <li>Right to opt out of sale, targeted advertising, and profiling</li>
          <li>
            <strong>Sensitive data notice:</strong> GrantAQ does not sell
            sensitive personal data or biometric data. If this changes, we
            will provide the notice required by Tex. Bus. &amp; Com. Code
            §541.102.
          </li>
        </ul>

        <h3 className="font-semibold mt-6 mb-2">Oregon (OCPA)</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>All rights under VCDPA-style regimes</li>
          <li>
            <strong>Specific third-party disclosure:</strong> On request, we
            will provide a list of the specific third parties to whom we have
            disclosed your personal information (not just categories), as
            required by ORS 646A.578
          </li>
        </ul>

        <h3 className="font-semibold mt-6 mb-2">Other states</h3>
        <p>
          If a new state privacy law takes effect and provides additional
          rights beyond those listed above, we will honor those rights as of
          the effective date, even if this policy has not yet been updated.
        </p>
      </Section>

      <Section title="9. How to Exercise Your Rights">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Email <a href="mailto:privacy@grantaq.com" className="text-brand-teal hover:underline">privacy@grantaq.com</a>
          </li>
          <li>
            Tell us: your name, email of record on GrantAQ, the state you
            reside in, and which right you wish to exercise (access, delete,
            correct, opt out, appeal)
          </li>
          <li>
            We will verify your identity (typically by confirming ownership of
            the email address on your account) before acting on the request
          </li>
          <li>
            We respond within <strong>45 days</strong> (60 for appeals). If we
            need to extend, we will notify you within the first 45 days.
          </li>
          <li>
            We do not charge a fee for reasonable requests. For repeated or
            manifestly unfounded requests, we may charge a reasonable fee or
            refuse, as permitted by law.
          </li>
        </ol>
      </Section>

      <Section title="10. Authorized Agents">
        <p>
          If you authorize an agent to make a privacy request on your behalf,
          the agent must provide signed written authorization. We may still
          contact you to verify identity.
        </p>
      </Section>

      <Section title="11. Data Retention">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Active accounts:</strong> while your account is active and
            as long as needed to provide the service
          </li>
          <li>
            <strong>After account termination:</strong> 30-day grace period
            for data export, then deletion of personal data
          </li>
          <li>
            <strong>Legal hold exceptions:</strong> we may retain data longer
            to comply with legal obligations, resolve disputes, or enforce our
            Terms
          </li>
          <li>
            <strong>Aggregated/de-identified data:</strong> may be retained
            indefinitely for product improvement
          </li>
          <li>
            <strong>Billing and tax records:</strong> 7 years (US tax law)
          </li>
        </ul>
      </Section>

      <Section title="12. Data Security">
        <p>
          We implement industry-standard security practices including
          encryption at rest (AES-256), encryption in transit (TLS 1.3),
          principle-of-least-privilege access controls, audit logging, and
          routine third-party security assessments.
        </p>
        <p className="mt-3">
          No system is perfectly secure. If we discover a data breach that
          affects your personal information, we will notify you as required by
          applicable state data-breach-notification laws (typically 30–90 days
          depending on state).
        </p>
      </Section>

      <Section title="13. Children">
        <p>
          GrantAQ is not intended for users under 13 years of age. We do not
          knowingly collect personal information from children under 13. If
          you believe a child has provided information to us, contact{" "}
          <a
            href="mailto:privacy@grantaq.com"
            className="text-brand-teal hover:underline"
          >
            privacy@grantaq.com
          </a>{" "}
          and we will delete it.
        </p>
      </Section>

      <Section title="14. International Users">
        <p>
          GrantAQ is a US service. Our data processing occurs in the United
          States. If you access the service from outside the United States,
          your data will be transferred to and processed in the US.
        </p>
        <p className="mt-3">
          We do not actively market to or knowingly serve EU, UK, or Canadian
          residents, and do not hold ourselves out as compliant with GDPR or
          PIPEDA. If you are an EU / UK / Canadian resident, please do not
          use GrantAQ.
        </p>
      </Section>

      <Section title="15. Changes to This Policy">
        <p>
          We may update this Privacy Policy. For material changes, we will
          provide at least 30 days&apos; advance notice by email and a
          prominent banner in the platform. Continued use after the effective
          date constitutes acceptance.
        </p>
        <p className="mt-3">
          Version history is maintained in our{" "}
          <a
            href="https://github.com/friedmangloballlc-collab/grantiq/commits/master/src/app/(marketing)/privacy/page.tsx"
            className="text-brand-teal hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            public commit history
          </a>
          .
        </p>
      </Section>

      <Section title="16. Contact">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warm-100 dark:bg-warm-800">
          <AlertCircle
            className="h-5 w-5 text-warm-600 dark:text-warm-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="text-sm">
            <p className="font-semibold text-warm-900 dark:text-warm-50 mb-1">
              Friedman Global LLC
            </p>
            <p>
              Privacy:{" "}
              <a
                href="mailto:privacy@grantaq.com"
                className="text-brand-teal hover:underline"
              >
                privacy@grantaq.com
              </a>
            </p>
            <p>
              Security:{" "}
              <a
                href="mailto:security@grantaq.com"
                className="text-brand-teal hover:underline"
              >
                security@grantaq.com
              </a>
            </p>
            <p className="mt-2 text-xs text-warm-600 dark:text-warm-400">
              Mailing address published in our{" "}
              <Link
                href="/terms"
                className="text-brand-teal hover:underline"
              >
                Terms
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
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
