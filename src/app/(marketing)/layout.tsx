import { MarketingNav } from "@/components/marketing/marketing-nav";
import { CookieConsent } from "@/components/shared/cookie-consent";
import Link from "next/link";

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
                      href={`/grants/${ind.slug}`}
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
              &copy; {new Date().getFullYear()} GrantIQ &mdash; Friedman Global LLC. All rights
              reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="/privacy"
                className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50"
              >
                Terms of Service
              </a>
              <a
                href="/grant-directory"
                className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50"
              >
                Grant Directory
              </a>
            </div>
          </div>
        </div>
      </footer>
      <CookieConsent />
    </div>
  );
}
