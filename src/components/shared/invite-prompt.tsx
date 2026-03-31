"use client";

import { useState, useEffect } from "react";
import { X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export type InvitePromptVariant =
  | "first_match"      // After first match found
  | "scorecard"        // After scorecard completed
  | "pipeline_saved";  // After grant saved to pipeline

interface InvitePromptProps {
  variant: InvitePromptVariant;
  referralCode: string;
  orgName?: string;
  score?: number; // For scorecard variant
  /** localStorage key used to remember dismissal */
  storageKey?: string;
}

const VARIANT_COPY: Record<
  InvitePromptVariant,
  { heading: string; body: string; cta: string }
> = {
  first_match: {
    heading: "Know someone who needs grants?",
    body: "Share GrantIQ and earn $50 in account credit for every person who signs up.",
    cta: "Share & Earn $50",
  },
  scorecard: {
    heading: "Share your readiness score on LinkedIn",
    body: "Your Grant Readiness Score is ready. Share it to show the world you\u2019re serious about funding.",
    cta: "Share My Score",
  },
  pipeline_saved: {
    heading: "Invite a colleague to collaborate",
    body: "Working on grants with a team? Invite them to GrantIQ and earn $50 credit when they sign up.",
    cta: "Invite a Colleague",
  },
};

export function InvitePrompt({
  variant,
  referralCode,
  orgName,
  score,
  storageKey,
}: InvitePromptProps) {
  const key = storageKey ?? `invite-prompt-dismissed-${variant}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(key);
    if (!dismissed) setVisible(true);
  }, [key]);

  const dismiss = () => {
    localStorage.setItem(key, "1");
    setVisible(false);
  };

  const handleCta = () => {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://grantiq.com";
    const refUrl = `${base}/ref/${referralCode}`;

    if (variant === "scorecard" && score != null && orgName) {
      const token = btoa(JSON.stringify({ score, org: orgName, ref: referralCode }));
      const shareUrl = `${base}/score/${encodeURIComponent(token)}`;
      const text = encodeURIComponent(
        `My organization scored ${score}/100 for Grant Readiness on GrantIQ. See how your organization compares: ${shareUrl}`
      );
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${text}`, "_blank");
    } else {
      navigator.clipboard?.writeText(refUrl);
      window.open(`/settings/referrals`, "_blank");
    }
    dismiss();
  };

  if (!visible) return null;

  const copy = VARIANT_COPY[variant];

  return (
    <div className="relative flex items-start gap-4 rounded-xl border border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10 px-4 py-3.5 pr-10">
      <div className="shrink-0 mt-0.5">
        <Gift className="h-5 w-5 text-brand-teal" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">{copy.heading}</p>
        <p className="text-xs text-warm-500 leading-relaxed">{copy.body}</p>
        <Button
          size="sm"
          onClick={handleCta}
          className="h-7 px-3 text-xs bg-brand-teal hover:bg-brand-teal/90 text-white"
        >
          {copy.cta}
        </Button>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 text-warm-400 hover:text-warm-600 dark:hover:text-warm-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
