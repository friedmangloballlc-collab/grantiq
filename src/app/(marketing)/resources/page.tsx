// /resources — the "learn + verify + community" hub.
//
// Positions GrantIQ inside the nonprofit ecosystem rather than as a
// replacement for it. SEO-friendly: low competition for phrases like
// "nonprofit grant resources" + outbound links to authoritative
// domains help our own authority.
//
// Three sections:
//   Learn         → GPA, AFP, Candid Learning, Nonprofit Tech for Good
//   Verify funders → GuideStar, ProPublica Nonprofit Explorer, IRS
//   Community     → r/nonprofit, r/grantwriting, GPA local chapters
//
// Plus: a YouTube playlist embed slot (wire the real playlist URL
// once we have videos) + newsletter capture at the bottom to catch
// visitors who came in via SEO.

import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowUpRight,
  BookOpen,
  ShieldCheck,
  Users,
  PlayCircle,
} from "lucide-react";
import { NewsletterCapture } from "@/components/marketing/newsletter-capture";

export const metadata: Metadata = {
  title: "Nonprofit Grant Resources — GrantAQ",
  description:
    "A curated list of the best places to learn grant writing, verify funders, and connect with the nonprofit community — plus free tutorials from GrantAQ.",
  alternates: { canonical: "https://grantaq.com/resources" },
};

type ResourceLink = {
  name: string;
  href: string;
  blurb: string;
};

const LEARN: ResourceLink[] = [
  {
    name: "Grant Professionals Association (GPA)",
    href: "https://grantprofessionals.org",
    blurb:
      "The national body for grant writers. Certification, conferences, local chapters, and the deepest peer network in the field.",
  },
  {
    name: "Association of Fundraising Professionals (AFP)",
    href: "https://afpglobal.org",
    blurb:
      "Broader fundraising focus but essential for grant writers who also touch individual giving, events, or capital campaigns.",
  },
  {
    name: "Candid Learning",
    href: "https://learning.candid.org",
    blurb:
      "Free and paid courses on proposal writing, foundation research, and funder relations. The gold standard for nonprofit ed.",
  },
  {
    name: "Nonprofit Tech for Good",
    href: "https://www.nptechforgood.com",
    blurb:
      "Heather Mansfield's long-running blog + webinar library on digital marketing, fundraising tools, and sector trends.",
  },
];

const VERIFY: ResourceLink[] = [
  {
    name: "Candid (GuideStar)",
    href: "https://www.guidestar.org",
    blurb:
      "Single source of truth for nonprofit legal status, 990 filings, and program data. Claim your org's profile to become visible to funders.",
  },
  {
    name: "ProPublica Nonprofit Explorer",
    href: "https://projects.propublica.org/nonprofits",
    blurb:
      "Free alternative to GuideStar for looking up 990s and funder financials. Useful for reverse-engineering funder priorities.",
  },
  {
    name: "IRS Tax Exempt Organization Search",
    href: "https://apps.irs.gov/app/eos",
    blurb:
      "The authoritative IRS check for 501(c)(3) status. Bookmark this — many funders require you to paste your IRS listing into proposals.",
  },
  {
    name: "Grants.gov",
    href: "https://www.grants.gov",
    blurb:
      "Every federal grant in one place. We pull from here nightly, but the primary source is still worth knowing for deep-dive research.",
  },
];

const COMMUNITY: ResourceLink[] = [
  {
    name: "r/nonprofit",
    href: "https://www.reddit.com/r/nonprofit",
    blurb:
      "60k+ members. Brutally honest about tool fatigue, compensation, burnout. Lurk first; ask questions that show you did your homework.",
  },
  {
    name: "r/grantwriting",
    href: "https://www.reddit.com/r/grantwriting",
    blurb:
      "Smaller but more specific. Active discussion of RFP language, narrative techniques, and funder psychology.",
  },
  {
    name: "GPA Local Chapters",
    href: "https://grantprofessionals.org/chapters",
    blurb:
      "In-person meetups across every major US metro. The fastest way to find a mentor — most chapters pair new writers with veterans.",
  },
  {
    name: "TechSoup",
    href: "https://www.techsoup.org",
    blurb:
      "Discounted software for nonprofits ($100 Microsoft 365, free Google Workspace, etc.). Not grant-specific but essential infrastructure.",
  },
];

