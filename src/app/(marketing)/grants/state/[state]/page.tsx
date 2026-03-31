import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const ALL_STATE_CODES = Object.keys(STATE_NAMES);

const STATE_FAQS: (stateName: string) => Array<{ q: string; a: string }> = (stateName) => [
  {
    q: `What types of grants are available in ${stateName}?`,
    a: `${stateName} organizations can access federal grants (open to all states), ${stateName}-specific state agency grants, regional foundation grants, and local community foundation awards. Federal programs represent the largest pool; state agency grants often have shorter application cycles and local preference.`,
  },
  {
    q: `Do I need to be incorporated in ${stateName} to apply for state grants?`,
    a: `For most ${stateName} state agency grants, yes — organizations must be registered to do business in ${stateName} and often must demonstrate primary service delivery within the state. Federal grants are open regardless of incorporation state, provided your program serves eligible populations.`,
  },
  {
    q: `How do I find ${stateName} state grant opportunities?`,
    a: `${stateName} state agency grants are published through the state grants portal, individual agency websites (health department, arts commission, housing finance agency, etc.), and GrantIQ's aggregated database. GrantIQ pulls all active state grants alongside federal and foundation opportunities so you see everything in one place.`,
  },
  {
    q: `What is the deadline cycle for ${stateName} grants?`,
    a: `${stateName} state grant deadlines vary widely by agency. Many education and health grants align with the state fiscal year (often July 1). Community development grants may have spring deadlines. Federal grants follow agency-specific cycles. GrantIQ tracks all deadlines and sends alerts before they close.`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

// ---------------------------------------------------------------------------
// Static Params & Metadata
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  return ALL_STATE_CODES.map((state) => ({ state }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const stateCode = state.toUpperCase();
  const stateName = STATE_NAMES[stateCode];
  if (!stateName) return {};

  return {
    title: `Grants in ${stateName} — ${stateCode} Funding Opportunities | GrantIQ`,
    description: `Browse active grants available to organizations in ${stateName}. Find federal, state, and foundation funding with AI-powered matching for your ${stateName} nonprofit or business.`,
    alternates: {
      canonical: `https://grantiq.com/grants/state/${stateCode.toLowerCase()}`,
    },
    openGraph: {
      title: `Grants in ${stateName} | GrantIQ`,
      description: `Find grants available to ${stateName} organizations. AI-matched to your specific mission and eligibility.`,
      url: `https://grantiq.com/grants/state/${stateCode.toLowerCase()}`,
      siteName: "GrantIQ",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function StateGrantPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const stateCode = state.toUpperCase();
  const stateName = STATE_NAMES[stateCode];
  if (!stateName) notFound();

  const supabase = createAdminClient();

  // Query grants where the states array contains this state code
  const { data: grants, count } = await supabase
    .from("grant_sources")
    .select(
      "id, name, funder_name, source_type, amount_max, deadline, category, description, states",
      { count: "exact" }
    )
    .eq("is_active", true)
    .contains("states", [stateCode])
    .order("amount_max", { ascending: false, nullsFirst: false })
    .limit(24);

  const grantCount = count ?? grants?.length ?? 0;

  // Stats
  const amounts = (grants ?? [])
    .map((g) => g.amount_max)
    .filter((a): a is number => typeof a === "number" && a > 0);
  const totalFunding = amounts.reduce((s, a) => s + a, 0);
  const avgAward = amounts.length ? Math.round(totalFunding / amounts.length) : null;

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  for (const g of grants ?? []) {
    if (g.category) {
      categoryCounts[g.category] = (categoryCounts[g.category] ?? 0) + 1;
    }
  }
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  const faqs = STATE_FAQS(stateName);

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
        name: `Grants in ${stateName}`,
        item: `https://grantiq.com/grants/state/${stateCode.toLowerCase()}`,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
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
          <ol className="flex items-center gap-2">
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
            <li className="text-warm-700 dark:text-warm-300">
              Grants in {stateName}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50">
            Grants in {stateName}:{" "}
            <span className="text-brand-teal">
              {grantCount > 0 ? `${grantCount}+` : "Active"} Funding Opportunities
            </span>
          </h1>
          <p className="text-warm-600 dark:text-warm-400 mt-4 max-w-3xl leading-relaxed">
            Organizations in {stateName} can access federal grants open to all states, {stateName}
            -specific state agency funding, regional foundation awards, and corporate giving
            programs. GrantIQ tracks every active grant available to {stateName} nonprofits,
            schools, municipalities, and small businesses — and uses AI to match your organization
            to the funding you actually qualify for.
          </p>
        </div>

        {/* Stats Block */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Grants Available", value: grantCount > 0 ? `${grantCount}+` : "—" },
            {
              label: "Total Funding Tracked",
              value: totalFunding > 0 ? formatCurrency(totalFunding) : "—",
            },
            {
              label: "Average Award",
              value: avgAward ? formatCurrency(avgAward) : "—",
            },
            {
              label: "State",
              value: stateCode,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-warm-200 dark:border-warm-700 p-4 bg-warm-50 dark:bg-warm-800/30 text-center"
            >
              <p className="text-xl font-bold text-brand-teal truncate">{stat.value}</p>
              <p className="text-xs text-warm-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Top categories */}
        {topCategories.length > 0 && (
          <div className="mb-8">
            <h3 className="text-base font-semibold text-warm-700 dark:text-warm-300 mb-3">
              Top Funding Categories in {stateName}
            </h3>
            <div className="flex flex-wrap gap-2">
              {topCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-brand-teal/10 text-brand-teal border border-brand-teal/20 capitalize"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Grant Cards */}
        {grants && grants.length > 0 ? (
          <>
            <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-5">
              Active Grants in {stateName}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {grants.map((grant) => (
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
                      <p className="text-xs text-warm-500 line-clamp-2 mb-3">
                        {grant.description}
                      </p>
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
          </>
        ) : (
          <div className="py-12 text-center text-warm-500 border border-warm-200 dark:border-warm-800 rounded-xl mb-10">
            <p className="font-medium">New grants are added daily.</p>
            <p className="text-sm mt-1">
              Create a free account to get notified when new grants are posted for {stateName}.
            </p>
          </div>
        )}

        {/* Browse all states */}
        <div className="mb-10">
          <h3 className="text-base font-semibold text-warm-700 dark:text-warm-300 mb-3">
            Browse Grants by State
          </h3>
          <div className="flex flex-wrap gap-2">
            {ALL_STATE_CODES.filter((sc) => sc !== stateCode).slice(0, 20).map((sc) => (
              <Link key={sc} href={`/grants/state/${sc.toLowerCase()}`}>
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400 hover:border-brand-teal hover:text-brand-teal transition-colors">
                  {STATE_NAMES[sc]}
                </span>
              </Link>
            ))}
            <Link href="/grants/states">
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border border-brand-teal/30 text-brand-teal hover:bg-brand-teal/5 transition-colors">
                View All States →
              </span>
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-6">
            Frequently Asked Questions: {stateName} Grants
          </h2>
          <div className="space-y-5">
            {faqs.map((faq) => (
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
            Find {stateName} grants that match YOUR organization
          </h2>
          <p className="text-warm-500 mt-2 max-w-xl mx-auto">
            Answer a few questions about your organization and GrantIQ&apos;s AI instantly shows
            every grant in {stateName} — and nationwide — that you qualify for.
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
