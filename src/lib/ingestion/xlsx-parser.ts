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
    "company name", "program", "grant", "funder", "organization", "source", "name",
  ],
  funder_name: [
    "agency", "funder", "foundation name", "company name",
    "organization", "source", "grantor", "name",
  ],
  url: ["url", "website", "link", "web", "apply url", "application url"],
  description: [
    "description", "focus", "focus areas", "focus area", "purpose",
    "notes", "details", "summary", "about",
  ],
  // award_range is the raw text field; amount_min/max are derived from it
  award_range: [
    "award range", "award amount", "grant amount", "funding",
    "award", "range", "award size", "typical award", "amount",
  ],
  deadline: ["deadline", "due date", "application deadline", "close date", "due"],
  eligibility: [
    "eligibility", "eligible", "who can apply",
    "applicant types", "eligible applicants",
  ],
  category: ["category", "type", "sector", "focus area", "subject", "program area"],
  cfda_number: [
    "cfda/aln number", "cfda number", "aln number", "cfda", "aln",
    "assistance listing", "cfda/aln",
  ],
  state: [
    "state", "geographic", "geography", "geographic focus",
    "geographic preference", "location", "region",
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

  const urlVal = resolveColumn(row, "url", undefined);
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
// parseGrantsXlsx — parse an entire XLSX file.
// Each sheet row is first converted to a normalised Record<string, string>
// keyed by lowercase column header, then passed to extractRowData.
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

    // Find the header row (first row with 3+ non-empty cells, within first 5)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const nonEmpty = rawRows[i].filter((c: any) => c && String(c).trim()).length;
      if (nonEmpty >= 3) {
        headerIdx = i;
        break;
      }
    }

    const headers: string[] = rawRows[headerIdx].map((h: any) =>
      normalizeColumnName(String(h ?? "")),
    );

    bySheet[sheetName] = { parsed: 0, skipped: 0 };

    for (let rowIdx = headerIdx + 1; rowIdx < rawRows.length; rowIdx++) {
      const rawRow = rawRows[rowIdx];
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
        // Check if the row was truly empty vs a parse failure
        const hasContent = Object.values(row).some((v) => v.length > 0);
        if (hasContent) errorCount++;
        bySheet[sheetName].skipped++;
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
