import * as XLSX from "xlsx";
import { parseAmount, parseDeadline, extractStateFromSheetName, mapSourceType } from "./parsers";
import { ParsedGrantSchema, type ParsedGrant } from "./grant-schema";

// ---------------------------------------------------------------------------
// Column alias maps — maps semantic field names to possible column headers.
// Keys are the canonical field names used by resolveColumn / extractRowData.
// ---------------------------------------------------------------------------
export const COLUMN_ALIASES: Record<string, string[]> = {
  name: [
    "program name", "grant name", "source name", "foundation name",
    "company name", "program", "programs", "grant", "funder", "organization",
    "source", "name", "mechanism", "initiative", "opportunity", "title",
    "grant program", "program title", "opportunity title", "fund name",
    "resource", "grant title", "competition", "challenge", "accelerator",
    "prize", "award name", "loan program", "platform", "fellowship",
    "crowdfunding platform", "initiative name",
  ],
  funder_name: [
    "agency", "funder", "foundation", "foundation name", "company", "company name",
    "organization", "source", "grantor", "name", "department", "sponsor",
    "funder name", "funding agency", "granting agency", "funding source", "institution",
  ],
  url: [
    "url", "website", "link", "web", "apply url", "application url",
    "program url", "application link", "apply link", "program link",
    "info", "more info",
  ],
  description: [
    "description", "focus", "focus areas", "focus area", "purpose",
    "notes", "details", "summary", "about", "key topics", "what it funds",
    "program focus", "mission", "scope", "program overview",
  ],
  // award_range is the raw text field; amount_min/max are derived from it
  award_range: [
    "award range", "award amount", "grant amount", "funding",
    "award", "range", "award size", "typical award", "amount",
    "max award", "phase i award", "phase ii award", "annual giving",
    "annual grants", "annual budget", "funding level", "budget",
    "prize amount", "prize", "total prizes", "funding/benefits",
    "benefits", "loan amount", "credit limit",
  ],
  deadline: [
    "deadline", "due date", "application deadline", "close date", "due",
    "deadlines", "timeline", "submission deadline", "closing date",
    "application due",
  ],
  eligibility: [
    "eligibility", "eligible", "who can apply",
    "applicant types", "eligible applicants", "eligible entities",
    "eligible organizations", "who is eligible", "applicant eligibility",
    "match required", "accepts unsolicited?", "for-profit?",
  ],
  category: ["category", "type", "sector", "focus area", "subject", "program area", "industry focus", "industry", "vertical"],
  cfda_number: [
    "cfda/aln number", "cfda number", "aln number", "cfda", "aln",
    "assistance listing", "cfda/aln",
  ],
  state: [
    "state", "geographic", "geography", "geographic focus",
    "geographic preference", "location", "region", "service area",
    "coverage", "coverage area", "target area", "assets",
  ],
  application_process: ["application process", "how to apply", "apply"],
};

