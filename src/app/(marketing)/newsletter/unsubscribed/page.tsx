import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribed — GrantAQ",
  robots: { index: false, follow: false },
};

export default async function NewsletterUnsubscribedPage({
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
        <h1 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-2">
          We couldn&apos;t process that link
        </h1>
        <p className="text-sm text-warm-600 dark:text-warm-400">
          If you keep receiving emails after this, reply to any of them and
          we&apos;ll remove you by hand.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <CheckCircle2
        className="h-12 w-12 text-emerald-500 mx-auto mb-4"
        aria-hidden="true"
      />
      <h1 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-2">
        You&apos;ve been unsubscribed.
      </h1>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-6">
        You won&apos;t receive any more newsletter emails from us. Your
        account and product data are unaffected.
      </p>
      <Link
        href="/"
        className="text-sm font-semibold text-warm-700 dark:text-warm-300 hover:text-warm-900 dark:hover:text-warm-50"
      >
        Back to GrantAQ
      </Link>
    </div>
  );
}
