// src/lib/grants/imagery.ts
//
// Deterministic grant-card imagery. We don't have custom photography
// for each grant (there are 6,000+), so we pick an Unsplash photo
// based on source_type + a stable hash of the grant id.
//
// When we have real customer-facing imagery later, swap this module's
// output for a CDN URL pulled from grant_sources.image_url.
//
// All photos listed here are free-to-use under the Unsplash License
// (https://unsplash.com/license) and map to nonprofit / small-business
// / community themes — no tech-bro / generic-office cliches.

const COMMUNITY_POOL = [
  // Nonprofit / community / service themes
  "photo-1593113598332-cd288d649433?w=800", // community garden
  "photo-1469571486292-0ba58a3f068b?w=800", // volunteers packing boxes
  "photo-1529390079861-591de354faf5?w=800", // community meeting
  "photo-1577962917302-cd874c4e31d2?w=800", // diverse team working
  "photo-1559027615-cd4628902d4a?w=800", // woman mentoring
];

const SMALL_BUSINESS_POOL = [
  // Small business owner themes
  "photo-1507679799987-c73779587ccf?w=800", // small shop owner
  "photo-1556761175-5973dc0f32e7?w=800", // cafe owner behind counter
  "photo-1460925895917-afdab827c52f?w=800", // entrepreneur working
  "photo-1573496359142-b8d87734a5a2?w=800", // small business owner standing
  "photo-1551836022-d5d88e9218df?w=800", // artisan at work
];

const EDUCATION_POOL = [
  // Education / research / youth themes
  "photo-1427504494785-3a9ca7044f45?w=800", // students collaborating
  "photo-1529390079861-591de354faf5?w=800", // adult learning
  "photo-1503676260728-1c00da094a0b?w=800", // young people learning
];

const GOVERNMENT_POOL = [
  // Civic / government / policy themes
  "photo-1562564055-71e051d33c19?w=800", // capitol building warm
  "photo-1564501049412-61c2a3083791?w=800", // civic engagement
  "photo-1495020689067-958852a7765e?w=800", // hands typing on laptop
];

const UNSPLASH_BASE = "https://images.unsplash.com/";

export type GrantImageTheme =
  | "community"
  | "small_business"
  | "education"
  | "government"
  | "general";

function pickTheme(sourceType: string | null, category: string | null): GrantImageTheme {
  const c = (category ?? "").toLowerCase();
  const s = (sourceType ?? "").toLowerCase();

  if (c.includes("education") || c.includes("youth") || c.includes("school")) return "education";
  if (c.includes("business") || c.includes("sbir") || c.includes("entrepreneur")) return "small_business";
  if (s === "federal" || s === "state") return "government";
  if (c.includes("community") || c.includes("health") || c.includes("social")) return "community";
  if (s === "foundation" || s === "corporate") return "community";
  return "general";
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function grantImageUrl(
  grantId: string,
  sourceType: string | null,
  category: string | null,
  size: "card" | "hero" = "card"
): string {
  const theme = pickTheme(sourceType, category);
  const pool =
    theme === "community"
      ? COMMUNITY_POOL
      : theme === "small_business"
      ? SMALL_BUSINESS_POOL
      : theme === "education"
      ? EDUCATION_POOL
      : theme === "government"
      ? GOVERNMENT_POOL
      : [...COMMUNITY_POOL, ...SMALL_BUSINESS_POOL];

  const idx = hashId(grantId) % pool.length;
  const raw = pool[idx];
  // Swap w param based on size
  const w = size === "hero" ? 1200 : 600;
  const withSize = raw.replace(/w=\d+/, `w=${w}`);
  return `${UNSPLASH_BASE}${withSize}&q=75&auto=format&fit=crop`;
}
