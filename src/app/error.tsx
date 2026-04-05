"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/error-reporter";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "global", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 dark:bg-warm-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
            Something went wrong
          </h1>
          <p className="text-sm text-warm-500">
            An unexpected error occurred. Our team has been notified.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-medium text-white transition-colors hover:bg-brand-teal/90"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-warm-200 dark:border-warm-700 px-6 text-sm font-medium text-warm-700 dark:text-warm-300 transition-colors hover:bg-warm-100 dark:hover:bg-warm-800"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
