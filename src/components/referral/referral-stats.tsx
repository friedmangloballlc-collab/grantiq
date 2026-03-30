"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Gift } from "lucide-react";
import { useState } from "react";

interface ReferralStatsProps {
  code: string;
  totalReferrals: number;
  signedUp: number;
  creditsEarned: number;
}

export function ReferralStats({
  code,
  totalReferrals,
  signedUp,
  creditsEarned,
}: ReferralStatsProps) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/ref/${code}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-brand-teal" /> Referral Program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-warm-500">
          Share your link. When someone signs up, you get $50 credit toward AI writing.
        </p>
        <div className="flex gap-2">
          <input
            value={url}
            readOnly
            className="flex-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800 px-3 py-2 text-sm"
          />
          <Button variant="outline" size="icon" onClick={copy} aria-label="Copy referral link">
            <Copy className="h-4 w-4" />
            {copied && <span className="sr-only">Copied</span>}
          </Button>
        </div>
        {copied && (
          <p className="text-xs text-brand-teal">Link copied to clipboard!</p>
        )}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">
              {totalReferrals}
            </p>
            <p className="text-xs text-warm-500">Referrals</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{signedUp}</p>
            <p className="text-xs text-warm-500">Signed Up</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-teal">${creditsEarned}</p>
            <p className="text-xs text-warm-500">Credits Earned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
