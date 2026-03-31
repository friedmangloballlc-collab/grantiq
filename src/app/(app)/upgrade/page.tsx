"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";
import { SUBSCRIPTION_PRODUCTS, type SubscriptionTierKey } from "@/lib/stripe/products";

const TIER_KEYS: SubscriptionTierKey[] = ["starter", "pro", "growth", "enterprise"];

const TIER_DISPLAY: Record<SubscriptionTierKey, { highlighted: boolean; badge?: string }> = {
  starter: { highlighted: false },
  pro: { highlighted: true, badge: "Most Popular" },
  growth: { highlighted: false },
  enterprise: { highlighted: false },
};

function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

export default function UpgradePage() {
  const { tier: currentTier } = useOrg();
  const router = useRouter();
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [loading, setLoading] = useState<SubscriptionTierKey | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

  async function handleUpgrade(tier: SubscriptionTierKey) {
    setLoading(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Checkout error:", data.error);
        setLoading(null);
        return;
      }

      if (data.mock) {
        setIsMockMode(true);
        setLoading(null);
        return;
      }

      if (data.url) {
        router.push(data.url);
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      setLoading(null);
    }
  }

  return (
    <div className="max-w-5xl px-4 md:px-6 py-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">Choose Your Plan</h1>
        <p className="text-warm-500 mt-2">
          Unlock the full power of GrantAQ&apos;s AI-driven grant discovery and writing tools.
        </p>

        {/* Monthly / Annual toggle */}
        <div className="mt-6 inline-flex items-center gap-3 bg-warm-100 dark:bg-warm-800 rounded-full p-1">
          <button
            onClick={() => setInterval("month")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              interval === "month"
                ? "bg-white dark:bg-warm-700 text-warm-900 dark:text-warm-50 shadow-sm"
                : "text-warm-500 hover:text-warm-700 dark:hover:text-warm-300"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("year")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
              interval === "year"
                ? "bg-white dark:bg-warm-700 text-warm-900 dark:text-warm-50 shadow-sm"
                : "text-warm-500 hover:text-warm-700 dark:hover:text-warm-300"
            )}
          >
            Annual
            <span className="text-xs font-semibold text-brand-teal bg-brand-teal/10 px-1.5 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Mock mode banner */}
      {isMockMode && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-center">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Payment setup coming soon — contact us to upgrade.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Reach out at{" "}
            <a href="mailto:hello@grantaq.com" className="underline">
              hello@grantaq.com
            </a>{" "}
            and we will get you set up.
          </p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TIER_KEYS.map((tierKey) => {
          const product = SUBSCRIPTION_PRODUCTS[tierKey];
          const display = TIER_DISPLAY[tierKey];
          const price =
            interval === "year"
              ? formatPrice(Math.round(product.annualPrice / 12))
              : formatPrice(product.monthlyPrice);
          const isCurrentPlan = currentTier === tierKey;
          const isDowngrade =
            ["free", "starter", "pro", "enterprise"].indexOf(currentTier) >
            ["free", "starter", "pro", "enterprise"].indexOf(tierKey);

          return (
            <Card
              key={tierKey}
              className={cn(
                "border-warm-200 dark:border-warm-800 relative",
                display.highlighted && "border-brand-teal ring-2 ring-brand-teal/20",
                isCurrentPlan && "border-brand-teal/50"
              )}
            >
              {display.badge && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-teal text-white text-xs font-medium px-3 py-1 rounded-full">
                  {display.badge}
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warm-700 dark:bg-warm-300 text-white dark:text-warm-900 text-xs font-medium px-3 py-1 rounded-full">
                  Current Plan
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-bold text-warm-900 dark:text-warm-50">{price}</span>
                  <span className="text-warm-500 text-sm mb-1">/mo</span>
                </div>
                {interval === "year" && (
                  <p className="text-xs text-warm-400">
                    Billed {formatPrice(product.annualPrice)}/year
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                <ul className="space-y-2">
                  {product.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-warm-600 dark:text-warm-400"
                    >
                      <Check className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn(
                    "w-full",
                    display.highlighted && !isCurrentPlan
                      ? "bg-brand-teal hover:bg-brand-teal-dark text-white"
                      : ""
                  )}
                  variant={display.highlighted && !isCurrentPlan ? "default" : "outline"}
                  disabled={isCurrentPlan || isDowngrade || loading !== null}
                  onClick={() => handleUpgrade(tierKey)}
                >
                  {loading === tierKey
                    ? "Redirecting..."
                    : isCurrentPlan
                    ? "Current Plan"
                    : isDowngrade
                    ? "Downgrade"
                    : `Upgrade to ${product.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-warm-400">
        All plans include a 14-day free trial. Cancel anytime. No hidden fees.
      </p>
    </div>
  );
}
