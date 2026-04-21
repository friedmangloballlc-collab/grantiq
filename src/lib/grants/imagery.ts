// src/lib/grants/imagery.ts
//
// Deterministic grant-card imagery. Each grant id + source_type +
// category hashes into one of ~35 curated Unsplash photos grouped by
// theme. Same grant always gets the same photo across refreshes, but
// the larger pool means almost every grant in the marquee gets a
// different image.
//
// All photos are free under the Unsplash License. Curated for
// nonprofit / small-business / community / education / healthcare /
// arts / environmental / civic content — no generic tech-office
// imagery.
//
// When we ship real customer photography or funder-provided banners,
// swap grantImageUrl() to read from grant_sources.image_url first.

// ──────────────────────────────────────────────────────────────────
// THEMED POOLS — each photo ID must work with images.unsplash.com/photo-<id>
// ──────────────────────────────────────────────────────────────────

const COMMUNITY_POOL: readonly string[] = [
  "photo-1593113598332-cd288d649433", // community garden hands
  "photo-1469571486292-0ba58a3f068b", // volunteers packing donation boxes
  "photo-1529390079861-591de354faf5", // community room meeting
  "photo-1559027615-cd4628902d4a",    // woman leading a workshop
  "photo-1525921429624-479b6a26d84d", // volunteers serving food
  "photo-1593113646773-028c64a8f1b8", // neighborhood clean-up
  "photo-1511795409834-ef04bbd61622", // community meal gathering
  "photo-1531206715517-5c0ba140b2b8", // hands working together on a table
  "photo-1532629345422-7515f3d16bb6", // mixed group of volunteers outdoors
];

const SMALL_BUSINESS_POOL: readonly string[] = [
  "photo-1507679799987-c73779587ccf", // small shop owner at counter
  "photo-1556761175-5973dc0f32e7",    // cafe owner smiling
  "photo-1573496359142-b8d87734a5a2", // owner in front of storefront
  "photo-1551836022-d5d88e9218df",    // artisan working with hands
  "photo-1556911220-e15b29be8c8f",    // kitchen / food business
  "photo-1542744173-8e7e53415bb0",    // small business team meeting
  "photo-1595876210736-f7fcba43a7d2", // boutique / retail owner
  "photo-1504384308090-c894fdcc538d", // independent bookstore
  "photo-1504754524776-8f4f37790ca0", // florist / plant shop
];

const EDUCATION_POOL: readonly string[] = [
  "photo-1427504494785-3a9ca7044f45", // students collaborating at table
  "photo-1503676260728-1c00da094a0b", // young students with books
  "photo-1509062522246-3755977927d7", // kids in classroom reading
  "photo-1498243691581-b145c3f54a5a", // teacher with students
  "photo-1491841550275-ad7854e35ca6", // after-school tutoring
  "photo-1588072432836-e10032774350", // adult learning / training
  "photo-1497633762265-9d179a990aa6", // library study
  "photo-1434030216411-0b793f4b4173", // kids doing science project
];

const HEALTHCARE_POOL: readonly string[] = [
  "photo-1519494026892-80bbd2d6fd0d", // community health worker
  "photo-1576091160550-2173dba999ef", // nurse with elderly patient
  "photo-1631815588090-d4bfec5b1ccb", // mobile clinic / outreach
  "photo-1559757148-5c350d0d3c56",    // therapy / counseling
  "photo-1584515933487-779824d29309", // healthcare team
  "photo-1581594549595-35f6edc7b762", // health screening
  "photo-1638202993928-7267aad84c31", // mental health support
];

const GOVERNMENT_POOL: readonly string[] = [
  "photo-1562564055-71e051d33c19",    // capitol building warm tone
  "photo-1589829085413-56de8ae18c73", // town hall meeting
  "photo-1507838153414-b4b713384a76", // civic engagement event
  "photo-1520986606214-8b456906c813", // government building columns
  "photo-1605000797499-95a51c5269ae", // public-sector office
  "photo-1541872703-74c5e44368f6",    // legislative session
];

const ARTS_CULTURE_POOL: readonly string[] = [
  "photo-1511671782779-c97d3d27a1d4", // theater stage lights
  "photo-1513364776144-60967b0f800f", // music lesson / instrument
  "photo-1547153760-18fc86324498",    // art gallery / exhibition
  "photo-1518929458119-e5bf444c30f4", // dance class
  "photo-1560421683-6856ea585c78",    // painting workshop
  "photo-1526817575615-7685a7295fb0", // youth orchestra
];

const ENVIRONMENTAL_POOL: readonly string[] = [
  "photo-1523712999610-f77fbcfc3843", // tree planting
  "photo-1464226184884-fa280b87c399", // urban farming
  "photo-1523348837708-15d4a09cfac2", // farmers market
  "photo-1542601906990-b4d3fb778b09", // solar panels / renewable
  "photo-1571104508999-893933ded431", // coastal cleanup
  "photo-1416879595882-3373a0480b5b", // conservation fieldwork
];

// ──────────────────────────────────────────────────────────────────

const UNSPLASH_BASE = "https://images.unsplash.com/";

export type GrantImageTheme =
  | "community"
  | "small_business"
  | "education"
  | "healthcare"
  | "government"
  | "arts"
  | "environmental"
  | "general";

function pickTheme(
  sourceType: string | null,
  category: string | null
): GrantImageTheme {
  const c = (category ?? "").toLowerCase();
  const s = (sourceType ?? "").toLowerCase();

  // Most specific first
  if (/art|music|theater|culture|humaniti|museum/.test(c)) return "arts";
  if (/environment|climate|sustainab|conservat|clean|green/.test(c)) return "environmental";
  if (/health|medical|mental|clinic|hospital|disabilit|disease|care/.test(c)) return "healthcare";
  if (/educat|youth|school|student|literac|stem|learning|academic|scholar/.test(c)) return "education";
  if (/business|sbir|sttr|entrepreneur|economic|workforce|startup/.test(c)) return "small_business";
  if (/community|housing|food|social|civic|poverty|equity|family|women|rural|urban/.test(c)) return "community";

  // Fall back on source_type
  if (s === "federal" || s === "state") return "government";
  if (s === "corporate") return "small_business";
  if (s === "foundation") return "community";

  return "general";
}

function poolForTheme(theme: GrantImageTheme): readonly string[] {
  switch (theme) {
    case "community":      return COMMUNITY_POOL;
    case "small_business": return SMALL_BUSINESS_POOL;
    case "education":      return EDUCATION_POOL;
    case "healthcare":     return HEALTHCARE_POOL;
    case "government":     return GOVERNMENT_POOL;
    case "arts":           return ARTS_CULTURE_POOL;
    case "environmental":  return ENVIRONMENTAL_POOL;
    case "general":
      return [
        ...COMMUNITY_POOL,
        ...SMALL_BUSINESS_POOL,
        ...HEALTHCARE_POOL,
      ];
  }
}

// djb2 hash — better-distributed than char-code multiplier for our
// UUID-ish grant ids.
function djb2(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export function grantImageUrl(
  grantId: string,
  sourceType: string | null,
  category: string | null,
  size: "card" | "hero" = "card"
): string {
  const theme = pickTheme(sourceType, category);
  const pool = poolForTheme(theme);
  const idx = djb2(grantId) % pool.length;
  const photoId = pool[idx];
  const w = size === "hero" ? 1200 : 600;
  return `${UNSPLASH_BASE}${photoId}?w=${w}&q=75&auto=format&fit=crop`;
}
