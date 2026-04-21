import Link from "next/link";
import { CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter Confirmed — GrantAQ",
  robots: { index: false, follow: false },
};

export default async function NewsletterConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <AlertCircle
          className="h-12 w-12 text-amber-500 mx-auto mb-4"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-2">
          We couldn&apos;t confirm that link
        </h1>
        <p className="text-sm text-warm-600 dark:text-warm-400 mb-6">
          The confirmation link may have expired or already been used. Try
          subscribing again from the home page.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-warm-900 dark:text-warm-50 hover:text-brand-teal-text"
        >
          Back to home
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <CheckCircle2
        className="h-12 w-12 text-emerald-500 mx-auto mb-4"
        aria-hidden="true"
      />
      <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-2">
        You&apos;re on the list.
      </h1>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-8">
        The first Monday roundup arrives next week. While you wait, try a
        free eligibility check — most nonprofits find 3-5 grants they
        qualify for in under 60 seconds.
      </p>
      <Link
        href="/check"
        className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-warm-900 text-white hover:bg-warm-800 dark:bg-warm-50 dark:text-warm-900 text-sm font-semibold"
      >
        Run a free eligibility check
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
