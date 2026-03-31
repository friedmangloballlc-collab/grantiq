import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INDUSTRY_META, TOP_30_INDUSTRIES } from "@/app/(marketing)/grants/[industry]/page";
import { STATE_NAMES, ALL_STATE_CODES } from "@/app/(marketing)/grants/state/[state]/page";

export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

// ---------------------------------------------------------------------------
// Static Params — only generate where >= 3 grants exist
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const supabase = createAdminClient();

  const pairs: Array<{ industry: string; state: string }> = [];

  for (const industry of TOP_30_INDUSTRIES) {
    const meta = INDUSTRY_META[industry];
    for (const stateCode of ALL_STATE_CODES) {
      const { count } = await supabase
        .from("grant_sources")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .in(
          "category",
          meta.categories.map((c) => c.toLowerCase())
        )
        .contains("states", [stateCode]);

      if ((count ?? 0) >= 3) {
        pairs.push({ industry, state: stateCode.toLowerCase() });
      }
    }
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string; state: string }>;
}): Promise<Metadata> {
  const { industry, state } = await params;
  const stateCode = state.toUpperCase();
  const meta = INDUSTRY_META[industry];
  const stateName = STATE_NAMES[stateCode];
  if (!meta || !stateName) return {};

  return {
    title: `${meta.label} Grants in ${stateName} — Funding Opportunities | GrantIQ`,
    description: `Find ${meta.label.toLowerCase()} grants available to organizations in ${stateName}. Browse active funding opportunities and get AI-matched to awards you qualify for.`,
    alternates: {
      canonical: `https://grantiq.com/grants/${industry}/${state}`,
    },
    openGraph: {
      title: `${meta.label} Grants in ${stateName} | GrantIQ`,
      description: `${meta.label} funding opportunities for ${stateName} organizations. AI-matched to your eligibility.`,
      url: `https://grantiq.com/grants/${industry}/${state}`,
      siteName: "GrantIQ",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IndustryStateGrantPage({
  params,
}: {
  params: Promise<{ industry: string; state: string }>;
}) {
  const { industry, state } = await params;
  const stateCode = state.toUpperCase();
  const meta = INDUSTRY_META[industry];
  const stateName = STATE_NAMES[stateCode];

  if (!meta || !stateName) notFound();

  const supabase = createAdminClient();
  const { data: grants, count } = await supabase
    .from("grant_sources")
    .select(
      "id, name, funder_name, source_type, amount_max, deadline, category, description",
      { count: "exact" }
    )
    .eq("is_active", true)
    .in(
      "category",
      meta.categories.map((c) => c.toLowerCase())
    )
    .contains("states", [stateCode])
    .order("amount_max", { ascending: false, nullsFirst: false })
    .limit(24);

  const grantCount = count ?? grants?.length ?? 0;

  if (grantCount === 0) notFound();

  // Stats
  const amounts = (grants ?? [])
    .map((g) => g.amount_max)
    .filter((a): a is number => typeof a === "number" && a > 0);
  const totalFunding = amounts.reduce((s, a) => s + a, 0);
  const avgAward = amounts.length ? Math.round(totalFunding / amounts.length) : null;

  // JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://grantiq.com" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Grant Directory",
        item: "https://grantiq.com/grant-directory",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${meta.label} Grants`,
        item: `https://grantiq.com/grants/${industry}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: `${meta.label} Grants in ${stateName}`,
        item: `https://grantiq.com/grants/${industry}/${state}`,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What ${meta.label.toLowerCase()} grants are available in ${stateName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${stateName} organizations can access ${grantCount}+ active ${meta.label.toLowerCase()} grants including federal programs open to all states, ${stateName} state agency grants, regional foundation awards, and corporate giving programs specific to ${meta.label.toLowerCase()} initiatives.`,
        },
      },
      {
        "@type": "Question",
        name: `How do I apply for ${meta.label.toLowerCase()} grants in ${stateName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Create a free GrantIQ account to see AI-matched ${meta.label.toLowerCase()} grants for your ${stateName} organization. GrantIQ shows your match score for each grant, tracks deadlines, and helps you write winning applications.`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="max-w-6xl mx-auto py-12 px-4">
        {/* Breadcrumbs */}
        <nav className="text-sm text-warm-500 mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 flex-wrap">
            <li>
              <Link href="/" className="hover:text-brand-teal">
                Home
              </Link>
            </li>
            <li className="text-warm-300">/</li>
            <li>
              <Link href="/grant-directory" className="hover:text-brand-teal">
                Grant Directory
              </Link>
            </li>
            <li className="text-warm-300">/</li>
            <li>
              <Link href={`/grants/${industry}`} className="hover:text-brand-teal">
                {meta.label} Grants
              </Link>
            </li>
            <li className="text-warm-300">/</li>
            <li className="text-warm-700 dark:text-warm-300">{stateName}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50">
            {meta.label} Grants in {stateName}:{" "}
            <span className="text-brand-teal">
              {grantCount}+ Funding Opportunities
            </span>
          </h1>
          <p className="text-warm-600 dark:text-warm-400 mt-4 max-w-3xl leading-relaxed">
            Find active {meta.label.toLowerCase()} grants available to organizations in {stateName}.
            This list includes federal programs open to all states, {stateName} state agency grants,
            regional foundations, and corporate funding in the {meta.label.toLowerCase()} sector.
            GrantIQ tracks every active opportunity and matches your organization to the grants you
            actually qualify for.
          </p>
        </div>

        {/* Stats Block */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Active Grants", value: `${grantCount}+` },
            {
              label: "Total Funding Tracked",
              value: totalFunding > 0 ? formatCurrency(totalFunding) : "—",
            },
            {
              label: "Average Award",
              value: avgAward ? formatCurrency(avgAward) : "—",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-warm-200 dark:border-warm-700 p-4 bg-warm-50 dark:bg-warm-800/30 text-center"
            >
              <p className="text-xl font-bold text-brand-teal">{stat.value}</p>
              <p className="text-xs text-warm-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Grant Cards */}
        <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-5">
          {meta.label} Grants in {stateName}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {(grants ?? []).map((grant) => (
            <Link key={grant.id} href={`/grant-directory/${grant.id}`}>
              <Card className="h-full border-warm-200 dark:border-warm-800 hover:border-brand-teal/50 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug line-clamp-2">
                      {grant.name}
                    </CardTitle>
                    {grant.source_type && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300 shrink-0 capitalize">
                        {grant.source_type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-warm-500">{grant.funder_name}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-warm-500 line-clamp-2 mb-3">{grant.description}</p>
                  <div className="flex items-center justify-between text-xs text-warm-600 dark:text-warm-400">
                    <span>
                      {grant.amount_max
                        ? `Up to ${formatCurrency(grant.amount_max)}`
                        : "Amount varies"}
                    </span>
                    <span>
                      {grant.deadline
                        ? `Due ${new Date(grant.deadline).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}`
                        : "Rolling deadline"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Cross-links */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <div className="rounded-xl border border-warm-200 dark:border-warm-700 p-5">
            <h3 className="font-semibold text-warm-900 dark:text-warm-50 mb-2">
              All {meta.label} Grants (Nationwide)
            </h3>
            <p className="text-sm text-warm-500 mb-3">
              See the full list of {meta.label.toLowerCase()} grants available across the country.
            </p>
            <Link
              href={`/grants/${industry}`}
              className="text-sm font-medium text-brand-teal hover:underline"
            >
              Browse {meta.label} Grants →
            </Link>
          </div>
          <div className="rounded-xl border border-warm-200 dark:border-warm-700 p-5">
            <h3 className="font-semibold text-warm-900 dark:text-warm-50 mb-2">
              All Grants in {stateName}
            </h3>
            <p className="text-sm text-warm-500 mb-3">
              See every grant — across all sectors — available to {stateName} organizations.
            </p>
            <Link
              href={`/grants/state/${state}`}
              className="text-sm font-medium text-brand-teal hover:underline"
            >
              Browse {stateName} Grants →
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-6">
            FAQs: {meta.label} Grants in {stateName}
          </h2>
          <div className="space-y-5">
            {[
              {
                q: `What ${meta.label.toLowerCase()} grants are available in ${stateName}?`,
                a: `${stateName} organizations can access ${grantCount}+ active ${meta.label.toLowerCase()} grants including federal programs, ${stateName} state agency grants, and regional foundation awards. Use GrantIQ to see your match score for each one.`,
              },
              {
                q: `Do ${stateName} ${meta.label.toLowerCase()} organizations have a funding advantage?`,
                a: `${stateName} organizations can apply for both state-specific grants and nationwide federal/foundation grants. State agency grants often move faster with less competition than federal programs. GrantIQ shows all your options in one dashboard.`,
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="border border-warm-200 dark:border-warm-700 rounded-xl p-5"
              >
                <h3 className="font-semibold text-warm-900 dark:text-warm-50 mb-2">{faq.q}</h3>
                <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 bg-brand-teal/5 dark:bg-brand-teal/10 rounded-2xl border border-brand-teal/20 text-center">
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">
            Find {meta.label} grants in {stateName} that match YOUR organization
          </h2>
          <p className="text-warm-500 mt-2 max-w-xl mx-auto">
            GrantIQ&apos;s AI instantly matches your {stateName} organization to every{" "}
            {meta.label.toLowerCase()} grant you qualify for.
          </p>
          <Button
            className="mt-5 bg-brand-teal hover:bg-brand-teal-dark text-white"
            render={<Link href="/signup">Get Your Free Match Report</Link>}
          />
        </div>
      </div>
    </>
  );
}
