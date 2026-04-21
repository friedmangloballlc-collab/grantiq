import { MarketingNav } from "@/components/marketing/marketing-nav";
import { CookieConsent } from "@/components/shared/cookie-consent";
import { CrispChat } from "@/components/shared/crisp-chat";
import Link from "next/link";

// Social links — placeholders use `#` until the accounts are live.
// Swap the href strings to real URLs once the company pages exist.
// We picked 4 icons, not 12 — Tier 1 (LinkedIn, YouTube) + Tier 2
// (Facebook, X) from the audience-fit ranking. IG/TikTok/Discord
// would be off-brand for a nonprofit grant SaaS.
//
// Using inline SVGs because lucide-react removed all brand icons
// over trademark concerns in late 2024 and we don't want to add a
// second icon package just for four glyphs. Paths are taken from
// the official Simple Icons set (CC0).
type SocialLink = {
  href: string;
  label: string;
  path: React.ReactNode;
};

const SOCIALS: SocialLink[] = [
  {
    href: "#",
    label: "LinkedIn",
    path: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    ),
  },
  {
    href: "#",
    label: "YouTube",
    path: (
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    ),
  },
  {
    href: "#",
    label: "Facebook",
    path: (
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    ),
  },
  {
    href: "#",
    label: "X (formerly Twitter)",
    path: (
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    ),
  },
];

const TOP_INDUSTRIES = [
  { slug: "healthcare", label: "Healthcare" },
  { slug: "education", label: "Education" },
  { slug: "arts-culture", label: "Arts & Culture" },
  { slug: "environment", label: "Environment" },
  { slug: "technology", label: "Technology" },
  { slug: "housing", label: "Housing" },
  { slug: "workforce", label: "Workforce" },
  { slug: "youth", label: "Youth" },
  { slug: "veterans", label: "Veterans" },
  { slug: "human-services", label: "Human Services" },
];

const TOP_STATES = [
  { code: "ca", name: "California" },
  { code: "tx", name: "Texas" },
  { code: "ny", name: "New York" },
  { code: "fl", name: "Florida" },
  { code: "il", name: "Illinois" },
  { code: "pa", name: "Pennsylvania" },
  { code: "oh", name: "Ohio" },
  { code: "ga", name: "Georgia" },
  { code: "nc", name: "North Carolina" },
  { code: "mi", name: "Michigan" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-warm-900">
      <MarketingNav />
      {children}
      <footer className="border-t border-warm-200 dark:border-warm-800 pt-12 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Programmatic SEO link grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Grants by Industry */}
            <div>
              <h3 className="text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-3">
                Grants by Industry
              </h3>
              <ul className="grid grid-cols-2 gap-1">
                {TOP_INDUSTRIES.map((ind) => (
                  <li key={ind.slug}>
                    <Link
                      href={`/grants/industry/${ind.slug}`}
                      className="text-sm text-warm-500 hover:text-brand-teal transition-colors"
                    >
                      {ind.label} Grants
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Grants by State */}
            <div>
              <h3 className="text-xs font-semibold text-warm-700 dark:text-warm-300 uppercase tracking-wider mb-3">
                Grants by State
              </h3>
              <ul className="grid grid-cols-2 gap-1">
                {TOP_STATES.map((st) => (
                  <li key={st.code}>
                    <Link
                      href={`/grants/state/${st.code}`}
                      className="text-sm text-warm-500 hover:text-brand-teal transition-colors"
                    >
                      Grants in {st.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/grants/states"
                    className="text-sm text-brand-teal hover:underline font-medium"
                  >
                    All States →
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-warm-200 dark:border-warm-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-warm-500">
              &copy; {new Date().getFullYear()} GrantAQ &mdash; Friedman Global LLC. All rights
              reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link href="/about" className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50">
                About
              </Link>
              <Link href="/resources" className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50">
                Resources
              </Link>
              <Link href="/privacy" className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50">
                Terms
              </Link>
              <Link href="/grant-directory" className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50">
                Directory
              </Link>
              <Link href="/partners" className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50">
                Partners
              </Link>
            </div>
            <div className="flex items-center gap-1">
              {SOCIALS.map(({ href, label, path }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-warm-500 hover:text-brand-teal-text hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    {path}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
      <CookieConsent />
      <CrispChat />
    </div>
  );
}
