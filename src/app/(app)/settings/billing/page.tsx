import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const TIER_PRICES: Record<string, string> = {
  free: "$0/mo",
  starter: "$79/mo",
  pro: "$199/mo",
  enterprise: "$499/mo",
};

const TIER_LIMITS: Record<string, { matches: number; roadmaps: number; readiness: number }> = {
  free: { matches: 1, roadmaps: 1, readiness: 1 },
  starter: { matches: 5, roadmaps: 5, readiness: 10 },
  pro: { matches: 20, roadmaps: 20, readiness: 50 },
  enterprise: { matches: 100, roadmaps: 100, readiness: 200 },
};

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscription = null;
  let usageStats = { matches: 0, roadmaps: 0, readiness: 0 };

  if (user) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membership) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("tier, status, current_period_end, stripe_customer_id")
        .eq("org_id", membership.org_id)
        .single();
      subscription = sub;

      // Fetch usage for current period (month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usage } = await supabase
        .from("ai_usage")
        .select("action_type")
        .eq("org_id", membership.org_id)
        .gte("created_at", startOfMonth.toISOString());

      if (usage) {
        usageStats.matches = usage.filter((u: { action_type: string }) => u.action_type === "match").length;
        usageStats.roadmaps = usage.filter((u: { action_type: string }) => u.action_type === "roadmap").length;
        usageStats.readiness = usage.filter((u: { action_type: string }) => u.action_type === "readiness_score").length;
      }
    }
  }

  const tier = subscription?.tier ?? "free";
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Billing & Plan</h1>
        <p className="text-sm text-warm-500 mt-1">
          Manage your subscription and view usage.
        </p>
      </div>

      {/* Current Plan */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-warm-900 dark:text-warm-50">
                {TIER_LABELS[tier] ?? tier}
              </p>
              <p className="text-sm text-warm-500">{TIER_PRICES[tier] ?? "—"}</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                subscription?.status === "active"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-warm-100 text-warm-600 dark:bg-warm-800 dark:text-warm-400"
              }`}
            >
              {subscription?.status ?? "free"}
            </span>
          </div>

          {periodEnd && (
            <p className="text-sm text-warm-500">
              Next billing date: <span className="text-warm-700 dark:text-warm-300">{periodEnd}</span>
            </p>
          )}

          <div className="flex gap-3 pt-2">
            {subscription?.stripe_customer_id ? (
              <form action="/api/billing/portal" method="POST">
                <Button type="submit" variant="outline">
                  Manage Billing
                </Button>
              </form>
            ) : (
              <Link
                href="/upgrade"
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage This Month */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader>
          <CardTitle className="text-base">Usage This Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Grant Matching Runs", used: usageStats.matches, limit: limits.matches },
            { label: "Roadmap Generations", used: usageStats.roadmaps, limit: limits.roadmaps },
            { label: "Readiness Scores", used: usageStats.readiness, limit: limits.readiness },
          ].map(({ label, used, limit }) => {
            const pct = Math.min((used / limit) * 100, 100);
            const isNearLimit = pct >= 80;
            return (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-warm-700 dark:text-warm-300">{label}</span>
                  <span
                    className={`font-medium ${
                      isNearLimit
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-warm-900 dark:text-warm-50"
                    }`}
                  >
                    {used} / {limit}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-warm-200 dark:bg-warm-700">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isNearLimit ? "bg-orange-500" : "bg-brand-teal"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Upgrade CTA for free/starter */}
      {(tier === "free" || tier === "starter") && (
        <Card className="border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10">
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
                Need more capacity?
              </p>
              <p className="text-xs text-warm-500 mt-0.5">
                Upgrade to unlock more matching runs, roadmaps, and team seats.
              </p>
            </div>
            <Link
              href="/upgrade"
              className="inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-colors hover:bg-primary/80 shrink-0"
            >
              View Plans
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