function ResourceCard({ name, href, blurb }: ResourceLink) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-6 hover:border-brand-teal/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-warm-900 dark:text-warm-50 group-hover:text-brand-teal-text transition-colors">
          {name}
        </h3>
        <ArrowUpRight
          className="h-4 w-4 text-warm-400 group-hover:text-brand-teal-text group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0 mt-0.5"
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-sm text-warm-600 dark:text-warm-400 leading-relaxed">
        {blurb}
      </p>
    </a>
  );
}

function Section({
  eyebrow,
  title,
  Icon,
  items,
}: {
  eyebrow: string;
  title: string;
  Icon: typeof BookOpen;
  items: ResourceLink[];
}) {
  return (
    <section className="py-14">
      <div className="mb-8 max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-teal/10 px-3 py-1">
          <Icon className="h-3.5 w-3.5 text-brand-teal-text" aria-hidden="true" />
          <p className="text-xs font-semibold text-brand-teal-text tracking-[0.12em] uppercase">
            {eyebrow}
          </p>
        </div>
        <h2 className="mt-4 text-2xl md:text-3xl font-bold tracking-[-0.01em] text-warm-900 dark:text-warm-50">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <ResourceCard key={item.name} {...item} />
        ))}
      </div>
    </section>
  );
}

export default function ResourcesPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-24 px-4 border-b border-warm-200 dark:border-warm-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-brand-teal-text tracking-[0.2em] uppercase">
            Resources
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.05]">
            The grant writer&apos;s short list.
          </h1>
          <p className="mt-5 text-lg text-warm-600 dark:text-warm-400 leading-relaxed max-w-2xl mx-auto">
            Everything outside GrantAQ that&apos;s actually worth your time.
            No affiliate links, no sponsored picks — just where the
            professionals we respect send people.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4">
        <Section
          eyebrow="Learn the craft"
          title="Where professional grant writers train."
          Icon={BookOpen}
          items={LEARN}
        />
        <Section
          eyebrow="Verify funders & your org"
          title="Trusted sources for nonprofit and funder data."
          Icon={ShieldCheck}
          items={VERIFY}
        />
        <Section
          eyebrow="Find your people"
          title="Where nonprofit leaders actually hang out."
          Icon={Users}
          items={COMMUNITY}
        />

        {/* YouTube playlist slot — replace iframe src with the real
            GrantAQ playlist embed URL once the channel has content. */}
        <section className="py-14">
          <div className="mb-8 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-teal/10 px-3 py-1">
              <PlayCircle
                className="h-3.5 w-3.5 text-brand-teal-text"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-brand-teal-text tracking-[0.12em] uppercase">
                Free tutorials
              </p>
            </div>
            <h2 className="mt-4 text-2xl md:text-3xl font-bold tracking-[-0.01em] text-warm-900 dark:text-warm-50">
              Learn from our YouTube channel.
            </h2>
            <p className="mt-3 text-warm-600 dark:text-warm-400 leading-relaxed">
              Short videos on needs statements, logic models, match funding,
              and every other thing funders ask you to include. New video
              every other week.
            </p>
          </div>
          <div className="rounded-2xl border border-warm-200 dark:border-warm-800 bg-warm-50 dark:bg-warm-900/40 aspect-video flex flex-col items-center justify-center text-center px-6">
            <PlayCircle
              className="h-10 w-10 text-warm-400 mb-3"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              Our tutorial library is launching soon.
            </p>
            <p className="mt-1 text-xs text-warm-500 max-w-sm">
              Subscribe to the newsletter below and we&apos;ll send you the
              first video the day it ships.
            </p>
            <Link
              href="#newsletter-heading"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-warm-900 dark:text-warm-50 hover:text-brand-teal-text transition-colors"
            >
              Get notified
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <NewsletterCapture
        source="resources_page"
        eyebrow="Free · Every Monday morning"
        headline="Get the Monday grant roundup."
        subheadline="3 fresh federal + foundation opportunities, filtered by sector. Straight to your inbox. Unsubscribe in one click."
      />
    </>
  );
}