// ---------------------------------------------------------------------------
// normalizeColumnName — lowercase + trim
// ---------------------------------------------------------------------------
export function normalizeColumnName(raw: string): string {
  return raw.toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// resolveColumn — look up a semantic field in a row object whose keys are
// already normalised (lowercase, trimmed).  sourceType is accepted for future
// per-source overrides but is not used for branching right now.
// ---------------------------------------------------------------------------
export function resolveColumn(
  row: Record<string, string>,
  field: string,
  _sourceType?: string,
): string | null {
  const aliases = COLUMN_ALIASES[field];
  if (!aliases) return null;

  for (const alias of aliases) {
    const normalized = normalizeColumnName(alias);
    if (normalized in row) {
      const val = row[normalized];
      return val !== undefined && val !== "" ? val : null;
    }
  }

  // Partial-match fallback: find first row key that contains any alias
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const normalized = normalizeColumnName(alias);
    const match = rowKeys.find((k) => k.includes(normalized) || normalized.includes(k));
    if (match !== undefined) {
      const val = row[match];
      return val !== undefined && val !== "" ? val : null;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// extractRowData — convert a normalised row object to ParsedGrant | null.
// sheetName is used to derive source_type and state.
// ---------------------------------------------------------------------------
export function extractRowData(
  row: Record<string, string>,
  sheetName: string,
): ParsedGrant | null {
  // A row must have at least a name to be meaningful
  const name =
    resolveColumn(row, "name", undefined) ||
    resolveColumn(row, "funder_name", undefined);

  if (!name || name.length < 2) return null;

  const sourceType = mapSourceType(sheetName);
  if (!sourceType) return null;

  const funder =
    resolveColumn(row, "funder_name", undefined) ||
    resolveColumn(row, "name", undefined) ||
    name;

  // Ensure URL is either a proper http(s) URL or null
  const rawUrl = resolveColumn(row, "url", undefined);
  const urlVal =
    rawUrl && /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : rawUrl && rawUrl.includes(".")
      ? `https://${rawUrl}`
      : null;
  const desc = resolveColumn(row, "description", undefined);
  const amountRaw = resolveColumn(row, "award_range", undefined) ?? "";
  const deadlineRaw = resolveColumn(row, "deadline", undefined) ?? "";
  const eligRaw = resolveColumn(row, "eligibility", undefined) ?? "";
  const catRaw = resolveColumn(row, "category", undefined);
  const cfdaRaw = resolveColumn(row, "cfda_number", undefined);
  const stateRaw = resolveColumn(row, "state", undefined);

  const { min, max } = parseAmount(amountRaw);
  const deadline = parseDeadline(deadlineRaw);

  // Build states array
  const sheetState = extractStateFromSheetName(sheetName);
  const states: string[] = [];
  if (sheetState) states.push(sheetState);
  if (stateRaw) {
    const extracted = stateRaw
      .split(/[,;/]/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z]{2}$/.test(s));
    states.push(...extracted);
  }

  const eligTypes = eligRaw
    ? eligRaw.split(/[,;/]/).map((s) => s.trim()).filter(Boolean)
    : [];

  const raw = {
    name,
    funder_name: funder,
    source_type: sourceType,
    url: urlVal || null,
    amount_min: min,
    amount_max: max,
    deadline,
    deadline_type: deadline ? ("full_application" as const) : ("rolling" as const),
    eligibility_types: eligTypes,
    states: [...new Set(states)],
    description: desc || null,
    cfda_number: cfdaRaw || null,
    category: catRaw || sheetName.replace(/^\d+\.\s*/, ""),
    data_source: "seed" as const,
  };

  const result = ParsedGrantSchema.safeParse(raw);
  return result.success ? result.data : null;
}

// ---------------------------------------------------------------------------
// KNOWN_HEADER_KEYWORDS — the set of lowercase tokens used to score whether
// a row looks like a column-header row vs a section label or data row.
// ---------------------------------------------------------------------------
const KNOWN_HEADER_KEYWORDS = new Set([
  "program", "programs", "agency", "foundation", "company", "grant", "funder",
  "name", "title", "award", "amount", "eligibility", "website", "url", "deadline",
  "focus", "description", "mechanism", "organization", "department", "sponsor",
  "budget", "location", "region", "state", "category", "cfda", "type",
  "phase", "annual", "giving", "grants", "assets", "topics", "funds",
  "application", "apply", "accepts", "profit", "match", "duration",
  "competition", "challenge", "accelerator", "prize", "platform", "fellowship",
  "industry", "sector", "vertical", "loan", "crowdfunding", "employer",
]);

// A header cell is SHORT (≤ 40 chars) and is either an exact keyword match
// or a multi-word phrase where every token is common label vocabulary.
// We do NOT use substring matching on long values to avoid false positives.
function isHeaderCell(cell: string): boolean {
  const s = cell.trim();
  if (s.length === 0 || s.length > 60) return false;

  const lower = s.toLowerCase();

  // Exact match
  if (KNOWN_HEADER_KEYWORDS.has(lower)) return true;

  // Multi-word header: every word is short and alphanumeric (no slashes, parens etc.)
  // AND at least one word is a keyword
  const words = lower.split(/[\s_]+/).filter(Boolean);
  if (words.length > 5) return false; // Too many words → probably data
  const hasKeyword = words.some((w) => KNOWN_HEADER_KEYWORDS.has(w));
  const allSimple = words.every((w) => /^[a-z0-9?/]+$/.test(w));
  if (hasKeyword && allSimple) return true;

  // Common multi-word header patterns (exact phrases)
  const MULTI_WORD_HEADERS = [
    "award range", "award amount", "grant amount", "prize amount",
    "due date", "close date", "focus area", "focus areas", "key topics",
    "industry focus", "program area", "primary sector sheet", "secondary sector",
    "annual budget", "annual giving", "annual grants", "max award",
    "phase i award", "phase ii award", "for-profit?", "for-profit eligible?",
    "accepts unsolicited?", "match required", "equity taken",
    "funding/benefits", "what it funds", "program focus",
  ];
  if (MULTI_WORD_HEADERS.includes(lower)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// isHeaderRow — returns a score (0-N) indicating how likely this row is a
// column-header row.  A score ≥ 2 is treated as a header.
// ---------------------------------------------------------------------------
function headerScore(row: any[]): number {
  const nonEmpty = row.filter((c) => String(c).trim().length > 0);
  if (nonEmpty.length < 2) return 0;
  return nonEmpty.filter((cell) => isHeaderCell(String(cell))).length;
}

// ---------------------------------------------------------------------------
// findHeaderRow — scan the first 15 rows of a worksheet and return the index
// of the row that best looks like a column header.  Falls back to 0.
// ---------------------------------------------------------------------------
export function findHeaderRow(ws: XLSX.WorkSheet): number {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];
  let bestRow = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const score = headerScore(data[i] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }
  return bestRow;
}

// ---------------------------------------------------------------------------
// looksLikeDataCell — returns true if the cell value looks like actual data
// (dollar amounts, URLs, multi-word descriptions with digits) rather than a
// column label.
// ---------------------------------------------------------------------------
function looksLikeDataCell(cell: string): boolean {
  const s = cell.trim();
  if (/\$[\d,]/.test(s)) return true;        // dollar amount
  if (/https?:\/\//i.test(s)) return true;   // explicit URL
  if (/\.\w{2,4}$/.test(s) && !s.includes(" ")) return true; // domain-like
  if (/\d/.test(s) && s.length > 6) return true; // contains digits + long
  return false;
}

// ---------------------------------------------------------------------------
// isLikelyHeaderRow — a row is a header when:
//   • it scores ≥ 2 on keyword matching, AND
//   • none of its cells look like actual data values
// ---------------------------------------------------------------------------
function isLikelyHeaderRow(row: any[]): boolean {
  const nonEmpty = row
    .map((c) => String(c ?? "").trim())
    .filter((c) => c.length > 0);

  if (nonEmpty.length < 2) return false;
  if (headerScore(row) < 2) return false;

  // If any cell looks like a real data value, treat the row as data
  if (nonEmpty.some(looksLikeDataCell)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// extractSections — walk every row of the sheet and split it into sections.
// A new section starts whenever we encounter a row that looks like a header.
// Each section is { headers: string[], rows: any[][] }.
// ---------------------------------------------------------------------------
interface SheetSection {
  headers: string[];
  rows: any[][];
}

function extractSections(rawRows: any[][]): SheetSection[] {
  const sections: SheetSection[] = [];
  let currentHeaders: string[] | null = null;
  let currentRows: any[][] = [];

  // Rows we always skip (nav links, tips, sheet titles)
  const SKIP_PREFIXES = ["◄", "tip:", "press ctrl", "industries covered"];

  const isSkipRow = (row: any[]): boolean => {
    const first = String(row[0] ?? "").trim().toLowerCase();
    return SKIP_PREFIXES.some((p) => first.startsWith(p));
  };

  const isEmptyRow = (row: any[]): boolean =>
    row.every((c) => String(c).trim().length === 0);

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    if (isEmptyRow(row)) continue;
    if (isSkipRow(row)) continue;

    if (isLikelyHeaderRow(row)) {
      // Start a new section
      if (currentHeaders && currentRows.length > 0) {
        sections.push({ headers: currentHeaders, rows: currentRows });
      }
      currentHeaders = row.map((h: any) => normalizeColumnName(String(h ?? "")));
      currentRows = [];
    } else if (currentHeaders) {
      const nonEmpty = row.filter((c: any) => String(c).trim().length > 0);
      if (nonEmpty.length >= 1) {
        currentRows.push(row);
      }
    }
    // Rows before first header (section labels, sheet titles) — skip
  }

  // Flush last section
  if (currentHeaders && currentRows.length > 0) {
    sections.push({ headers: currentHeaders, rows: currentRows });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// parseGrantsXlsx — parse an entire XLSX file.
// Handles multi-section sheets where each section has its own header row.
// ---------------------------------------------------------------------------
export interface ParseGrantsResult {
  grants: ParsedGrant[];
  stats: {
    total: number;
    parsed: number;
    skipped: number;
    errors: number;
    bySheet: Record<string, { parsed: number; skipped: number }>;
  };
}

export function parseGrantsXlsx(filePath: string): ParseGrantsResult {
  const wb = XLSX.readFile(filePath);

  const grants: ParsedGrant[] = [];
  let totalRows = 0;
  let errorCount = 0;
  const bySheet: Record<string, { parsed: number; skipped: number }> = {};

  for (const sheetName of wb.SheetNames) {
    const sourceType = mapSourceType(sheetName);
    if (!sourceType) continue;

    const ws = wb.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (rawRows.length < 2) continue;

    bySheet[sheetName] = { parsed: 0, skipped: 0 };

    // Split the sheet into multiple header+data sections
    const sections = extractSections(rawRows);

    for (const section of sections) {
      const { headers, rows } = section;

      for (const rawRow of rows) {
        totalRows++;

        // Build normalised row object
        const row: Record<string, string> = {};
        headers.forEach((header, colIdx) => {
          if (header) {
            const val = rawRow[colIdx];
            row[header] = val !== null && val !== undefined ? String(val).trim() : "";
          }
        });

        const grant = extractRowData(row, sheetName);
        if (grant) {
          grants.push(grant);
          bySheet[sheetName].parsed++;
        } else {
          const hasContent = Object.values(row).some((v) => v.length > 0);
          if (hasContent) errorCount++;
          bySheet[sheetName].skipped++;
        }
      }
    }
  }

  return {
    grants,
    stats: {
      total: totalRows,
      parsed: grants.length,
      skipped: totalRows - grants.length - errorCount,
      errors: errorCount,
      bySheet,
    },
  };
}

// ---------------------------------------------------------------------------
// Legacy export — kept for backward compatibility
// ---------------------------------------------------------------------------
export { parseGrantsXlsx as parseXlsx };
