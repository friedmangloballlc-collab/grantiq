// Grant directory — REPLACED 2026-04-19 with an auth-gate.
//
// Background: this route previously listed all 6,356 grants paginated for
// any anonymous visitor. That made our entire inventory scrapeable by
// competitors. Per business decision, the route now:
//   - Anonymous visitors → see a teaser page (counts only, no grant
//     details) with a sign-up CTA. Old SEO traffic still lands on a
//     page; they just can't browse the inventory.
//   - Authenticated visitors → redirected to /library (the in-app
//     search experience, which has its own per-tier rate limiting).

import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grant Directory — Sign Up to Browse | GrantAQ",
  description:
    "Browse thousands of federal, state, foundation, and corporate grants matched to your organization. Create a free account to see grants you actually qualify for.",
  alternates: {
    canonical: "https://grantaq.com/grant-directory",
  },
  // Tell Google not to index this teaser page (we want signup CTAs to
  // surface, but the old "browse 5000 grants" content is gone).
  robots: { index: false, follow: true },
};

export const revalidate = 3600;

export default async function GrantDirectoryPage() {
  // Authenticated users → straight to the in-app library
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect("/library");
  }

  // Anonymous: show a teaser with aggregate stats only
  const admin = createAdminClient();
  const { count: grantCount } = await admin
    .from("grant_sources")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const displayCount = grantCount ? `${Math.floor(grantCount / 100) * 100}+` : "5,000+";

  return (
    <div className="max-w-3xl mx-auto py-20 px-4 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-warm-900 dark:text-warm-50 mb-6">
        {displayCount} active grants. Matched to your org.
      </h1>
      <p className="text-lg text-warm-600 dark:text-warm-400 mb-10 max-w-2xl mx-auto">
        Our directory covers federal, state, foundation, and corporate grants —
        but generic browsing wastes hours. Create a free account and our AI
        will surface only the grants you actually qualify for, with match
        scores, eligibility analysis, and deadline tracking.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
        <Button
          className="bg-brand-teal hover:bg-brand-teal-dark text-white text-lg px-8 py-6"
          render={<Link href="/signup">Start Free</Link>}
        />
        <Button
          variant="outline"
          className="text-lg px-8 py-6"
          render={<Link href="/check">Free Eligibility Check</Link>}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-8 text-left max-w-3xl mx-auto">
        <div>
          <h3 className="font-semibold text-warm-900 dark:text-warm-50 mb-2">
            Why we don&apos;t list grants here
          </h3>
          <p className="text-sm text-warm-600 dark:text-warm-400">
            A 6,000-grant directory you scroll through is a worse experience
            than 25 matched grants picked for your mission. We do the
            matching first.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-warm-900 dark:text-warm-50 mb-2">
            What you get with an account
          </h3>
          <p className="text-sm text-warm-600 dark:text-warm-400">
            AI match scores per grant, eligibility breakdown, deadline
            tracking, and (on paid tiers) full proposal drafting.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-warm-900 dark:text-warm-50 mb-2">
            Want a feel for our coverage?
          </h3>
          <p className="text-sm text-warm-600 dark:text-warm-400">
            Browse our{" "}
            <Link href="/grants/states" className="text-brand-teal hover:underline">
              state-by-state
            </Link>{" "}
            and{" "}
            <Link href="/grants/industry/healthcare" className="text-brand-teal hover:underline">
              industry
            </Link>{" "}
            overviews — they show category breakdowns without the inventory.
          </p>
        </div>
      </div>
    </div>
  );
}
