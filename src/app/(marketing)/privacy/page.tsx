import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — GrantAQ",
  description: "How GrantAQ collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-warm-800 dark:text-warm-200">
      <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-2">Privacy Policy</h1>
      <p className="text-sm text-warm-500 mb-10">Last updated: March 2026</p>

      <Section title="1. Who We Are">
        <p>
          GrantAQ is a product of <strong>Friedman Global LLC</strong>, a grant consulting and technology company. When
          this policy says "GrantAQ," "we," "us," or "our," it refers to Friedman Global LLC and the GrantAQ platform
          operated at grantaq.com.
        </p>
        <p className="mt-3">
          Questions about this policy? Contact us at{" "}
          <a href="mailto:privacy@grantaq.com" className="text-brand-teal hover:underline">
            privacy@grantaq.com
          </a>
          .
        </p>
      </Section>

      <Section title="2. Data We Collect">
        <h3 className="font-semibold mt-4 mb-2">Account &amp; Organization Information</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Name, email address, phone number</li>
          <li>Organization name, type, and mission</li>
          <li>EIN (Employer Identification Number) — stored encrypted at rest</li>
          <li>Financial data (annual revenue, budget, prior grant history)</li>
          <li>Board member names and contact information</li>
          <li>Uploaded documents (audits, 990s, bylaws, letters of support)</li>
        </ul>

        <h3 className="font-semibold mt-4 mb-2">Usage &amp; Technical Data</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Pages visited, features used, and time spent in the platform</li>
          <li>IP address, browser type, device type, and operating system</li>
          <li>Referral source (UTM parameters, referral codes)</li>
          <li>Session tokens and authentication data</li>
        </ul>

        <h3 className="font-semibold mt-4 mb-2">AI Interaction Data</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Prompts and messages sent to Grantie (our AI chat assistant)</li>
          <li>Grant application drafts generated or edited through the platform</li>
          <li>AI-generated scores, strategy recommendations, and readiness assessments</li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Data">
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li><strong>Grant matching:</strong> We use your organization profile to surface relevant grant opportunities and calculate AI match scores.</li>
          <li><strong>AI writing assistance:</strong> Your mission, financials, and history inform AI-generated grant drafts and narrative recommendations.</li>
          <li><strong>Readiness scoring:</strong> We analyze your documents and profile data to generate readiness assessments for specific grants.</li>
          <li><strong>Nonprofit formation services:</strong> Where applicable, your profile data pre-fills formation templates and document preparation workflows.</li>
          <li><strong>Platform improvement:</strong> Aggregated, anonymized usage data helps us improve matching algorithms and product features.</li>
          <li><strong>Communications:</strong> We send transactional emails (receipts, deadline alerts) and, with your consent, product and educational updates.</li>
        </ul>
      </Section>

      <Section title="4. Third-Party Services">
        <p className="mb-3">We share data with the following sub-processors to operate the platform:</p>
        <div className="space-y-3 text-sm">
          <ThirdParty name="Anthropic" purpose="AI language model powering Grantie and grant writing assistance" link="https://www.anthropic.com/privacy" />
          <ThirdParty name="OpenAI" purpose="Text embeddings for semantic grant matching" link="https://openai.com/policies/privacy-policy" />
          <ThirdParty name="Stripe" purpose="Payment processing and subscription billing" link="https://stripe.com/privacy" />
          <ThirdParty name="Supabase" purpose="Database storage, file storage, and authentication" link="https://supabase.com/privacy" />
          <ThirdParty name="Resend" purpose="Transactional email delivery" link="https://resend.com/privacy" />
          <ThirdParty name="Vercel" purpose="Application hosting and serverless functions" link="https://vercel.com/legal/privacy-policy" />
        </div>
        <p className="mt-4 text-sm text-warm-500">
          We do not sell your personal data to third parties. We do not share your data with advertisers.
        </p>
      </Section>

      <Section title="5. Cookies &amp; Tracking" id="cookies">
        <p className="mb-3 text-sm">We use a minimal set of cookies:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>
            <strong>Session cookies (essential):</strong> Required for authentication and keeping you logged in. These
            cannot be disabled without breaking the platform.
          </li>
          <li>
            <strong>Referral tracking cookie (30-day):</strong> If you arrive via a referral link, we store the referral
            code for up to 30 days to credit the referring user when you sign up.
          </li>
        </ul>
        <p className="mt-3 text-sm">We do not use advertising cookies or third-party tracking pixels.</p>
      </Section>

      <Section title="6. Your Rights">
        <p className="mb-3 text-sm">You have the right to:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
          <li><strong>Correction:</strong> Update or correct inaccurate information through your account settings.</li>
          <li><strong>Deletion:</strong> Request deletion of your account and associated data. We will fulfill deletion requests within 30 days, except where retention is required by law.</li>
          <li><strong>Data export:</strong> Request a machine-readable export of your data (profile, documents, grant history).</li>
          <li><strong>Opt-out of marketing:</strong> Unsubscribe from non-essential communications at any time via the link in any email or through account settings.</li>
        </ul>
        <p className="mt-3 text-sm">
          To exercise any of these rights, email{" "}
          <a href="mailto:privacy@grantaq.com" className="text-brand-teal hover:underline">
            privacy@grantaq.com
          </a>
          .
        </p>
      </Section>

      <Section title="7. Data Retention">
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>Account and organization data is retained while your account is active.</li>
          <li>Behavioral and usage data is retained for up to 2 years for analytics purposes.</li>
          <li>Upon account deletion, your personal data is removed within 30 days. Anonymized aggregate data may be retained indefinitely.</li>
          <li>Stripe retains payment records as required for financial compliance (typically 7 years).</li>
        </ul>
      </Section>

      <Section title="8. Children's Privacy (COPPA)">
        <p className="text-sm">
          GrantAQ is not directed to children under the age of 13, and we do not knowingly collect personal information
          from children under 13. If you believe a child under 13 has provided us with personal information, contact us
          immediately at{" "}
          <a href="mailto:privacy@grantaq.com" className="text-brand-teal hover:underline">
            privacy@grantaq.com
          </a>{" "}
          and we will delete it promptly.
        </p>
      </Section>

      <Section title="9. California Residents — CCPA Rights">
        <p className="mb-3 text-sm">
          If you are a California resident, the California Consumer Privacy Act (CCPA) grants you the following
          additional rights:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>The right to know what personal information we collect, use, disclose, and sell.</li>
          <li>The right to request deletion of your personal information.</li>
          <li>The right to opt out of the "sale" of personal information. <strong>We do not sell personal information.</strong></li>
          <li>The right to non-discrimination for exercising your privacy rights.</li>
        </ul>
        <p className="mt-3 text-sm">
          To submit a CCPA request, email{" "}
          <a href="mailto:privacy@grantaq.com" className="text-brand-teal hover:underline">
            privacy@grantaq.com
          </a>{" "}
          with the subject line "CCPA Request."
        </p>
      </Section>

      <Section title="10. International Users — GDPR">
        <p className="text-sm">
          If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, we process your
          personal data in accordance with the General Data Protection Regulation (GDPR). Our legal bases for processing
          include: contract performance (providing the service you signed up for), legitimate interest (fraud prevention,
          platform security, product improvement), and consent (marketing communications). You have the right to lodge a
          complaint with your local data protection authority. Data transfers to the United States are covered by
          applicable standard contractual clauses.
        </p>
      </Section>

      <Section title="11. Security">
        <p className="text-sm">
          We use industry-standard security practices including encryption at rest and in transit, access controls, and
          regular security reviews. EINs and other sensitive identifiers are encrypted at the database level. However, no
          system is perfectly secure — if you believe your account has been compromised, contact us immediately.
        </p>
      </Section>

      <Section title="12. Changes to This Policy">
        <p className="text-sm">
          We may update this Privacy Policy from time to time. Material changes will be communicated by email and/or a
          prominent notice on the platform at least 30 days before taking effect. Continued use of GrantAQ after the
          effective date constitutes acceptance of the updated policy.
        </p>
      </Section>

      <div className="mt-12 p-4 rounded-lg bg-warm-100 dark:bg-warm-800 text-sm text-warm-600 dark:text-warm-400">
        <strong>Contact:</strong> Friedman Global LLC / GrantAQ &mdash;{" "}
        <a href="mailto:privacy@grantaq.com" className="text-brand-teal hover:underline">
          privacy@grantaq.com
        </a>
      </div>
    </main>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="mb-10" id={id}>
      <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-3 pb-2 border-b border-warm-200 dark:border-warm-700">
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-warm-700 dark:text-warm-300">{children}</div>
    </section>
  );
}

function ThirdParty({ name, purpose, link }: { name: string; purpose: string; link: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="font-medium w-24 shrink-0">{name}</span>
      <span className="text-warm-600 dark:text-warm-400 flex-1">{purpose}</span>
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-brand-teal hover:underline shrink-0">
        Privacy policy
      </a>
    </div>
  );
}
