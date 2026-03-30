import { describe, it, expect } from "vitest";
import { parseAmount, parseDeadline, extractStateFromSheetName, mapSourceType } from "@/lib/ingestion/parsers";

describe("parseAmount", () => {
  it("parses a dollar range", () => {
    expect(parseAmount("$50,000-$500,000")).toEqual({ min: 50000, max: 500000 });
  });
  it("parses 'Up to $1M'", () => {
    expect(parseAmount("Up to $1M")).toEqual({ min: null, max: 1000000 });
  });
  it("parses '$50K'", () => {
    expect(parseAmount("$50K")).toEqual({ min: 50000, max: 50000 });
  });
  it("parses 'Up to $500K'", () => {
    expect(parseAmount("Up to $500K")).toEqual({ min: null, max: 500000 });
  });
  it("parses '$25,000 - $100,000'", () => {
    expect(parseAmount("$25,000 - $100,000")).toEqual({ min: 25000, max: 100000 });
  });
  it("parses '$2.5M'", () => {
    expect(parseAmount("$2.5M")).toEqual({ min: 2500000, max: 2500000 });
  });
  it("parses 'Varies' as nulls", () => {
    expect(parseAmount("Varies")).toEqual({ min: null, max: null });
  });
  it("returns nulls for empty string", () => {
    expect(parseAmount("")).toEqual({ min: null, max: null });
  });
  it("parses '$1,000 to $10,000'", () => {
    expect(parseAmount("$1,000 to $10,000")).toEqual({ min: 1000, max: 10000 });
  });
  it("parses 'Average $75,000'", () => {
    expect(parseAmount("Average $75,000")).toEqual({ min: null, max: 75000 });
  });
});

describe("parseDeadline", () => {
  it("parses MM/DD/YYYY", () => {
    const result = parseDeadline("03/15/2026");
    expect(result?.toISOString().startsWith("2026-03-15")).toBe(true);
  });
  it("parses YYYY-MM-DD", () => {
    const result = parseDeadline("2026-06-30");
    expect(result?.toISOString().startsWith("2026-06-30")).toBe(true);
  });
  it("parses 'March 15, 2026'", () => {
    const result = parseDeadline("March 15, 2026");
    expect(result?.toISOString().startsWith("2026-03-15")).toBe(true);
  });
  it("returns null for 'Rolling'", () => {
    expect(parseDeadline("Rolling")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(parseDeadline("")).toBeNull();
  });
  it("parses 'June 30' using current/next year", () => {
    const result = parseDeadline("June 30");
    expect(result).not.toBeNull();
    expect(result?.getMonth()).toBe(5);
    expect(result?.getDate()).toBe(30);
  });
});

describe("extractStateFromSheetName", () => {
  it("extracts 2-letter code from ST-CA", () => {
    expect(extractStateFromSheetName("ST-CA")).toBe("CA");
  });
  it("returns null for non-state sheets", () => {
    expect(extractStateFromSheetName("7. National Fdn")).toBeNull();
  });
});

describe("mapSourceType", () => {
  it("maps federal sheets", () => {
    expect(mapSourceType("2. Federal Govt")).toBe("federal");
    expect(mapSourceType("SBIR-STTR Expanded")).toBe("federal");
  });
  it("maps state sheets", () => {
    expect(mapSourceType("4. State Govt")).toBe("state");
    expect(mapSourceType("ST-CA")).toBe("state");
  });
  it("maps foundation sheets", () => {
    expect(mapSourceType("7. National Fdn")).toBe("foundation");
    expect(mapSourceType("Major Foundations")).toBe("foundation");
  });
  it("maps corporate sheets", () => {
    expect(mapSourceType("9. Corporate A-M")).toBe("corporate");
    expect(mapSourceType("Tech Company Programs")).toBe("corporate");
  });
  it("returns null for skip sheets", () => {
    expect(mapSourceType("Eligibility Checklist")).toBeNull();
  });
});
