// Grant directory — TEASER PAGE 2026-04-19.
//
// Anonymous visitors see CATEGORY COUNTS but no individual grant details.
// Each count is a conversion hook: "look how many grants you're missing,
// sign up to see them." Authenticated visitors → /library.
//
// What we deliberately show:
//   - Total active count (rounded down to nearest 100, never exact)
//   - Breakdown by funder type (federal/state/foundation/corporate)
//   - Top 10 industry categories with counts
//   - Amount-tier breakdown ("X grants over $100K")
//   - Deadline urgency ("X grants closing this month")
//   - Geographic spread ("X states covered")
//
// What we deliberately hide:
//   - Individual grant names, funders, descriptions, deadlines
//   - The full list — every count is bounded, never paginated

import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grant Directory — Sign Up to See Matches | GrantAQ",
  description:
    "Thousands of federal, state, foundation, and corporate grants. Create a free account and our AI surfaces the grants that fit your organization — not a 6,000-row spreadsheet.",
  alternates: {
    canonical: "https://grantaq.com/grant-directory",
  },
  robots: { index: false, follow: true },
};

export const revalidate = 3600;

const SOURCE_TYPE_LABELS: Record<string, string> = {
  federal: "Federal",
  state: "State",
  foundation: "Foundation",
  corporate: "Corporate",
};

function roundDown(n: number, step: number): string {
  if (!n) return "—";
  return `${(Math.floor(n / step) * step).toLocaleString()}+`;
}

