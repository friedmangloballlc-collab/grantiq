// src/app/(marketing)/privacy/do-not-sell/page.tsx
//
// CCPA/CPRA "Do Not Sell or Share My Personal Information" page.
// Must be conspicuously linked from every page of our site for
// California consumers. Links to the intake form; we process the
// request via the same privacy@ channel as other DSARs.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Do Not Sell or Share My Personal Information — GrantAQ",
  description:
    "California residents: opt out of sale or sharing of your personal information.",
  alternates: { canonical: "https://grantaq.com/privacy/do-not-sell" },
};

export default function DoNotSellPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-warm-800 dark:text-warm-200">
      <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-4">
        Do Not Sell or Share My Personal Information
      </h1>
      <p className="text-sm text-warm-500 mb-8">
        California Privacy Rights Act (CPRA) opt-out
      </p>

      <div className="mb-8 p-5 rounded-lg border-2 border-brand-teal/30 bg-brand-teal/5">
        <p className="font-semibold text-warm-900 dark:text-warm-50 mb-2">
          GrantAQ does not sell personal information for money.
        </p>
        <p className="text-sm leading-relaxed">
          California law (Cal. Civ. Code §1798.120) also gives you the right to
          opt out of &quot;sharing&quot; — disclosures for cross-context
          behavioral advertising. GrantAQ does not currently engage in this
          form of sharing either. We still provide this opt-out page because
          the law requires a clear and conspicuous method for California
          residents to submit the request.
        </p>
      </div>

      <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-3">
        How to opt out
      </h2>
      <div className="space-y-4 text-sm leading-relaxed">
        <div>
          <p className="font-semibold mb-1">1. Automated (recommended)</p>
          <p>
            Enable <strong>Global Privacy Control (GPC)</strong> in your
            browser (Firefox, Brave, DuckDuckGo Privacy Browser, or an
            extension for Chrome/Safari). When we detect a GPC signal, we
            automatically treat it as an opt-out request.
          </p>
        </div>

        <div>
          <p className="font-semibold mb-1">2. Email</p>
          <p>
            Send an email to{" "}
            <a
              href="mailto:privacy@grantaq.com?subject=CCPA%20Opt-Out%20Request"
              className="text-brand-teal hover:underline"
            >
              privacy@grantaq.com
            </a>{" "}
            with the subject line &quot;CCPA Opt-Out Request&quot;. Include
            your name and the email address on your GrantAQ account.
          </p>
        </div>

        <div>
          <p className="font-semibold mb-1">3. Authorized agent</p>
          <p>
            A legally authorized agent may submit the request on your behalf
            with written authorization. We may still contact you to verify
            identity.
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-3 mt-10">
        Response
      </h2>
      <p className="text-sm leading-relaxed">
        We process opt-out requests as soon as technically feasible and no
        later than <strong>15 business days</strong>. You will receive a
        confirmation email once the request is processed. We do not charge a
        fee for opt-out requests and we do not discriminate against you for
        exercising this right.
      </p>

      <div className="mt-10 text-sm">
        <Link
          href="/privacy"
          className="text-brand-teal hover:underline"
        >
          ← Back to Privacy Policy
        </Link>
      </div>
    </main>
  );
}
