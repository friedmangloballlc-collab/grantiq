"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";

interface ShareMatchCardProps {
  matchCount: number;
  totalValue: number;
  orgName: string;
  referralCode?: string;
}

export function ShareMatchCard({
  matchCount,
  totalValue,
  orgName,
  referralCode,
}: ShareMatchCardProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const getShareUrl = () => {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://grantaq.com";
    const token = btoa(
      JSON.stringify({ count: matchCount, value: totalValue, org: orgName, ref: referralCode ?? "" })
    );
    return `${base}/share/results/${encodeURIComponent(token)}`;
  };

  const handleShare = async () => {
    setIsGenerating(true);
    const shareUrl = getShareUrl();
    const text = `GrantAQ found ${matchCount} grants worth $${
      totalValue >= 1_000_000
        ? (totalValue / 1_000_000).toFixed(1) + "M"
        : totalValue >= 1_000
          ? (totalValue / 1_000).toFixed(0) + "K"
          : totalValue
    } for ${orgName}. Get your own free grant matches:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "GrantAQ Grant Matches", text, url: shareUrl });
      } catch {
        // User cancelled or share not supported — fall through to copy
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
    setIsGenerating(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      disabled={isGenerating}
      className="gap-1.5"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-brand-teal" />
          <span>Link Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          <span>Share Your Results</span>
        </>
      )}
    </Button>
  );
}
