/**
 * Grants.gov REST API client
 * Endpoint: POST https://apply07.grants.gov/grantsws/rest/opportunities/search
 * Docs: https://www.grants.gov/web-services
 */

export interface GrantsGovSearchParams {
  keyword?: string;
  oppStatus?: "forecasted" | "posted" | "closed" | "archived";
  startRecordNum?: number;
  rows?: number;
}

export interface GrantsGovOpportunity {
  id: string;
  number: string;
  title: string;
  agency_name: string;
  open_date: string | null;
  close_date: string | null;
  amount_min: number | null;
  amount_max: number | null;
  description: string;
  cfda_number: string | null;
  status: string;
  url: string;
}

export interface GrantsGovSearchResult {
  opportunities: GrantsGovOpportunity[];
  total: number;
}

/** Maps an MMDDYYYY or YYYYMMDD string from Grants.gov to ISO 8601 date string */
function parseGovDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Grants.gov returns dates as MMDDYYYY (8 chars)
  if (raw.length === 8) {
    const mm = raw.slice(0, 2);
    const dd = raw.slice(2, 4);
    const yyyy = raw.slice(4, 8);
    return `${yyyy}-${mm}-${dd}`;
  }
  return raw;
}

function mapStatus(oppStatus: string | undefined): string {
  switch (oppStatus) {
    case "forecasted":
      return "forecasted";
    case "posted":
      return "open";
    case "closed":
      return "closed";
    case "archived":
      return "archived";
    default:
      return oppStatus ?? "unknown";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOpportunity(raw: any): GrantsGovOpportunity {
  const oppId = String(raw.id ?? raw.oppId ?? "");
  const rawStatus: string | undefined =
    raw.oppStatus ?? raw.opportunityCategory?.category;

  return {
    id: oppId,
    number: raw.number ?? raw.oppNumber ?? "",
    title: raw.title ?? raw.oppTitle ?? "",
    agency_name: raw.agencyName ?? raw.agency ?? "",
    open_date: parseGovDate(raw.openDate ?? raw.openDate),
    close_date: parseGovDate(raw.closeDate ?? raw.closeDate),
    amount_min: raw.awardFloor ?? null,
    amount_max: raw.awardCeiling ?? null,
    description: raw.synopsis ?? raw.description ?? "",
    cfda_number:
      Array.isArray(raw.cfdaList) && raw.cfdaList.length > 0
        ? raw.cfdaList[0].programNumber ?? raw.cfdaList[0].cfdaNumber ?? null
        : null,
    status: mapStatus(rawStatus),
    url: `https://www.grants.gov/search-results-detail/${oppId}`,
  };
}

const GRANTS_GOV_SEARCH_URL =
  "https://apply07.grants.gov/grantsws/rest/opportunities/search";

export async function searchGrantsGov(
  params: GrantsGovSearchParams
): Promise<GrantsGovSearchResult> {
  const body = {
    keyword: params.keyword ?? "",
    oppStatus: params.oppStatus ?? "posted",
    startRecordNum: params.startRecordNum ?? 0,
    rows: params.rows ?? 25,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(GRANTS_GOV_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Grants.gov API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const rawHits: unknown[] = data.oppHits ?? [];

    return {
      opportunities: rawHits.map(mapOpportunity),
      total: data.totalCount ?? 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function* fetchAllGrantsGov(
  status: "posted" | "forecasted" | "closed" | "archived" = "posted",
  pageSize = 25
): AsyncGenerator<GrantsGovOpportunity[], void, unknown> {
  let startRecord = 0;
  let totalCount = Infinity;

  while (startRecord < totalCount) {
    const result = await searchGrantsGov({
      oppStatus: status,
      startRecordNum: startRecord,
      rows: pageSize,
    });

    totalCount = result.total;
    if (result.opportunities.length === 0) break;

    yield result.opportunities;
    startRecord += pageSize;

    // Polite rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }
}
