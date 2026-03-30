"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Auth error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-warm-50)] px-4">
      <div className="text-center space-y-4 max-w-sm">
        <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50">
          Something went wrong
        </h2>
        <p className="text-sm text-warm-500">
          We ran into an issue. Please try again or return to the login page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-teal)" }}
          >
            Try again
          </button>
          <span className="text-warm-300">|</span>
          <Link
            href="/login"
            className="text-sm font-medium"
            style={{ color: "var(--color-brand-teal)" }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
