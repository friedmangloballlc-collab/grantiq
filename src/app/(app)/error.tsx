"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50">
          Something went wrong
        </h2>
        <p className="text-sm text-warm-500 max-w-sm">
          An unexpected error occurred. Our team has been notified. Please try again.
        </p>
      </div>
      <Button
        onClick={reset}
        className="bg-brand-teal hover:bg-brand-teal-dark text-white"
      >
        Try again
      </Button>
    </div>
  );
}
