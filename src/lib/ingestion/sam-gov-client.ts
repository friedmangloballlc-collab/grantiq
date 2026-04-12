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
  archive_date: string | null;
  amount_max: number | null;
  description: string;
  naics_code: string | null;
  status: string;
  url: string;
  solicitation_number: string | null;
  classification_code: string | null;
  point_of_contact: { name?: string; email?: string; phone?: string; type?: string }[] | null;
  set_aside_code: string | null;
  place_of_performance: Record<string, unknown> | null;
  additional_info_url: string | null;
  raw_json: string;
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
  solicitationNumber?: string | null;
  classificationCode?: string | null;
  pointOfContact?: Array<{
    fullName?: string;
    email?: string;
    phone?: string;
    type?: string;
  }> | null;
  setAsideCode?: string | null;
  organizationType?: string | null;
  placeOfPerformance?: {
    streetAddress?: string;
    city?: { name?: string; code?: string };
    state?: { name?: string; code?: string };
    country?: { name?: string; code?: string };
    zip?: string;
  } | null;
  additionalInfoLink?: string | null;
  resourceLinks?: string[] | null;
}

interface RawSearchResponse {
  totalRecords: number;
  opportunitiesData: RawSamOpportunity[];
}

function mapOpportunity(raw: RawSamOpportunity): SamGovOpportunity {
  const closeDate = raw.responseDeadLine
    ? raw.responseDeadLine.split("T")[0]
    : null;

  let amountMax: number | null = null;
  if (raw.award?.amount != null) {
    const parsed = Number(raw.award.amount);
    amountMax = isNaN(parsed) ? null : parsed;
  }

  let status: string;
  if (raw.active === "Yes") {
    status = "active";
  } else if (raw.archiveDate) {
    status = "archived";
  } else {
    status = "inactive";
  }

  const contacts = raw.pointOfContact
    ? raw.pointOfContact.map((c) => ({
        name: c.fullName ?? undefined,
        email: c.email ?? undefined,
        phone: c.phone ?? undefined,
        type: c.type ?? undefined,
      }))
    : null;

  return {
    id: raw.noticeId,
    title: raw.title,
    agency_name: raw.fullParentPathName ?? "",
    close_date: closeDate,
    posted_date: raw.postedDate ?? "",
    archive_date: raw.archiveDate ?? null,
    amount_max: amountMax,
    description: raw.description ?? "",
    naics_code: raw.naicsCode ?? null,
    status,
    url: `https://sam.gov/opp/${raw.noticeId}/view`,
    solicitation_number: raw.solicitationNumber ?? null,
    classification_code: raw.classificationCode ?? null,
    point_of_contact: contacts,
    set_aside_code: raw.setAsideCode ?? null,
    place_of_performance: raw.placeOfPerformance ? { ...raw.placeOfPerformance } : null,
    additional_info_url: raw.additionalInfoLink ?? null,
    raw_json: JSON.stringify(raw),
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
