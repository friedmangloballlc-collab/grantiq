// Individual grant detail page — AUTH-GATED 2026-04-19.
//
// Anonymous visitors → see only the grant name + funder + a sign-up CTA
// (no description, eligibility, deadline, or amount detail).
// Authenticated visitors → redirected to /library?grant=<id> for the
// in-app experience with rate limiting + match scoring.
//
// generateStaticParams removed: we no longer pre-build static pages for
// every grant (that would re-leak the inventory via build artifacts and
// cached HTML on the CDN). Pages are now dynamic and minimal.

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: grant } = await supabase
    .from("grant_sources")
    .select("name, funder_name")
    .eq("id", slug)
    .single();
  if (!grant) return { title: "Grant Not Found" };
  return {
    title: `${grant.name} | Sign Up to View Details | GrantAQ`,
    // Generic description so search-result snippets don't leak the grant
    // description that's now login-gated.
    description: `View match score, eligibility, and application strategy for ${grant.name} from ${grant.funder_name}. Free account required.`,
    robots: { index: false, follow: true },
    openGraph: {
      title: `${grant.name} | GrantAQ`,
      description: `Sign up to view full details and your match score for this ${grant.funder_name} grant.`,
    },
  };
}

// No revalidate cache + no static params — dynamic only, so the auth
// check runs on every request and we don't ship cached HTML with grant
// details to the CDN.
export const dynamic = "force-dynamic";

export default async function PublicGrantPage({ params }: Props) {
  const { slug } = await params;

  // Authenticated users → into the in-app library, scoped to this grant
  const authedSupabase = await createServerSupabaseClient();
  const { data: { user } } = await authedSupabase.auth.getUser();
  if (user) {
    redirect(`/library?grant=${slug}`);
  }

  // Anonymous: surface only the name + funder name (everything that's
  // already in the public URL slug + already crawled by Google before
  // 2026-04-19). Description, amount, deadline, eligibility, category
  // — all login-gated now.
  const supabase = createAdminClient();
  const { data: grant } = await supabase
    .from("grant_sources")
    .select("name, funder_name, source_type")
    .eq("id", slug)
    .single();

  if (!grant) notFound();

  return (
    <div className="max-w-2xl mx-auto py-20 px-4 text-center">
      {grant.source_type && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300 capitalize mb-4">
          {grant.source_type}
        </span>
      )}
      <h1 className="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50 mb-2">
        {grant.name}
      </h1>
      <p className="text-lg text-warm-500 mb-10">from {grant.funder_name}</p>

      <div className="p-8 bg-brand-teal/5 dark:bg-brand-teal/10 rounded-xl border border-brand-teal/20">
        <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50 mb-3">
          See the full picture — free.
        </h2>
        <p className="text-warm-600 dark:text-warm-400 mb-6 max-w-md mx-auto">
          Sign up to see your AI match score, eligibility breakdown, deadline
          tracking, and the funder&apos;s award patterns for this grant.
          Generic browsing is gone — we surface only the grants that fit
          your mission.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="bg-brand-teal hover:bg-brand-teal-dark text-white text-base px-6 py-5"
            render={<Link href="/signup">Start Free</Link>}
          />
          <Button
            variant="outline"
            className="text-base px-6 py-5"
            render={<Link href="/check">Run Free Eligibility Check</Link>}
          />
        </div>
      </div>

      <div className="mt-12 text-sm text-warm-500">
        Already have an account?{" "}
        <Link href={`/login?next=/library?grant=${slug}`} className="text-brand-teal hover:underline">
          Log in to view this grant
        </Link>
      </div>
    </div>
  );
}
