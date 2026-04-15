"use client";

import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";

// Re-export as mutable array for backwards compatibility with indexOf(string)
import { TIER_ORDER as _TIER_ORDER } from "@/lib/billing/feature-gates";
export const TIER_ORDER: string[] = [..._TIER_ORDER];

interface UpgradeGateProps {
  /** The feature identifier shown in the upgrade prompt, e.g. "AI Writing" */
  feature: string;
  /** The minimum tier required to access this feature */
  requiredTier: "starter" | "pro" | "growth" | "enterprise";
  /** Content to render when access is granted */
  children: React.ReactNode;
  /**
   * When true, renders a standalone card instead of blurring the children.
   * Useful for gating entire page sections.
   */
  variant?: "blur" | "card";
}

export function UpgradeGate({
  requiredTier,
  feature,
  children,
  variant = "blur",
}: UpgradeGateProps) {
  const { tier } = useOrg();
  const userLevel = TIER_ORDER.indexOf(tier);
  const requiredLevel = TIER_ORDER.indexOf(requiredTier);

  // User has access — render children
  if (userLevel >= requiredLevel) return <>{children}</>;

  const tierLabel = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1);

  if (variant === "card") {
    return (
      <div className="rounded-xl border border-warm-200 dark:border-warm-800 bg-warm-50 dark:bg-warm-900/50 p-8 text-center space-y-4">
        <div className="mx-auto w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-brand-teal" />
        </div>
        <div>
          <p className="text-base font-semibold text-warm-900 dark:text-warm-50">
            Upgrade to {tierLabel} to unlock {feature}
          </p>
          <p className="text-sm text-warm-500 mt-1">
            This feature is available on the {tierLabel} plan and above.
          </p>
        </div>
        <Button
          className="bg-brand-teal hover:bg-brand-teal-dark text-white"
          render={<Link href="/upgrade">Upgrade to {tierLabel}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-warm-900/80 rounded-xl">
        <div className="text-center p-6 space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-brand-teal" />
          </div>
          <p className="text-base font-semibold text-warm-900 dark:text-warm-50">
            Upgrade to {tierLabel} to unlock {feature}
          </p>
          <Button
            className="bg-brand-teal hover:bg-brand-teal-dark text-white"
            render={<Link href="/upgrade">Upgrade Now</Link>}
          />
        </div>
      </div>
    </div>
  );
}
