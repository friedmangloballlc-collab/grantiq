"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Gift, Mail, Share2, MessageCircle, Check } from "lucide-react";
import { useState } from "react";
import { REFERRAL_REWARDS, getNextReward, getCurrentReward } from "@/lib/referral/rewards";

interface ReferralDashboardProps {
  code: string;
  totalReferrals: number;
  signedUp: number;
  active: number;
  creditsEarned: number;
}

export function ReferralDashboard({
  code,
  totalReferrals,
  signedUp,
  active,
  creditsEarned,
}: ReferralDashboardProps) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/ref/${code}`
      : `https://grantaq.com/ref/${code}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextReward = getNextReward(signedUp);
  const _currentReward = getCurrentReward(signedUp);
  const remaining = nextReward ? nextReward.count - signedUp : 0;

  const emailBody = encodeURIComponent(
    `Hey! I've been using GrantAQ to find grants for my organization and it's been great. Sign up with my link and get a free 14-day Strategist trial: ${url}`
  );
  const emailSubject = encodeURIComponent("Get a free 14-day GrantAQ trial");
  const tweetText = encodeURIComponent(
    `I've been using @GrantAQ to find AI-matched grants. Get a free 14-day Strategist trial here: ${url}`
  );
  const linkedinText = encodeURIComponent(
    `I've been using GrantAQ — an AI-powered grant discovery platform. Sign up with my link for a free 14-day Strategist trial: ${url}`
  );

  return (
    <div className="space-y-5">
      {/* Referral Link Card */}
      <Card className="border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-brand-teal">
            <Gift className="h-5 w-5" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-warm-600 dark:text-warm-300">
            Share this link. When someone signs up, you both win — they get a 14-day Strategist
            trial; you earn rewards.
          </p>
          <div className="flex gap-2">
            <input
              value={url}
              readOnly
              className="flex-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-3 py-2 text-sm font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copy}
              aria-label="Copy referral link"
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-brand-teal" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          {copied && <p className="text-xs text-brand-teal font-medium">Link copied!</p>}

          {/* Share Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={copy}
              className="gap-1.5 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </Button>
            <a
              href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${linkedinText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              LinkedIn
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${tweetText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Twitter
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracker */}
      {nextReward && (
        <Card className="border-warm-200 dark:border-warm-800">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-warm-900 dark:text-warm-50">
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-warm-600 dark:text-warm-300">
              {signedUp === 0 ? (
                <>
                  Refer{" "}
                  <span className="font-semibold text-brand-teal">{nextReward.count} person</span>{" "}
                  to unlock:{" "}
                  <span className="font-semibold text-warm-900 dark:text-warm-50">
                    {nextReward.reward}
                  </span>
                </>
              ) : (
                <>
                  You&apos;ve referred{" "}
                  <span className="font-semibold text-warm-900 dark:text-warm-50">{signedUp}</span>{" "}
                  {signedUp === 1 ? "person" : "people"}. Refer{" "}
                  <span className="font-semibold text-brand-teal">{remaining} more</span> to unlock:{" "}
                  <span className="font-semibold text-warm-900 dark:text-warm-50">
                    {nextReward.reward}
                  </span>
                </>
              )}
            </p>

            {/* Tier ladder */}
            <div className="space-y-2 pt-1">
              {REFERRAL_REWARDS.referrer.map((tier) => {
                const isUnlocked = signedUp >= tier.count;
                const isNext = tier === nextReward;
                return (
                  <div
                    key={tier.count}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                      isUnlocked
                        ? "bg-brand-teal/10 border border-brand-teal/30"
                        : isNext
                          ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-300/40"
                          : "border border-warm-200/60 dark:border-warm-800/60 opacity-60"
                    }`}
                  >
                    <span
                      className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isUnlocked
                          ? "bg-brand-teal text-white"
                          : isNext
                            ? "bg-amber-400 text-white"
                            : "bg-warm-200 dark:bg-warm-700 text-warm-500 dark:text-warm-400"
                      }`}
                    >
                      {tier.count}
                    </span>
                    <span
                      className={
                        isUnlocked
                          ? "text-warm-900 dark:text-warm-50 font-medium"
                          : "text-warm-600 dark:text-warm-400"
                      }
                    >
                      {tier.reward}
                    </span>
                    {isUnlocked && (
                      <span className="ml-auto text-xs font-medium text-brand-teal">Unlocked</span>
                    )}
                    {isNext && (
                      <span className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400">
                        Next up
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-warm-900 dark:text-warm-50">
            Your Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{totalReferrals}</p>
              <p className="text-xs text-warm-500 mt-0.5">Total Referred</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{signedUp}</p>
              <p className="text-xs text-warm-500 mt-0.5">Signed Up</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{active}</p>
              <p className="text-xs text-warm-500 mt-0.5">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-teal">${creditsEarned}</p>
              <p className="text-xs text-warm-500 mt-0.5">Credits Earned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What your referrals get */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-warm-900 dark:text-warm-50">
            What Your Referrals Get
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-warm-600 dark:text-warm-300">
            Anyone who signs up using your link gets a{" "}
            <span className="font-semibold text-warm-900 dark:text-warm-50">
              14-day Strategist trial
            </span>{" "}
            — instead of the standard Explorer plan. That means{" "}
            <span className="font-medium">10 grant matches</span> (vs. 5), full AI writing access,
            and priority support for 2 weeks. No credit card required.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
