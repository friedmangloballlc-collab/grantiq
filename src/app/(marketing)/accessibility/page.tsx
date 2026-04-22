// src/app/(marketing)/accessibility/page.tsx
//
// Published accessibility statement. Deters ADA Title III "surf-by"
// demand letters (common in CA/NY/FL — Gil v. Winn-Dixie, Robles v.
// Domino's) because plaintiff firms filter for sites without a
// statement. Cites WCAG 2.1 AA as our target, provides a contact
// path for complaints, and documents ongoing remediation.
//
// Not a legal shield by itself — no federal safe harbor exists for
// digital accessibility — but published statements + a documented
// remediation process are the best practical defense.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility — GrantAQ",
  description:
    "GrantAQ is committed to making our platform accessible to everyone. This statement describes our approach, standards, and how to reach us.",
  alternates: { canonical: "https://grantaq.com/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-warm-800 dark:text-warm-200">
      <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-2">
        Accessibility Statement
      </h1>
      <p className="text-sm text-warm-500 mb-10">
        Last updated: April 2026
      </p>

      <Section title="Our commitment">
        <p>
          GrantAQ, operated by Friedman Global LLC, is committed to ensuring
          digital accessibility for people with disabilities. We are
          continually improving the user experience for everyone and applying
          the relevant accessibility standards.
        </p>
      </Section>

      <Section title="Standards we follow">
        <p>
          GrantAQ targets conformance with the{" "}
          <a
            href="https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_overview&amp;levels=aaa"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-teal hover:underline"
          >
            Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
          </a>
          . These guidelines explain how to make web content more accessible
          to people with a wide array of disabilities, including visual,
          auditory, physical, speech, cognitive, language, learning, and
          neurological disabilities.
        </p>
      </Section>

      <Section title="Measures we take">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            We integrate accessibility into our design system and development
            process from the start, not as a retrofit.
          </li>
          <li>
            Every page uses semantic HTML, ARIA labels where appropriate,
            sufficient color contrast ratios, and keyboard-navigable
            interactive elements.
          </li>
          <li>
            We run automated accessibility testing (axe-core) against our
            marketing and product surfaces.
          </li>
          <li>
            We support standard assistive technologies including screen
            readers (VoiceOver, NVDA, JAWS), voice control (Voice Control,
            Dragon), and zoom (up to 400% without loss of content).
          </li>
        </ul>
      </Section>

      <Section title="Known limitations">
        <p>
          Despite our best efforts, some content on GrantAQ may not yet fully
          conform to WCAG 2.1 AA. Areas we are actively working on:
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>
            Third-party embedded content (some external grant descriptions
            pulled from Grants.gov and ProPublica APIs) may not fully conform.
            We display this content as-is from its source.
          </li>
          <li>
            PDF documents uploaded by users are treated as user-generated
            content and are not subject to our accessibility testing.
          </li>
          <li>
            Historical blog posts from prior to April 2026 are being
            retroactively reviewed for accessibility.
          </li>
        </ul>
      </Section>

      <Section title="Feedback and contact">
        <p>
          We welcome your feedback on the accessibility of GrantAQ. If you
          encounter an accessibility barrier or need an accommodation to use
          our service:
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>
            <strong>Email:</strong>{" "}
            <a
              href="mailto:accessibility@grantaq.com"
              className="text-brand-teal hover:underline"
            >
              accessibility@grantaq.com
            </a>
          </li>
          <li>
            <strong>Response time:</strong> We aim to respond to accessibility
            reports within 2 business days and resolve issues or provide a
            remediation timeline within 10 business days.
          </li>
          <li>
            <strong>Mailing address:</strong> Friedman Global LLC · Atlanta, GA
            (see full address on{" "}
            <Link href="/terms" className="text-brand-teal hover:underline">
              Terms
            </Link>
            )
          </li>
        </ul>
      </Section>

      <Section title="Formal complaints">
        <p>
          If you are not satisfied with our response, you may file a complaint
          with the U.S. Department of Justice Civil Rights Division under
          Title III of the Americans with Disabilities Act at{" "}
          <a
            href="https://civilrights.justice.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-teal hover:underline"
          >
            civilrights.justice.gov
          </a>
          .
        </p>
      </Section>

      <Section title="Assessment approach">
        <p>
          GrantAQ assesses accessibility via a combination of:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-3">
          <li>Self-evaluation using automated tools (axe-core, Lighthouse)</li>
          <li>Manual testing with keyboard-only navigation</li>
          <li>Manual testing with screen readers (VoiceOver + NVDA)</li>
          <li>Periodic external audits by accessibility consultants</li>
        </ul>
      </Section>

      <div className="mt-12 p-4 rounded-lg bg-warm-100 dark:bg-warm-800 text-sm text-warm-600 dark:text-warm-400">
        This statement was last reviewed and updated in April 2026. We commit
        to reviewing it at least annually and whenever we make significant
        platform changes.
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-3 pb-2 border-b border-warm-200 dark:border-warm-700">
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-warm-700 dark:text-warm-300">
        {children}
      </div>
    </section>
  );
}
