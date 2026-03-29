import { describe, it, expect } from "vitest";
import {
  normalizeColumnName,
  resolveColumn,
  COLUMN_ALIASES,
  extractRowData,
} from "@/lib/ingestion/xlsx-parser";

describe("normalizeColumnName", () => {
  it("lowercases and strips whitespace", () => {
    expect(normalizeColumnName("Program Name")).toBe("program name");
  });
  it("trims surrounding spaces", () => {
    expect(normalizeColumnName("  URL  ")).toBe("url");
  });
});

describe("resolveColumn", () => {
  const row = {
    "program name": "USDA Rural Dev",
    url: "https://example.com",
    "cfda/aln number": "10.001",
    "award range": "$50,000-$500,000",
    deadline: "06/30/2026",
    eligibility: "Nonprofits, Government",
  };

  it("resolves 'name' alias for federal sheet", () => {
    const val = resolveColumn(row, "name", "federal");
    expect(val).toBe("USDA Rural Dev");
  });

  it("resolves 'cfda_number' alias", () => {
    const val = resolveColumn(row, "cfda_number", "federal");
    expect(val).toBe("10.001");
  });

  it("resolves 'award_range' for amount fields", () => {
    const val = resolveColumn(row, "award_range", "federal");
    expect(val).toBe("$50,000-$500,000");
  });

  it("returns null when column not found", () => {
    const val = resolveColumn({}, "name", "federal");
    expect(val).toBeNull();
  });
});

describe("extractRowData — federal sheet", () => {
  const headers = [
    "Agency", "Program Name", "CFDA/ALN Number", "URL", "Award Range", "Deadline", "Eligibility"
  ];
  const values = [
    "USDA", "Rural Business Dev Grant", "10.769", "https://usda.gov/rbdg",
    "$10,000-$500,000", "03/15/2026", "Nonprofits, Small Business"
  ];
  const row: Record<string, string> = {};
  headers.forEach((h, i) => { row[h.toLowerCase()] = values[i]; });

  it("extracts name from Program Name column", () => {
    const result = extractRowData(row, "2. Federal Govt");
    expect(result?.name).toBe("Rural Business Dev Grant");
  });

  it("extracts cfda_number", () => {
    const result = extractRowData(row, "2. Federal Govt");
    expect(result?.cfda_number).toBe("10.769");
  });

  it("extracts source_type as federal", () => {
    const result = extractRowData(row, "2. Federal Govt");
    expect(result?.source_type).toBe("federal");
  });

  it("parses amount_min and amount_max", () => {
    const result = extractRowData(row, "2. Federal Govt");
    expect(result?.amount_min).toBe(10000);
    expect(result?.amount_max).toBe(500000);
  });

  it("parses deadline", () => {
    const result = extractRowData(row, "2. Federal Govt");
    expect(result?.deadline?.toISOString().startsWith("2026-03-15")).toBe(true);
  });

  it("returns null for empty rows", () => {
    expect(extractRowData({}, "2. Federal Govt")).toBeNull();
  });
});

describe("extractRowData — state sheet ST-CA", () => {
  const row: Record<string, string> = {
    "source name": "California Arts Council Grant",
    url: "https://arts.ca.gov",
    type: "foundation",
    "focus area": "Arts",
    eligibility: "Nonprofits",
    notes: "Annual grant",
  };

  it("extracts source_type as state", () => {
    const result = extractRowData(row, "ST-CA");
    expect(result?.source_type).toBe("state");
  });

  it("includes CA in states array", () => {
    const result = extractRowData(row, "ST-CA");
    expect(result?.states).toContain("CA");
  });
});

describe("extractRowData — foundation sheet", () => {
  const row: Record<string, string> = {
    "foundation name": "Gates Foundation",
    url: "https://gatesfoundation.org",
    "focus areas": "Health, Education",
    "geographic preference": "National",
    "award range": "Up to $1M",
    "application process": "LOI first",
  };

  it("extracts foundation name", () => {
    const result = extractRowData(row, "7. National Fdn");
    expect(result?.funder_name).toBe("Gates Foundation");
  });

  it("parses amount_max from 'Up to $1M'", () => {
    const result = extractRowData(row, "7. National Fdn");
    expect(result?.amount_max).toBe(1000000);
  });
});
