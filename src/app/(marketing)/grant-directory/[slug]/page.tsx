import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("grant_sources")
    .select("id")
    .eq("is_active", true)
    .limit(5000);
  return (data ?? []).map((g) => ({ slug: g.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: grant } = await supabase
    .from("grant_sources")
    .select("name, funder_name, description")
    .eq("id", slug)
    .single();
  if (!grant) return { title: "Grant Not Found" };
  return {
    title: `${grant.name} | ${grant.funder_name} | GrantAQ`,
    description:
      grant.description?.slice(0, 160) ??
      `Learn about ${grant.name} from ${grant.funder_name}.`,
    openGraph: {
      title: `${grant.name} | GrantAQ`,
      description: grant.description?.slice(0, 160),
    },
  };
}

export const revalidate = 86400;

export default async function PublicGrantPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: grant } = await supabase
    .from("grant_sources")
    .select("*")
    .eq("id", slug)
    .single();

  if (!grant) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MonetaryGrant",
    name: grant.name,
    funder: { "@type": "Organization", name: grant.funder_name },
    ...(grant.amount_max
      ? { amount: { "@type": "MonetaryAmount", value: grant.amount_max, currency: "USD" } }
      : {}),
    ...(grant.description ? { description: grant.description } : {}),
    ...(grant.deadline ? { endDate: grant.deadline } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto py-12 px-4">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm-500 mb-6">
          <Link href="/grant-directory" className="hover:text-warm-900 dark:hover:text-warm-50">
            Grant Directory
          </Link>
          <span className="mx-2">/</span>
          <span className="text-warm-700 dark:text-warm-300 line-clamp-1">{grant.name}</span>
        </nav>

        {grant.source_type && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300 capitalize mb-3">
            {grant.source_type}
          </span>
        )}
        <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mt-2">{grant.name}</h1>
        <p className="text-lg text-warm-500 mt-1">{grant.funder_name}</p>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 p-4 bg-warm-50 dark:bg-warm-800/50 rounded-lg">
          <div>
            <span className="text-xs text-warm-500">Amount</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {grant.amount_max ? `Up to $${(grant.amount_max / 1000).toFixed(0)}K` : "Varies"}
            </p>
          </div>
          <div>
            <span className="text-xs text-warm-500">Deadline</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {grant.deadline
                ? new Date(grant.deadline).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Rolling"}
            </p>
          </div>
          <div>
            <span className="text-xs text-warm-500">Eligibility</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {Array.isArray(grant.eligibility_types)
                ? grant.eligibility_types.join(", ")
                : "See details"}
            </p>
          </div>
          <div>
            <span className="text-xs text-warm-500">Category</span>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {grant.category || "General"}
            </p>
          </div>
        </div>

        {/* Description */}
        {grant.description && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50 mb-3">
              About This Grant
            </h2>
            <p className="text-warm-600 dark:text-warm-400 leading-relaxed">{grant.description}</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 p-6 bg-brand-teal/5 dark:bg-brand-teal/10 rounded-xl border border-brand-teal/20 text-center">
          <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-50">
            Does this grant match your organization?
          </h3>
          <p className="text-sm text-warm-500 mt-1">
            Create a free GrantAQ account to see your match score and readiness assessment.
          </p>
          <Button
            className="mt-4 bg-brand-teal hover:bg-brand-teal-dark text-white"
            render={<Link href="/signup">Check Your Match — Free</Link>}
          />
        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/grant-directory"
            className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50"
          >
            &larr; Back to Grant Directory
          </Link>
        </div>
      </div>
    </>
  );
}
