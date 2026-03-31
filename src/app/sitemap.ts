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
  // Individual grant detail pages
  // ---------------------------------------------------------------------------
  const { data: grants } = await supabase
    .from("grant_sources")
    .select("id, last_verified")
    .eq("is_active", true)
    .limit(50000);

  const grantPages = (grants ?? []).map((g) => ({
    url: `https://grantaq.com/grant-directory/${g.id}`,
    lastModified: g.last_verified ?? new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

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
  // Cross-reference pages — only generate where >= 3 grants exist
  // ---------------------------------------------------------------------------
  const crossRefPages: MetadataRoute.Sitemap = [];

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
      url: "https://grantaq.com/grant-directory",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
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
    {
      url: "https://grantaq.com/leaderboard",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: "https://grantaq.com/tools/funding-gap",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Blog
    ...blogIndexPage,
    ...blogPostPages,
    // Programmatic SEO pages
    ...industryPages,
    ...statePages,
    ...crossRefPages,
    // Individual grant pages
    ...grantPages,
  ];
}
