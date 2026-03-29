/**
 * SAM.gov Opportunities API v2 client
 * Endpoint: GET https://api.sam.gov/opportunities/v2/search
 * Requires API key from sam.gov
 */

export interface SamGovSearchParams {
  api_key: string;
  limit: number;
  offset: number;
  keyword?: string;
  postedFrom?: string;
  postedTo?: string;
  ptype?: string;
}

export interface SamGovOpportunity {
  id: string;
  title: string;
  agency_name: string;
  close_date: string | null;
  posted_date: string;
  amount_max: number | null;
  description: string;
  naics_code: string | null;
  status: string;
  url: string;
}

export interface SamGovSearchResult {
  opportunities: SamGovOpportunity[];
  total: number;
}

// Raw shape returned by SAM.gov v2 API
interface RawSamOpportunity {
  noticeId: string;
  title: string;
  fullParentPathName?: string;
  responseDeadLine?: string | null;
  postedDate?: string;
  archiveDate?: string | null;
  award?: { amount?: string | number | null };
  description?: string;
  naicsCode?: string | null;
  active?: string;
}

interface RawSearchResponse {
  totalRecords: number;
  opportunitiesData: RawSamOpportunity[];
}

function mapOpportunity(raw: RawSamOpportunity): SamGovOpportunity {
  // close_date: split on "T" to get date portion only
  const closeDate = raw.responseDeadLine
    ? raw.responseDeadLine.split("T")[0]
    : null;

  // amount_max: parse from award.amount
  let amountMax: number | null = null;
  if (raw.award?.amount != null) {
    const parsed = Number(raw.award.amount);
    amountMax = isNaN(parsed) ? null : parsed;
  }

  // status: derive from active flag and archiveDate
  let status: string;
  if (raw.active === "Yes") {
    status = "active";
  } else if (raw.archiveDate) {
    status = "archived";
  } else {
    status = "inactive";
  }

  return {
    id: raw.noticeId,
    title: raw.title,
    agency_name: raw.fullParentPathName ?? "",
    close_date: closeDate,
    posted_date: raw.postedDate ?? "",
    amount_max: amountMax,
    description: raw.description ?? "",
    naics_code: raw.naicsCode ?? null,
    status,
    url: `https://sam.gov/opp/${raw.noticeId}/view`,
  };
}

export async function searchSamGov(
  params: SamGovSearchParams
): Promise<SamGovSearchResult> {
  const searchParams = new URLSearchParams({
    api_key: params.api_key,
    limit: String(params.limit),
    offset: String(params.offset),
    ...(params.keyword && { keyword: params.keyword }),
    ...(params.postedFrom && { postedFrom: params.postedFrom }),
    ...(params.postedTo && { postedTo: params.postedTo }),
    ...(params.ptype && { ptype: params.ptype }),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(
      `https://api.sam.gov/opportunities/v2/search?${searchParams}`,
      { signal: controller.signal }
    );

    if (!res.ok) {
      throw new Error(`SAM.gov API error: ${res.status} ${res.statusText}`);
    }

    const data: RawSearchResponse = await res.json();

    return {
      opportunities: (data.opportunitiesData ?? []).map(mapOpportunity),
      total: data.totalRecords ?? 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function* fetchAllSamGov(
  apiKey: string,
  pageSize = 25
): AsyncGenerator<SamGovOpportunity[], void, unknown> {
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const result = await searchSamGov({ api_key: apiKey, limit: pageSize, offset });
    total = result.total;

    if (result.opportunities.length === 0) break;

    yield result.opportunities;
    offset += pageSize;

    // Polite delay between pages
    await new Promise((r) => setTimeout(r, 500));
  }
}