export default async function GrantDirectoryPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect("/library");
  }

  const admin = createAdminClient();

  // Deadline window helpers — same date format the DB uses (YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];
  const in7  = new Date(Date.now() +  7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Aggregate stats — all counted, none returned as individual rows
  const [
    { count: totalCount },
    { data: sourceTypeRows },
    { data: categoryRows },
    { count: bigGrantsCount },
    { count: midGrantsCount },
    { count: closing7Count },
    { count: closing30Count },
    { count: closing90Count },
    { data: stateRows },
    { data: featuredGrants },
  ] = await Promise.all([
    admin.from("grant_sources").select("*", { count: "exact", head: true }).eq("is_active", true),
    admin.from("grant_sources").select("source_type").eq("is_active", true),
    admin.from("grant_sources").select("category").eq("is_active", true).not("category", "is", null),
    admin.from("grant_sources").select("*", { count: "exact", head: true }).eq("is_active", true).gte("amount_max", 100000),
    admin.from("grant_sources").select("*", { count: "exact", head: true }).eq("is_active", true).gte("amount_max", 25000).lt("amount_max", 100000),
    admin.from("grant_sources").select("*", { count: "exact", head: true }).eq("is_active", true).not("deadline", "is", null).gte("deadline", today).lte("deadline", in7),
    admin.from("grant_sources").select("*", { count: "exact", head: true }).eq("is_active", true).not("deadline", "is", null).gte("deadline", today).lte("deadline", in30),
    admin.from("grant_sources").select("*", { count: "exact", head: true }).eq("is_active", true).not("deadline", "is", null).gte("deadline", today).lte("deadline", in90),
    admin.from("grant_sources").select("states").eq("is_active", true).not("states", "is", null),
    // Featured grants for the hybrid teaser: 6 federal grants only.
    // Federal grants are public record on grants.gov, so showing them is
    // not a competitive leak — anyone can find them via grants.gov anyway.
    // Foundation/corporate grants stay 100% blurred since those are the
    // proprietary discoveries that drive our inventory advantage.
    admin
      .from("grant_sources")
      .select("id, name, funder_name, source_type, amount_max, deadline, category")
      .eq("is_active", true)
      .eq("source_type", "federal")
      .not("amount_max", "is", null)
      .gte("amount_max", 100000)
      .not("deadline", "is", null)
      .gte("deadline", today)
      .order("amount_max", { ascending: false })
      .limit(6),
  ]);

  // Build source-type breakdown
  const sourceTypeCounts = new Map<string, number>();
  for (const row of sourceTypeRows ?? []) {
    if (row.source_type) {
      sourceTypeCounts.set(row.source_type, (sourceTypeCounts.get(row.source_type) ?? 0) + 1);
    }
  }
  const sourceTypeBreakdown = Object.entries(SOURCE_TYPE_LABELS)
    .map(([key, label]) => ({ key, label, count: sourceTypeCounts.get(key) ?? 0 }))
    .filter((s) => s.count > 0);

  // Build top-10 category breakdown
  const categoryCounts = new Map<string, number>();
  for (const row of categoryRows ?? []) {
    if (row.category) {
      categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1);
    }
  }
  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));

  // Geographic coverage
  const stateSet = new Set<string>();
  for (const row of stateRows ?? []) {
    if (Array.isArray(row.states)) {
      for (const s of row.states as string[]) stateSet.add(s);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-16 px-4">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-warm-900 dark:text-warm-50 mb-4">
          {roundDown(totalCount ?? 0, 100)} active grants. <br className="hidden md:inline" />
          <span className="text-brand-teal">Matched to your org.</span>
        </h1>
        <p className="text-lg text-warm-600 dark:text-warm-400 mb-8 max-w-2xl mx-auto">
          Our directory covers federal, state, foundation, and corporate grants.
          Generic browsing wastes hours — sign up free and our AI surfaces the
          grants that actually fit your mission, with match scores and
          deadline tracking.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            className="bg-brand-teal hover:bg-brand-teal-dark text-white text-lg px-8 py-6"
            render={<Link href="/signup?utm_source=directory&utm_medium=hero">Start Free — See Your Matches</Link>}
          />
          <Button
            variant="outline"
            className="text-lg px-8 py-6"
            render={<Link href="/check?utm_source=directory&utm_medium=hero">Free Eligibility Check</Link>}
          />
        </div>
      </div>

      {/* Hybrid grant-cards: 6 real federal grants + 24 blurred placeholders */}
      {featuredGrants && featuredGrants.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-warm-900 dark:text-warm-50 mb-2 text-center">
            A glimpse of what&apos;s in your match list
          </h2>
          <p className="text-center text-sm text-warm-500 mb-6">
            6 federal grants shown below + {roundDown((totalCount ?? 0) - 6, 100)} more matched to your org when you sign up
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Real grants — federal, public-record info */}
            {featuredGrants.map((g, i) => {
              const fakeMatchScore = 75 + ((i * 7) % 22); // 75-96, deterministic per slot
              return (
                <div
                  key={g.id}
                  className="p-5 rounded-xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 hover:border-brand-teal hover:shadow-md transition-all relative"
                >
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-teal/10 text-brand-teal border border-brand-teal/30">
                    {fakeMatchScore}% match
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300 capitalize mb-2">
                    {g.source_type}
                  </span>
                  <h3 className="font-semibold text-warm-900 dark:text-warm-50 leading-snug line-clamp-2 mb-1">
                    {g.name}
                  </h3>
                  <p className="text-xs text-warm-500 line-clamp-1 mb-3">{g.funder_name}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-warm-500">Up to</span>
                      <p className="font-semibold text-warm-900 dark:text-warm-50">
                        ${g.amount_max ? `${(g.amount_max / 1000).toFixed(0)}K` : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-warm-500">Deadline</span>
                      <p className="font-semibold text-warm-900 dark:text-warm-50">
                        {g.deadline ? new Date(g.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Rolling"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Blurred placeholders — synthetic, no real data */}
            {Array.from({ length: 24 }).map((_, i) => {
              const fakeMatchScore = 70 + ((i * 13) % 28); // 70-97, deterministic per slot
              const widths = ["w-3/4", "w-5/6", "w-2/3", "w-4/5"];
              const w1 = widths[i % widths.length];
              const w2 = widths[(i + 2) % widths.length];
              return (
                <Link
                  key={`blurred-${i}`}
                  href={`/signup?utm_source=directory&utm_medium=blurred_card&utm_term=slot_${i}`}
                  className="block p-5 rounded-xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 relative overflow-hidden group hover:border-brand-teal hover:shadow-md transition-all cursor-pointer"
                  aria-label="Sign up to unlock this matched grant"
                >
                  {/* Match score badge — visible, attractive */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-teal/10 text-brand-teal border border-brand-teal/30 z-10">
                    {fakeMatchScore}% match
                  </div>
                  {/* Source-type pill — blurred */}
                  <div className="inline-block h-4 w-14 rounded bg-warm-200 dark:bg-warm-700 mb-2 blur-[3px]" aria-hidden />
                  {/* Name — blurred lines */}
                  <div className={`h-4 ${w1} bg-warm-300 dark:bg-warm-600 rounded mb-1.5 blur-[3px]`} aria-hidden />
                  <div className={`h-4 ${w2} bg-warm-300 dark:bg-warm-600 rounded mb-3 blur-[3px]`} aria-hidden />
                  {/* Funder — blurred */}
                  <div className="h-3 w-1/2 bg-warm-200 dark:bg-warm-700 rounded mb-4 blur-[3px]" aria-hidden />
                  {/* Stats row — blurred */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="h-3 w-10 bg-warm-200 dark:bg-warm-700 rounded mb-1 blur-[3px]" aria-hidden />
                      <div className="h-4 w-12 bg-warm-300 dark:bg-warm-600 rounded blur-[3px]" aria-hidden />
                    </div>
                    <div>
                      <div className="h-3 w-12 bg-warm-200 dark:bg-warm-700 rounded mb-1 blur-[3px]" aria-hidden />
                      <div className="h-4 w-14 bg-warm-300 dark:bg-warm-600 rounded blur-[3px]" aria-hidden />
                    </div>
                  </div>
                  {/* Lock overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/0 to-brand-teal/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="px-3 py-1.5 rounded-full bg-brand-teal text-white text-xs font-semibold shadow-lg flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                      Sign up to unlock
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <Button
              className="bg-brand-teal hover:bg-brand-teal-dark text-white px-6 py-5"
              render={<Link href="/signup?utm_source=directory&utm_medium=blurred_section_cta">Unlock All Matches — Free Account</Link>}
            />
          </div>
        </section>
      )}

      {/* Source type tiles */}
      {sourceTypeBreakdown.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-warm-900 dark:text-warm-50 mb-6 text-center">
            Where the funding comes from
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sourceTypeBreakdown.map((t) => (
              <Link
                key={t.key}
                href={`/signup?utm_source=directory&utm_medium=source_type&utm_term=${t.key}`}
                className="block p-6 rounded-xl border border-warm-200 dark:border-warm-800 hover:border-brand-teal hover:shadow-md transition-all bg-white dark:bg-warm-900"
              >
                <div className="text-3xl font-bold text-brand-teal mb-1">
                  {roundDown(t.count, 50)}
                </div>
                <div className="text-sm font-medium text-warm-900 dark:text-warm-50">
                  {t.label} grants
                </div>
                <div className="text-xs text-warm-500 mt-2">
                  Sign up to see matches →
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Deadline urgency — 3-tier breakdown */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-warm-900 dark:text-warm-50 mb-2 text-center">
          Deadlines you might be missing
        </h2>
        <p className="text-center text-sm text-warm-500 mb-6">
          We track every deadline. Sign up to see the ones you actually qualify for.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/signup?utm_source=directory&utm_medium=urgency&utm_term=closing_7d"
            className="block p-6 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-500 text-white">
              Critical
            </div>
            <div className="text-4xl font-bold text-red-600 dark:text-red-500 mb-2">
              {roundDown(closing7Count ?? 0, 5)}
            </div>
            <div className="text-base font-semibold text-warm-900 dark:text-warm-50">
              Close in 7 days
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400 mt-2">
              Last-call grants. If any match your org, you need to know
              tonight — not next week.
            </p>
          </Link>
          <Link
            href="/signup?utm_source=directory&utm_medium=urgency&utm_term=closing_30d"
            className="block p-6 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/30 hover:shadow-md transition-all"
          >
            <div className="text-4xl font-bold text-amber-600 dark:text-amber-500 mb-2">
              {roundDown(closing30Count ?? 0, 10)}
            </div>
            <div className="text-base font-semibold text-warm-900 dark:text-warm-50">
              Close in 30 days
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400 mt-2">
              Enough time to write a strong proposal — but only if you start
              this week.
            </p>
          </Link>
          <Link
            href="/signup?utm_source=directory&utm_medium=urgency&utm_term=closing_90d"
            className="block p-6 rounded-xl border border-warm-200 dark:border-warm-800 hover:border-brand-teal hover:shadow-md transition-all bg-white dark:bg-warm-900"
          >
            <div className="text-4xl font-bold text-warm-900 dark:text-warm-50 mb-2">
              {roundDown(closing90Count ?? 0, 25)}
            </div>
            <div className="text-base font-semibold text-warm-900 dark:text-warm-50">
              Close in 90 days
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400 mt-2">
              Your planning horizon. Sign up to build a quarterly grant
              calendar around the matches that fit.
            </p>
          </Link>
        </div>
      </section>

      {/* Money tiles */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-warm-900 dark:text-warm-50 mb-6 text-center">
          Funding by award size
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/signup?utm_source=directory&utm_medium=amount&utm_term=large"
            className="block p-6 rounded-xl bg-gradient-to-br from-brand-teal/10 to-brand-teal/5 border border-brand-teal/30 hover:shadow-md transition-all"
          >
            <div className="text-4xl font-bold text-brand-teal mb-2">
              {roundDown(bigGrantsCount ?? 0, 25)}
            </div>
            <div className="text-base font-semibold text-warm-900 dark:text-warm-50">
              Grants over $100K
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400 mt-2">
              Fund your largest programs. Average award size in our $100K+
              tier could change your annual budget.
            </p>
          </Link>
          <Link
            href="/signup?utm_source=directory&utm_medium=amount&utm_term=mid"
            className="block p-6 rounded-xl border border-warm-200 dark:border-warm-800 hover:border-brand-teal hover:shadow-md transition-all bg-white dark:bg-warm-900"
          >
            <div className="text-4xl font-bold text-warm-900 dark:text-warm-50 mb-2">
              {roundDown(midGrantsCount ?? 0, 25)}
            </div>
            <div className="text-base font-semibold text-warm-900 dark:text-warm-50">
              Grants $25K–$100K
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400 mt-2">
              The sweet-spot range for most nonprofits — manageable
              applications, real impact.
            </p>
          </Link>
        </div>
      </section>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-warm-900 dark:text-warm-50 mb-6 text-center">
            Funding by category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {topCategories.map((c) => (
              <Link
                key={c.category}
                href={`/signup?utm_source=directory&utm_medium=category&utm_term=${encodeURIComponent(c.category)}`}
                className="block p-4 rounded-lg border border-warm-200 dark:border-warm-800 hover:border-brand-teal hover:bg-warm-50 dark:hover:bg-warm-800/50 transition-all"
              >
                <div className="text-xl font-bold text-brand-teal">
                  {roundDown(c.count, 10)}
                </div>
                <div className="text-xs font-medium text-warm-700 dark:text-warm-300 capitalize line-clamp-2">
                  {c.category}
                </div>
              </Link>
            ))}
          </div>
          <p className="text-center text-sm text-warm-500 mt-4">
            And more — sign up to see every category matched to your mission.
          </p>
        </section>
      )}

      {/* Geographic + final CTA */}
      <section className="text-center py-12 px-6 rounded-2xl bg-gradient-to-br from-brand-teal/5 to-brand-teal/10 border border-brand-teal/20">
        <div className="text-5xl font-bold text-brand-teal mb-2">{stateSet.size}</div>
        <div className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-2">
          U.S. states + territories covered
        </div>
        <p className="text-warm-600 dark:text-warm-400 mb-6 max-w-xl mx-auto">
          From Alaska Native Health programs to Puerto Rico recovery funding —
          we cover the full geographic range. Sign up to see the grants that
          match your service area.
        </p>
        <Button
          className="bg-brand-teal hover:bg-brand-teal-dark text-white text-lg px-8 py-6"
          render={<Link href="/signup?utm_source=directory&utm_medium=footer_cta">See My Matches — Free</Link>}
        />
      </section>

      {/* Quiet escape hatches for the curious */}
      <div className="mt-12 text-center text-sm text-warm-500">
        Looking for a specific area? Browse our{" "}
        <Link href="/grants/states" className="text-brand-teal hover:underline">
          state overview
        </Link>{" "}
        or{" "}
        <Link href="/grants/industry/healthcare" className="text-brand-teal hover:underline">
          industry breakdowns
        </Link>
        {" — "}
        category-level views without the full inventory.
      </div>
    </div>
  );
}
