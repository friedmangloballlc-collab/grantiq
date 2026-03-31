"use client";

import { Printer } from "lucide-react";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({ label = "Print / Save PDF", className }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        "inline-flex h-7 items-center gap-1.5 rounded-lg border border-warm-200 dark:border-warm-700 px-3 text-xs font-medium text-warm-600 dark:text-warm-400 hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors"
      }
    >
      <Printer className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
