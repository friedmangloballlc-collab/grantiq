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
  archive_date: string | null;
  amount_min: number | null;
  amount_max: number | null;
  award_ceiling: number | null;
  award_floor: number | null;
  estimated_funding: number | null;
  estimated_awards_count: number | null;
  cost_sharing_required: boolean;
  description: string;
  cfda_number: string | null;
  cfda_numbers: string[];
  applicant_eligibility_types: string[];
  funding_activity_category: string | null;
  competition_id: string | null;
  status: string;
  url: string;
  raw_json: string;
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

  // Extract ALL CFDA numbers, not just the first
  const cfdaList: string[] = [];
  if (Array.isArray(raw.cfdaList)) {
    for (const entry of raw.cfdaList) {
      const num = entry.programNumber ?? entry.cfdaNumber;
      if (num) cfdaList.push(String(num));
    }
  }

  // Extract applicant eligibility types
  const eligTypes: string[] = [];
  if (Array.isArray(raw.applicantTypes)) {
    for (const t of raw.applicantTypes) {
      if (typeof t === "string") eligTypes.push(t);
      else if (t?.description) eligTypes.push(t.description);
    }
  } else if (Array.isArray(raw.eligibleApplicants)) {
    for (const t of raw.eligibleApplicants) {
      if (typeof t === "string") eligTypes.push(t);
      else if (t?.description) eligTypes.push(t.description);
    }
  }

  return {
    id: oppId,
    number: raw.number ?? raw.oppNumber ?? "",
    title: raw.title ?? raw.oppTitle ?? "",
    agency_name: raw.agencyName ?? raw.agency ?? "",
    open_date: parseGovDate(raw.openDate),
    close_date: parseGovDate(raw.closeDate),
    archive_date: parseGovDate(raw.archiveDate),
    amount_min: raw.awardFloor ?? null,
    amount_max: raw.awardCeiling ?? null,
    award_ceiling: raw.awardCeiling ?? null,
    award_floor: raw.awardFloor ?? null,
    estimated_funding: raw.estimatedFunding ?? raw.estimatedTotalProgramFunding ?? null,
    estimated_awards_count: raw.expectedNumberOfAwards ?? null,
    cost_sharing_required: raw.costSharing === true || raw.costSharingOrMatchingRequirement === "Yes",
    description: raw.synopsis ?? raw.description ?? "",
    cfda_number: cfdaList[0] ?? null,
    cfda_numbers: cfdaList,
    applicant_eligibility_types: eligTypes,
    funding_activity_category: raw.fundingActivityCategory ?? raw.categoryOfFundingActivity ?? null,
    competition_id: raw.competitionId ?? null,
    status: mapStatus(rawStatus),
    url: `https://www.grants.gov/search-results-detail/${oppId}`,
    raw_json: JSON.stringify(raw),
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
