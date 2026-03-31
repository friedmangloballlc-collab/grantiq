"use client";

import { Gift, Copy, Check } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface ReferralMiniCardProps {
  referralCode: string;
}

export function ReferralMiniCard({ referralCode }: ReferralMiniCardProps) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/ref/${referralCode}`
      : `https://grantaq.com/ref/${referralCode}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-teal/25 bg-brand-teal/5 dark:bg-brand-teal/10 px-4 py-3">
      <Gift className="h-4 w-4 text-brand-teal shrink-0" />
      <p className="flex-1 min-w-0 text-sm text-warm-700 dark:text-warm-300">
        <span className="font-medium text-warm-900 dark:text-warm-50">Earn $50</span> for every
        referral{" "}
        <Link href="/settings/referrals" className="text-brand-teal hover:underline text-xs">
          See tiers →
        </Link>
      </p>
      <button
        onClick={copy}
        aria-label="Copy referral link"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-2.5 py-1.5 text-xs font-medium text-warm-700 dark:text-warm-300 hover:bg-warm-50 dark:hover:bg-warm-700 transition-colors"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-brand-teal" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy Link
          </>
        )}
      </button>
    </div>
  );
}
