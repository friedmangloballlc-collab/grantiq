import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grant Directory — 5,000+ Funding Opportunities | GrantIQ",
  description:
    "Browse thousands of federal, state, foundation, and corporate grants. Filter by type, amount, and eligibility to find funding that fits your organization.",
};

export const revalidate = 3600;

interface SearchParams {
  page?: string;
  type?: string;
}

const PAGE_SIZE = 24;
const SOURCE_TYPES = ["federal", "state", "foundation", "corporate"] as const;

export default async function GrantDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageStr, type } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createAdminClient();

  let query = supabase
    .from("grant_sources")
    .select("id, name, funder_name, source_type, amount_max, deadline, category, description", {
      count: "exact",
    })
    .eq("is_active", true)
    .order("amount_max", { ascending: false, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (type) {
    query = query.eq("source_type", type);
  }

  const { data: grants, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">Grant Directory</h1>
        <p className="text-warm-500 mt-2">
          Browse {count?.toLocaleString() ?? "thousands of"} active grants. Create a free account to see your match score.
        </p>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link href="/grants">
          <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors",
            !type
              ? "bg-brand-teal text-white border-brand-teal"
              : "border-warm-300 text-warm-600 hover:border-brand-teal dark:border-warm-700 dark:text-warm-400"
          )}>
            All
          </span>
        </Link>
        {SOURCE_TYPES.map((t) => (
          <Link key={t} href={type === t ? "/grants" : `/grants?type=${t}`}>
            <span className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors capitalize",
              type === t
                ? "bg-brand-teal text-white border-brand-teal"
                : "border-warm-300 text-warm-600 hover:border-brand-teal dark:border-warm-700 dark:text-warm-400"
            )}>
              {t}
            </span>
          </Link>
        ))}
      </div>

      {grants && grants.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grants.map((grant) => (
            <Link key={grant.id} href={`/grants/${grant.id}`}>
              <Card className="h-full border-warm-200 dark:border-warm-800 hover:border-brand-teal/50 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug line-clamp-2">{grant.name}</CardTitle>
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
                        ? `Up to $${(grant.amount_max / 1000).toFixed(0)}K`
                        : "Amount varies"}
                    </span>
                    <span>
                      {grant.deadline
                        ? `Due ${new Date(grant.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "Rolling deadline"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-warm-500">No grants found for the selected filter.</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-12">
          {page > 1 && (
            <Button
              variant="outline"
              render={
                <Link href={`/grants?page=${page - 1}${type ? `&type=${type}` : ""}`}>Previous</Link>
              }
            />
          )}
          <span className="text-sm text-warm-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button
              variant="outline"
              render={
                <Link href={`/grants?page=${page + 1}${type ? `&type=${type}` : ""}`}>Next</Link>
              }
            />
          )}
        </div>
      )}

      {/* CTA */}
      <div className="mt-16 p-8 bg-brand-teal/5 dark:bg-brand-teal/10 rounded-2xl border border-brand-teal/20 text-center">
        <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">Find grants that match YOUR organization</h2>
        <p className="text-warm-500 mt-2">Create a free account to get AI-powered match scores for every grant.</p>
        <Button
          className="mt-4 bg-brand-teal hover:bg-brand-teal-dark text-white"
          render={<Link href="/signup">Get Your Free Match Report</Link>}
        />
      </div>
    </div>
  );
}
