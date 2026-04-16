/**
 * ProPublica Nonprofit Explorer API client for 990-PF data ingestion.
 * Pulls private foundation data and their giving history.
 */

import { logger } from "@/lib/logger";

const API_BASE = "https://projects.propublica.org/nonprofits/api/v2";

// NTEE code → human-readable sector mapping
const NTEE_TO_SECTOR: Record<string, string> = {
  A: "arts_culture", B: "education", C: "environment", D: "animal_welfare",
  E: "health", F: "mental_health", G: "disease_specific", H: "medical_research",
  I: "crime_legal", J: "employment", K: "food_nutrition", L: "housing",
  M: "public_safety", N: "recreation", O: "youth_development", P: "human_services",
  Q: "international", R: "civil_rights", S: "community_development", T: "philanthropy",
  U: "science_research", V: "social_science", W: "public_policy", X: "religion",
  Y: "mutual_benefit", Z: "unknown",
};

// US states for iteration
export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export interface FoundationSearchResult {
  ein: number;
  name: string;
  city: string;
  state: string;
  ntee_code: string | null;
  subseccd: number;
}

export interface FoundationDetail {
  ein: number;
  name: string;
  city: string;
  state: string;
  zipcode: string;
  ntee_code: string | null;
  asset_amount: number;
  income_amount: number;
  ruling_date: string | null;
  latest_filing: FoundationFiling | null;
}

export interface FoundationFiling {
  tax_year: number;
  total_revenue: number;
  total_assets: number;
  contributions_paid: number; // This is grants paid to others
  fair_market_value: number;
  min_investment_return: number;
  grants_to_individuals: boolean;
}

/**
 * Search for private foundations in a state.
 * subseccd=3 means 501(c)(3). The API returns foundations when searching with c_code=3.
 */
export async function searchFoundations(
  state: string,
  page: number = 0
): Promise<{ foundations: FoundationSearchResult[]; totalResults: number; numPages: number }> {
  const url = `${API_BASE}/search.json?q=*&state%5Bid%5D=${state}&c_code%5Bid%5D=3&page=${page}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "GrantAQ/1.0 (grant-discovery-platform)" },
  });

  if (!res.ok) {
    logger.error("ProPublica search failed", { state, page, status: res.status });
    return { foundations: [], totalResults: 0, numPages: 0 };
  }

  const data = await res.json();

  const foundations: FoundationSearchResult[] = (data.organizations ?? [])
    .filter((o: Record<string, unknown>) => o.subseccd === 3) // 501(c)(3) only
    .map((o: Record<string, unknown>) => ({
      ein: o.ein as number,
      name: o.name as string,
      city: o.city as string,
      state: o.state as string,
      ntee_code: (o.ntee_code as string) ?? null,
      subseccd: o.subseccd as number,
    }));

  return {
    foundations,
    totalResults: data.total_results ?? 0,
    numPages: data.num_pages ?? 0,
  };
}

/**
 * Get detailed info for a single foundation including filing data.
 */
export async function getFoundationDetail(ein: number): Promise<FoundationDetail | null> {
  const url = `${API_BASE}/organizations/${ein}.json`;

  const res = await fetch(url, {
    headers: { "User-Agent": "GrantAQ/1.0 (grant-discovery-platform)" },
  });

  if (!res.ok) {
    if (res.status !== 404) {
      logger.error("ProPublica detail failed", { ein, status: res.status });
    }
    return null;
  }

  const data = await res.json();
  const org = data.organization;
  if (!org) return null;

  const filings = data.filings_with_data ?? [];
  const latestFiling = filings[0];

  return {
    ein: org.ein,
    name: org.name ?? org.sort_name ?? `Foundation ${org.ein}`,
    city: org.city ?? "",
    state: org.state ?? "",
    zipcode: org.zipcode ?? "",
    ntee_code: org.ntee_code ?? null,
    asset_amount: org.asset_amount ?? 0,
    income_amount: org.income_amount ?? 0,
    ruling_date: org.ruling_date ?? null,
    latest_filing: latestFiling
      ? {
          tax_year: latestFiling.tax_prd_yr ?? 0,
          total_revenue: latestFiling.totrevenue ?? 0,
          total_assets: latestFiling.totassetsend ?? 0,
          contributions_paid: latestFiling.contrpdpbks ?? 0,
          fair_market_value: latestFiling.fairmrktvalamt ?? 0,
          min_investment_return: latestFiling.cmpmininvstret ?? 0,
          grants_to_individuals: latestFiling.grntindivcd === "Y",
        }
      : null,
  };
}

/**
 * Convert NTEE code to human-readable sector.
 */
export function nteeToSector(nteeCode: string | null): string {
  if (!nteeCode) return "general";
  const prefix = nteeCode.charAt(0).toUpperCase();
  return NTEE_TO_SECTOR[prefix] ?? "general";
}

/**
 * Determine eligibility types based on foundation data.
 */
export function inferEligibility(detail: FoundationDetail): string[] {
  const types: string[] = ["nonprofit_501c3"];

  // Most private foundations only give to other nonprofits,
  // but some give to individuals or for-profit entities
  if (detail.latest_filing?.grants_to_individuals) {
    types.push("individual");
  }

  return types;
}

/**
 * Estimate typical award range from total giving and foundation size.
 */
export function estimateAwardRange(contributionsPaid: number): { min: number; max: number } {
  if (contributionsPaid <= 0) return { min: 0, max: 0 };
  if (contributionsPaid < 50000) return { min: 1000, max: 10000 };
  if (contributionsPaid < 200000) return { min: 5000, max: 50000 };
  if (contributionsPaid < 1000000) return { min: 10000, max: 100000 };
  if (contributionsPaid < 10000000) return { min: 25000, max: 500000 };
  return { min: 50000, max: 2000000 };
}

/**
 * Check if a foundation is worth adding (has meaningful giving).
 */
export function isActiveFunder(detail: FoundationDetail): boolean {
  if (!detail.latest_filing) return false;
  // Must have given at least $5,000 in the latest filing year
  if (detail.latest_filing.contributions_paid < 5000) return false;
  // Filing must be within last 3 years
  const currentYear = new Date().getFullYear();
  if (detail.latest_filing.tax_year < currentYear - 3) return false;
  return true;
}
