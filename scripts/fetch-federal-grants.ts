// scripts/fetch-federal-grants.ts
// Fetches federal grant opportunities from Grants.gov and upserts into grant_sources.
// Usage: npx tsx scripts/fetch-federal-grants.ts

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GRANTS_GOV_SEARCH_URL =
  "https://apply07.grants.gov/grantsws/rest/opportunities/search/";
const GRANTS_GOV_DETAIL_URL =
  "https://apply07.grants.gov/grantsws/rest/opportunity/details/";

const PAGE_SIZE = 250;
const RATE_LIMIT_MS = 1_000;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrantsGovHit {
  id: number;
  number: string;
  title: string;
  agency: string;
  openDate: string;
  closeDate: string;
  awardCeiling: number;
  awardFloor: number;
  cfdas: { number: string }[];
  eligibilities: { code: string; label: string }[];
  description?: string;
}

interface GrantsGovSearchResponse {
  oppHits: GrantsGovHit[];
  totalCount?: number;
}

interface GrantsGovDetail {
  id: number;
  synopsis?: {
    synopsisDesc?: string;
    applicantTypes?: { description: string }[];
    applicationUrl?: string;
  };
  fullText?: string;
}

// ---------------------------------------------------------------------------
// Eligibility mapping
// ---------------------------------------------------------------------------

const ELIGIBILITY_MAP: Record<string, string> = {
  // Common Grants.gov eligibility codes / labels mapped to our types
  "00": "government", // State governments
  "01": "government", // County governments
  "02": "government", // City or township governments
  "04": "tribal",     // Native American tribal governments (Federally recognized)
  "05": "tribal",     // Native American tribal organizations
  "06": "nonprofit",  // Nonprofits having 501(c)(3) status
  "07": "nonprofit",  // Nonprofits without 501(c)(3) status
  "08": "education",  // Private institutions of higher education
  "11": "tribal",     // Native American tribal governments (other)
  "12": "individual", // Individuals
  "13": "small_business", // Small businesses
  "20": "education",  // Public and State controlled institutions of higher education
  "21": "education",  // Public housing authorities / Indian housing authorities
  "22": "government", // Special district governments
  "23": "nonprofit",  // Nonprofits
  "25": "government", // Others
  "99": "government", // Unrestricted
};

// Label-based fallback mapping (case-insensitive partial match)
const ELIGIBILITY_LABEL_MAP: [RegExp, string][] = [
  [/501\s*\(?c\)?\s*\(?3\)?/i, "501c3"],
  [/nonprofit|non-profit/i, "nonprofit"],
  [/small\s*business/i, "small_business"],
  [/tribal|native\s*american|indian/i, "tribal"],
  [/state|county|city|government|municipal/i, "government"],
  [/universit|college|school|education|higher\s*ed/i, "education"],
  [/individual/i, "individual"],
];

const VALID_ELIGIBILITY_TYPES = new Set([
  "nonprofit",
  "501c3",
  "small_business",
  "government",
  "tribal",
  "education",
  "individual",
]);

function mapEligibilities(
  eligibilities: { code: string; label: string }[]
): string[] {
  const mapped = new Set<string>();

  for (const elig of eligibilities) {
    // Try code-based mapping first
    const byCode = ELIGIBILITY_MAP[elig.code];
    if (byCode) {
      mapped.add(byCode);
      continue;
    }

    // Fall back to label-based matching
    for (const [pattern, type] of ELIGIBILITY_LABEL_MAP) {
      if (pattern.test(elig.label)) {
        mapped.add(type);
        break;
      }
    }
  }

  return Array.from(mapped).filter((t) => VALID_ELIGIBILITY_TYPES.has(t));
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") ?? "5", 10);
        console.warn(
          `  Rate limited (429). Waiting ${retryAfter}s before retry ${attempt}/${retries}...`
        );
        await sleep(retryAfter * 1_000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (err) {
      if (attempt === retries) throw err;
      const backoff = attempt * 2_000;
      console.warn(
        `  Request failed (attempt ${attempt}/${retries}). Retrying in ${backoff}ms...`
      );
      await sleep(backoff);
    }
  }

  // Should not reach here, but satisfies TypeScript
  throw new Error("fetchWithRetry exhausted all retries");
}

