export type AmountResult = { min: number | null; max: number | null };

function parseDollarValue(raw: string): number | null {
  if (!raw) return null;
  let s = raw.replace(/[$,\s]/g, "").trim();
  let multiplier = 1;
  if (/[Kk]$/.test(s)) { multiplier = 1_000; s = s.slice(0, -1); }
  else if (/[Mm]$/.test(s)) { multiplier = 1_000_000; s = s.slice(0, -1); }
  else if (/[Bb]$/.test(s)) { multiplier = 1_000_000_000; s = s.slice(0, -1); }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return Math.round(n * multiplier);
}

export function parseAmount(raw: string): AmountResult {
  if (!raw || /^(varies|n\/a|tbd|negotiable|contact|see rfp)$/i.test(raw.trim())) {
    return { min: null, max: null };
  }
  const rangeMatch = raw.match(/\$[\d,.]+[KMBkmb]?\s*(?:-|to)\s*\$[\d,.]+[KMBkmb]?/i);
  if (rangeMatch) {
    const parts = rangeMatch[0].split(/\s*(?:-|to)\s*/i);
    return { min: parseDollarValue(parts[0]), max: parseDollarValue(parts[1]) };
  }
  const upToMatch = raw.match(/(?:up\s+to|maximum|max|not\s+to\s+exceed)\s+\$[\d,.]+[KMBkmb]?/i);
  if (upToMatch) {
    const dp = upToMatch[0].match(/\$[\d,.]+[KMBkmb]?/i);
    return { min: null, max: dp ? parseDollarValue(dp[0]) : null };
  }
  const avgMatch = raw.match(/(?:average|typically|approximately|about|~)\s+\$[\d,.]+[KMBkmb]?/i);
  if (avgMatch) {
    const dp = avgMatch[0].match(/\$[\d,.]+[KMBkmb]?/i);
    return { min: null, max: dp ? parseDollarValue(dp[0]) : null };
  }
  const singleMatch = raw.match(/\$[\d,.]+[KMBkmb]?/i);
  if (singleMatch) {
    const val = parseDollarValue(singleMatch[0]);
    return { min: val, max: val };
  }
  return { min: null, max: null };
}

const MONTH_MAP: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7,
  sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

export function parseDeadline(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^(rolling|varies|tbd|ongoing|open|continuous|n\/a|contact|see rfp|annual)$/i.test(trimmed)) return null;

  const mdyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdyMatch) {
    const d = new Date(parseInt(mdyMatch[3]), parseInt(mdyMatch[1]) - 1, parseInt(mdyMatch[2]));
    if (!isNaN(d.getTime())) return d;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) { const d = new Date(trimmed); if (!isNaN(d.getTime())) return d; }

  const longMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longMatch) {
    const month = MONTH_MAP[longMatch[1].toLowerCase()];
    if (month !== undefined) {
      const d = new Date(parseInt(longMatch[3]), month, parseInt(longMatch[2]));
      if (!isNaN(d.getTime())) return d;
    }
  }

  const shortMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (shortMatch) {
    const month = MONTH_MAP[shortMatch[1].toLowerCase()];
    if (month !== undefined) {
      const now = new Date();
      const d = new Date(now.getFullYear(), month, parseInt(shortMatch[2]));
      if (d < now) d.setFullYear(now.getFullYear() + 1);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dmyMatch) {
    const month = MONTH_MAP[dmyMatch[2].toLowerCase()];
    if (month !== undefined) {
      const d = new Date(parseInt(dmyMatch[3]), month, parseInt(dmyMatch[1]));
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export function extractStateFromSheetName(sheetName: string): string | null {
  const match = sheetName.match(/^ST-([A-Z]{2})$/);
  return match ? match[1] : null;
}

const FEDERAL_SHEETS = new Set(["2. Federal Govt", "3. Federal DBs", "21. ForProfit Federal", "SBIR-STTR Expanded", "USDA Programs", "HHS & Health Programs"]);
const STATE_SHEETS = new Set(["4. State Govt", "22. ForProfit State", "State Econ Dev Expanded", "State Resources A-M", "State Resources N-W"]);
const FOUNDATION_SHEETS = new Set(["6. Community Fdn", "7. National Fdn", "8. Family Fdn", "Major Foundations", "Community Fdns Expanded", "Religious Funders", "11. Healthcare Funders", "12. Education Funders", "13. Arts Culture Funders", "14. Environment Funders", "Competitions & Accelerators", "Fiscal Sponsors", "Fellowship Programs", "Rapid Response Funds"]);
const CORPORATE_SHEETS = new Set(["9. Corporate A-M", "10. Corporate N-Z", "Corporate Biz Grants", "Tech Company Programs"]);
const SKIP_SHEETS = new Set(["Master Index", "Eligibility Checklist", "Application Checklist", "Deadline Calendar", "Success Rates", "Sample Budget Template", "Funder Tracker Template", "Matchmaking Guide", "Industry Matchmaking", "Databases & Tools", "25. Aggregators", "26. Free Resources", "INELIGIBLE Industries"]);

export type GrantSourceType = "federal" | "state" | "foundation" | "corporate";

export function mapSourceType(sheetName: string): GrantSourceType | null {
  if (SKIP_SHEETS.has(sheetName)) return null;
  if (FEDERAL_SHEETS.has(sheetName)) return "federal";
  if (STATE_SHEETS.has(sheetName)) return "state";
  if (/^ST-[A-Z]{2}$/.test(sheetName)) return "state";
  if (FOUNDATION_SHEETS.has(sheetName)) return "foundation";
  if (CORPORATE_SHEETS.has(sheetName)) return "corporate";
  if (/^\d+\./.test(sheetName)) return "foundation";
  return "foundation";
}
