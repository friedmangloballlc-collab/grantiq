/**
 * USAspending.gov API client
 * No API key required — public endpoints.
 * Used to fetch historical award data for grant competitiveness scoring.
 */

import { logger } from "@/lib/logger";

const BASE_URL = "https://api.usaspending.gov/api/v2";

interface CFDATotals {
  cfda_number: string;
  total_obligations: number;
  total_count: number;
}

interface AwardSummary {
  total_awards: number;
  total_obligation: number;
  average_award: number;
  fiscal_year: number;
}

/**
 * Get total spending for a CFDA/ALN program number.
 * Returns total obligations and award count across all years.
 */
export async function getCFDATotals(cfdaNumber: string): Promise<CFDATotals | null> {
  try {
    const res = await fetch(`${BASE_URL}/references/cfda/totals/${cfdaNumber}/`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return null;
    const data = await res.json();

    return {
      cfda_number: cfdaNumber,
      total_obligations: data.total_obligation ?? 0,
      total_count: data.total_count ?? 0,
    };
  } catch (err) {
    logger.error("USAspending CFDA totals failed", { cfda: cfdaNumber, err: String(err) });
    return null;
  }
}

/**
 * Get award count and spending for a specific CFDA program in a fiscal year.
 * Uses the spending_by_award_count endpoint.
 */
export async function getAwardsByProgram(
  cfdaNumber: string,
  fiscalYear?: number
): Promise<AwardSummary | null> {
  const fy = fiscalYear ?? new Date().getFullYear();

  try {
    const res = await fetch(`${BASE_URL}/search/spending_by_award_count/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: `${fy - 1}-10-01`, end_date: `${fy}-09-30` }],
          award_type_codes: ["02", "03", "04", "05"], // Grants, direct payments
          program_numbers: [cfdaNumber],
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    const totalAwards = (data.grants ?? 0) + (data.direct_payments ?? 0) + (data.other ?? 0);

    return {
      total_awards: totalAwards,
      total_obligation: 0, // This endpoint only returns counts
      average_award: 0,
      fiscal_year: fy,
    };
  } catch (err) {
    logger.error("USAspending award count failed", { cfda: cfdaNumber, err: String(err) });
    return null;
  }
}

/**
 * Get spending breakdown by CFDA program for a fiscal year.
 * Returns total spending and number of transactions.
 */
export async function getSpendingByProgram(
  cfdaNumber: string,
  fiscalYear?: number
): Promise<AwardSummary | null> {
  const fy = fiscalYear ?? new Date().getFullYear();

  try {
    const res = await fetch(`${BASE_URL}/search/spending_by_category/cfda/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: `${fy - 1}-10-01`, end_date: `${fy}-09-30` }],
          award_type_codes: ["02", "03", "04", "05"],
          program_numbers: [cfdaNumber],
        },
        category: "cfda",
        limit: 1,
        page: 1,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    const result = data.results?.[0];
    if (!result) return null;

    const totalObligation = result.aggregated_amount ?? 0;
    const totalCount = result.count ?? 1;

    return {
      total_awards: totalCount,
      total_obligation: totalObligation,
      average_award: totalCount > 0 ? Math.round(totalObligation / totalCount) : 0,
      fiscal_year: fy,
    };
  } catch (err) {
    logger.error("USAspending spending by program failed", { cfda: cfdaNumber, err: String(err) });
    return null;
  }
}

/**
 * Compute a competitiveness score (0-100) based on historical data.
 * Higher score = more competitive (harder to win).
 */
export function computeCompetitivenessScore(
  totalAwards: number,
  avgAward: number,
  grantAmountMax: number | null
): { score: number; label: string; detail: string } {
  // Few awards = highly competitive
  // Many awards = less competitive
  let score: number;

  if (totalAwards === 0) {
    return { score: 50, label: "Unknown", detail: "No historical award data available" };
  }

  if (totalAwards <= 5) {
    score = 95; // Very few awards — extremely competitive
  } else if (totalAwards <= 20) {
    score = 80; // Limited awards — highly competitive
  } else if (totalAwards <= 50) {
    score = 65; // Moderate — competitive
  } else if (totalAwards <= 100) {
    score = 45; // Many awards — moderately accessible
  } else if (totalAwards <= 500) {
    score = 30; // Lots of awards — accessible
  } else {
    score = 15; // Very many — widely distributed
  }

  // Adjust based on award size vs grant max
  if (grantAmountMax && avgAward > 0) {
    const ratio = grantAmountMax / avgAward;
    if (ratio > 2) score = Math.min(100, score + 10); // Asking for much more than avg = harder
    if (ratio < 0.5) score = Math.max(0, score - 10); // Asking for less than avg = easier
  }

  let label: string;
  if (score >= 80) label = "Highly Competitive";
  else if (score >= 60) label = "Competitive";
  else if (score >= 40) label = "Moderate";
  else if (score >= 20) label = "Accessible";
  else label = "Widely Available";

  const detail = `${totalAwards} awards last year${avgAward > 0 ? `, avg $${(avgAward / 1000).toFixed(0)}K` : ""}`;

  return { score, label, detail };
}