// ---------------------------------------------------------------------------
// Grants.gov API
// ---------------------------------------------------------------------------

async function searchGrants(offset: number): Promise<GrantsGovSearchResponse> {
  const body = {
    keyword: "",
    oppNum: "",
    cfda: "",
    agencies: "",
    sortBy: "openDate|desc",
    rows: PAGE_SIZE,
    offset,
  };

  const response = await fetchWithRetry(GRANTS_GOV_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as GrantsGovSearchResponse;
}

async function fetchGrantDetail(opportunityId: number): Promise<GrantsGovDetail | null> {
  try {
    const response = await fetchWithRetry(
      `${GRANTS_GOV_DETAIL_URL}${opportunityId}`,
      { method: "GET", headers: { Accept: "application/json" } }
    );
    return (await response.json()) as GrantsGovDetail;
  } catch (err) {
    console.warn(`  Failed to fetch details for opportunity ${opportunityId}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Transform and upsert
// ---------------------------------------------------------------------------

function buildApplicationUrl(opportunityId: number): string {
  return `https://www.grants.gov/search-results-detail/${opportunityId}`;
}

function parseGrantsGovDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    // Grants.gov dates are typically in MM/DD/YYYY format
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  } catch {
    return null;
  }
}

interface UpsertRow {
  name: string;
  funder_name: string;
  source_type: "federal";
  description: string | null;
  amount_min: number | null;
  amount_max: number | null;
  award_ceiling: number | null;
  award_floor: number | null;
  deadline: string | null;
  deadline_type: "full_application";
  eligibility_types: string[];
  url: string;
  cfda_number: string | null;
  data_source: "api_crawl";
  status: "open" | "closed";
  is_active: boolean;
  last_verified: string;
}

function transformHit(
  hit: GrantsGovHit,
  detailDescription: string | null
): UpsertRow {
  const cfdaNumber =
    hit.cfdas && hit.cfdas.length > 0 ? hit.cfdas[0].number : null;

  const eligibilityTypes = hit.eligibilities
    ? mapEligibilities(hit.eligibilities)
    : [];

  const description = detailDescription || hit.description || null;

  const closeDate = parseGrantsGovDate(hit.closeDate);
  const isClosed = closeDate
    ? new Date(closeDate) < new Date()
    : false;

  const awardCeiling =
    hit.awardCeiling && hit.awardCeiling > 0 ? hit.awardCeiling : null;
  const awardFloor =
    hit.awardFloor && hit.awardFloor > 0 ? hit.awardFloor : null;

  return {
    name: hit.title.trim(),
    funder_name: hit.agency?.trim() || "Unknown Federal Agency",
    source_type: "federal",
    description,
    amount_min: awardFloor,
    amount_max: awardCeiling,
    award_ceiling: awardCeiling,
    award_floor: awardFloor,
    deadline: closeDate,
    deadline_type: "full_application",
    eligibility_types: eligibilityTypes,
    url: buildApplicationUrl(hit.id),
    cfda_number: cfdaNumber,
    data_source: "api_crawl",
    status: isClosed ? "closed" : "open",
    is_active: !isClosed,
    last_verified: new Date().toISOString(),
  };
}

const UPSERT_BATCH_SIZE = 100;

async function upsertBatch(
  rows: UpsertRow[]
): Promise<{ upserted: number; errors: number }> {
  const { data, error } = await supabase
    .from("grant_sources")
    .upsert(rows, {
      onConflict: "name,funder_name",
      ignoreDuplicates: false,
    })
    .select("id");

  if (error) {
    console.error("  Upsert error:", error.message);
    return { upserted: 0, errors: rows.length };
  }
  return { upserted: data?.length ?? 0, errors: 0 };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("GrantIQ Federal Grant Fetch Script");
  console.log("===================================");
  console.log(`Source:    Grants.gov REST API`);
  console.log(`Supabase:  ${SUPABASE_URL}`);
  console.log(`Page size: ${PAGE_SIZE}`);
  console.log(`Started:   ${new Date().toISOString()}`);
  console.log("");

  let offset = 0;
  let totalFetched = 0;
  let totalUpserted = 0;
  let totalErrors = 0;
  let totalPages = 0;
  let expectedTotal: number | null = null;

  // Accumulate rows across pages, upsert in batches
  let pendingRows: UpsertRow[] = [];

  while (true) {
    totalPages++;
    console.log(
      `Page ${totalPages}: fetching offset=${offset}` +
        (expectedTotal !== null ? ` (of ~${expectedTotal})` : "") +
        "..."
    );

    let searchResult: GrantsGovSearchResponse;
    try {
      searchResult = await searchGrants(offset);
    } catch (err) {
      console.error(`  Failed to fetch page at offset ${offset}:`, err);
      totalErrors++;
      break;
    }

    if (expectedTotal === null && searchResult.totalCount) {
      expectedTotal = searchResult.totalCount;
      console.log(`  Total opportunities reported by Grants.gov: ${expectedTotal}`);
    }

    const hits = searchResult.oppHits;
    if (!hits || hits.length === 0) {
      console.log("  No more results. Done paginating.");
      break;
    }

    console.log(`  Received ${hits.length} opportunities. Processing...`);

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const row = transformHit(hit, null);
      pendingRows.push(row);
      totalFetched++;

      // Upsert when we accumulate enough rows
      if (pendingRows.length >= UPSERT_BATCH_SIZE) {
        const { upserted, errors } = await upsertBatch(pendingRows);
        totalUpserted += upserted;
        totalErrors += errors;
        console.log(
          `  Upserted batch of ${pendingRows.length} (success=${upserted}, errors=${errors})`
        );
        pendingRows = [];
      }
    }

    offset += hits.length;

    // If we got fewer than PAGE_SIZE results, we have reached the end
    if (hits.length < PAGE_SIZE) {
      console.log("  Last page (fewer results than page size).");
      break;
    }

    // Rate limit between search pages
    console.log(`  Waiting ${RATE_LIMIT_MS}ms before next page...`);
    await sleep(RATE_LIMIT_MS);
  }

  // Flush remaining rows
  if (pendingRows.length > 0) {
    const { upserted, errors } = await upsertBatch(pendingRows);
    totalUpserted += upserted;
    totalErrors += errors;
    console.log(
      `  Upserted final batch of ${pendingRows.length} (success=${upserted}, errors=${errors})`
    );
  }

  // Enqueue embedding job for newly ingested grants
  console.log("\nEnqueueing embedding job for new grants...");
  const { error: jobError } = await supabase.from("job_queue").insert({
    job_type: "generate_embedding",
    payload: { entity_type: "grant", batch_size: 100 },
    status: "pending",
    priority: 5,
    max_attempts: 3,
  });
  if (jobError) {
    console.warn("  Warning: Could not enqueue embedding job:", jobError.message);
  } else {
    console.log("  Embedding job enqueued.");
  }

  // Summary
  console.log("\n===================================");
  console.log("Fetch complete.");
  console.log(`  Pages fetched:     ${totalPages}`);
  console.log(`  Grants fetched:    ${totalFetched}`);
  console.log(`  Grants upserted:   ${totalUpserted}`);
  console.log(`  Errors:            ${totalErrors}`);
  console.log(`  Finished:          ${new Date().toISOString()}`);

  if (totalErrors > 0) {
    console.warn("\nWARNING: Some operations had errors. Check output above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
