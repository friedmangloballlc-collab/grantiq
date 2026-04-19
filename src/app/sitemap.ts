import { createAdminClient } from "@/lib/supabase/admin";
import type { MetadataRoute } from "next";
import { TOP_30_INDUSTRIES } from "@/app/(marketing)/grants/industry/[slug]/page";
import { ALL_STATE_CODES } from "@/app/(marketing)/grants/state/[state]/page";
import { INDUSTRY_META } from "@/app/(marketing)/grants/industry/[slug]/page";
import { BLOG_POSTS } from "@/lib/blog/posts";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  // ---------------------------------------------------------------------------
  // Individual grant detail pages — INTENTIONALLY OMITTED from sitemap
  // (2026-04-19). The 6,356 individual grant URLs at /grant-directory/[slug]
  // are no longer publicly indexed; pages now require login. Removing the
  // URLs from the sitemap stops Google from re-crawling stale public versions.
  // The supabase grants query is also removed for the same reason.
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Industry hub pages
  // ---------------------------------------------------------------------------
  const industryPages = TOP_30_INDUSTRIES.map((industry) => ({
    url: `https://grantaq.com/grants/industry/${industry}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  // ---------------------------------------------------------------------------
  // State pages
  // ---------------------------------------------------------------------------
  const statePages = ALL_STATE_CODES.map((code) => ({
    url: `https://grantaq.com/grants/state/${code.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // ---------------------------------------------------------------------------
  // Cross-reference pages — batch query instead of N+1
  // ---------------------------------------------------------------------------
  const crossRefPages: MetadataRoute.Sitemap = [];

  // Single query: get all category+state combos with 3+ grants
  const { data: crossRefData } = await supabase
    .from("grant_sources")
    .select("category, states")
    .eq("is_active", true)
    .not("category", "is", null);

  // Build a map of category+state → count
  const crossRefCounts = new Map<string, number>();
  for (const g of crossRefData ?? []) {
    if (!g.category || !g.states) continue;
    for (const state of g.states as string[]) {
      const key = `${g.category}::${state}`;
      crossRefCounts.set(key, (crossRefCounts.get(key) ?? 0) + 1);
    }
  }

  for (const industry of TOP_30_INDUSTRIES) {
    const meta = INDUSTRY_META[industry];
    for (const stateCode of ALL_STATE_CODES) {
      const total = meta.categories.reduce(
        (sum, cat) => sum + (crossRefCounts.get(`${cat.toLowerCase()}::${stateCode}`) ?? 0), 0
      );
      if (total >= 3) {
        crossRefPages.push({
          url: `https://grantaq.com/grants/industry/${industry}/${stateCode.toLowerCase()}`,
          lastModified: new Date(),
          changeFrequency: "daily" as const,
          priority: 0.75,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Blog pages
  // ---------------------------------------------------------------------------
  const blogIndexPage: MetadataRoute.Sitemap = [
    {
      url: "https://grantaq.com/blog",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    },
  ];

  const blogPostPages: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `https://grantaq.com/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    // Core pages
    {
      url: "https://grantaq.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: "https://grantaq.com/grants/states",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: "https://grantaq.com/pricing",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Removed from sitemap (2026-04-19) per business decision:
    // - /grant-directory and individual grant detail URLs (auth-gated now)
    // - /leaderboard (page deleted entirely)
    {
      url: "https://grantaq.com/check",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: "https://grantaq.com/grant-services",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: "https://grantaq.com/signup",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://grantaq.com/tools",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://grantaq.com/tools/readiness-quiz",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://grantaq.com/tools/funding-gap",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://grantaq.com/tools/budget-estimator",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://grantaq.com/tools/grant-timeline",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://grantaq.com/tools/eligibility-checker",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://grantaq.com/privacy",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://grantaq.com/terms",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // Blog
    ...blogIndexPage,
    ...blogPostPages,
    // Programmatic SEO pages (kept — drive organic signups; show
    // teaser content only, full grant details require login)
    ...industryPages,
    ...statePages,
    ...crossRefPages,
    // Individual grant pages REMOVED from sitemap (2026-04-19)
  ];
}
