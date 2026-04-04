import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminStats } from "@/components/admin/admin-stats";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "getreachmediallc@gmail.com";

const QUICK_LINKS = [
  { href: "/admin/corrections", label: "Review Corrections", description: "Approve or reject user-submitted grant data fixes" },
  { href: "/admin/users", label: "Manage Users", description: "View users, orgs, tiers, and subscriptions" },
];

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    userCountResult,
    orgCountResult,
    grantCountResult,
    pipelineCountResult,
    signupsWeekResult,
    signupsMonthResult,
    subscriptionTiersResult,
    pendingCorrectionsResult,
  ] = await Promise.all([
    // Total users
    admin
      .from("auth.users" as "org_members")
      .select("*", { count: "exact", head: true }),

    // Total orgs
    admin
      .from("organizations")
      .select("*", { count: "exact", head: true }),

    // Total grants in library
    admin
      .from("grant_sources")
      .select("*", { count: "exact", head: true }),

    // Total pipeline items
    admin
      .from("grant_pipeline")
      .select("*", { count: "exact", head: true }),

    // Signups this week — using org_members as proxy for users with orgs
    admin
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfWeek.toISOString()),

    // Signups this month
    admin
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),

    // Subscriptions by tier
    admin
      .from("subscriptions")
      .select("tier"),

    // Pending corrections (last 5 for preview)
    admin
      .from("grant_corrections")
      .select("id, grant_id, field_name, suggested_value, created_at, user_id, grant_sources(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Tally subscription tiers
  const tierCounts: Record<string, number> = {};
  for (const row of subscriptionTiersResult.data ?? []) {
    const t = (row as { tier: string }).tier ?? "free";
    tierCounts[t] = (tierCounts[t] ?? 0) + 1;
  }

  const topStats = [
    { label: "Total Users", value: userCountResult.count ?? 0 },
    { label: "Total Orgs", value: orgCountResult.count ?? 0 },
    { label: "Grants in Library", value: grantCountResult.count ?? 0 },
    { label: "Pipeline Items", value: pipelineCountResult.count ?? 0 },
    {
      label: "Signups This Week",
      value: signupsWeekResult.count ?? 0,
      description: `${signupsMonthResult.count ?? 0} this month`,
    },
  ];

  const pendingCorrections = (pendingCorrectionsResult.data ?? []) as Array<{
    id: string;
    grant_id: string;
    field_name: string;
    suggested_value: string | null;
    created_at: string;
    user_id: string;
    grant_sources: { name?: string } | null;
  }>;

  return (
    <div className="space-y-8 max-w-6xl px-4 md:px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform overview for {ADMIN_EMAIL}</p>
      </div>

      {/* Key metrics */}
      <AdminStats stats={topStats} />

      {/* Revenue summary */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Summary — Subscriptions by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(tierCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscription data.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {(["free", "starter", "pro", "growth", "enterprise"] as const).map((tier) => {
                const count = tierCounts[tier] ?? 0;
                if (count === 0) return null;
                return (
                  <div
                    key={tier}
                    className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-5 py-3 min-w-[90px]"
                  >
                    <span className="text-xl font-bold text-warm-900 dark:text-warm-50">{count}</span>
                    <span className="mt-1 text-xs font-medium text-muted-foreground capitalize">{tier}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending corrections preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pending Corrections</CardTitle>
          <Link
            href="/admin/corrections"
            className="text-xs font-medium text-[var(--color-brand-teal-text)] hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {pendingCorrections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending corrections.</p>
          ) : (
            <ul className="space-y-2">
              {pendingCorrections.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-warm-900 dark:text-warm-50 truncate">
                      {c.grant_sources?.name ?? c.grant_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Field: <span className="font-mono">{c.field_name}</span>
                    </p>
                    <p className="text-xs text-[var(--color-brand-teal-text)] truncate">
                      Suggestion: {c.suggested_value}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-border bg-card px-5 py-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-md hover:border-[var(--color-brand-teal)]/40"
            >
              <p className="font-medium text-warm-900 dark:text-warm-50 group-hover:text-[var(--color-brand-teal-text)] transition-colors">
                {link.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
