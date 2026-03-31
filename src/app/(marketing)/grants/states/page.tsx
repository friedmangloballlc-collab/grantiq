import Link from "next/link";
import type { Metadata } from "next";
import { STATE_NAMES } from "@/app/(marketing)/grants/state/[state]/page";
import { INDUSTRY_META } from "@/app/(marketing)/grants/industry/[slug]/page";
import { Button } from "@/components/ui/button";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Grants by State — Find Funding in Your State | GrantAQ",
  description:
    "Browse grants available in every US state. Find federal, state, and foundation funding opportunities for nonprofits, schools, and small businesses in your state.",
  alternates: {
    canonical: "https://grantaq.com/grants/states",
  },
};

export default function AllStatesPage() {
  const states = Object.entries(STATE_NAMES).sort((a, b) =>
    a[1].localeCompare(b[1])
  );
  const industries = Object.entries(INDUSTRY_META).slice(0, 10);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      {/* Breadcrumbs */}
      <nav className="text-sm text-warm-500 mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-brand-teal">
              Home
            </Link>
          </li>
          <li className="text-warm-300">/</li>
          <li>
            <Link href="/grant-directory" className="hover:text-brand-teal">
              Grant Directory
            </Link>
          </li>
          <li className="text-warm-300">/</li>
          <li className="text-warm-700 dark:text-warm-300">Grants by State</li>
        </ol>
      </nav>

      <h1 className="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50 mb-4">
        Grants by State
      </h1>
      <p className="text-warm-600 dark:text-warm-400 mb-10 max-w-2xl">
        Select your state to browse active grant opportunities available to nonprofits, schools,
        municipalities, and small businesses in that state.
      </p>

      {/* State grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-14">
        {states.map(([code, name]) => (
          <Link
            key={code}
            href={`/grants/state/${code.toLowerCase()}`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-warm-200 dark:border-warm-700 hover:border-brand-teal hover:text-brand-teal text-sm text-warm-700 dark:text-warm-300 transition-colors"
          >
            <span className="font-mono text-xs font-bold text-warm-400 dark:text-warm-500 w-6 shrink-0">
              {code}
            </span>
            <span className="truncate">{name}</span>
          </Link>
        ))}
      </div>

      {/* Industry cross-links */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-4">
          Browse by Funding Category
        </h2>
        <div className="flex flex-wrap gap-2">
          {industries.map(([slug, meta]) => (
            <Link key={slug} href={`/grants/${slug}`}>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300 hover:border-brand-teal hover:text-brand-teal transition-colors">
                {meta.label} Grants
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="p-8 bg-brand-teal/5 dark:bg-brand-teal/10 rounded-2xl border border-brand-teal/20 text-center">
        <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">
          Get matched to grants in YOUR state — instantly
        </h2>
        <p className="text-warm-500 mt-2">
          GrantAQ&apos;s AI finds every grant your organization qualifies for, in your state and
          nationwide.
        </p>
        <Button
          className="mt-5 bg-brand-teal hover:bg-brand-teal-dark text-white"
          render={<Link href="/signup">Start Free — No Credit Card</Link>}
        />
      </div>
    </div>
  );
}
