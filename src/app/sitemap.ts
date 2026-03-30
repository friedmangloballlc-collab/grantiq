import { createAdminClient } from "@/lib/supabase/admin";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();
  const { data: grants } = await supabase
    .from("grant_sources")
    .select("id, last_verified")
    .eq("is_active", true)
    .limit(50000);

  const grantPages = (grants ?? []).map((g) => ({
    url: `https://grantiq.com/grant-directory/${g.id}`,
    lastModified: g.last_verified ?? new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    { url: "https://grantiq.com", lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: "https://grantiq.com/grant-directory", lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: "https://grantiq.com/pricing", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: "https://grantiq.com/leaderboard", lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: "https://grantiq.com/tools/funding-gap", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...grantPages,
  ];
}
