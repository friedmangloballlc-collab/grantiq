import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the admin client BEFORE importing the module under test.
// Each test sets up its own mock query responses.
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn();
const mockIlike = vi.fn(() => ({ limit: mockLimit }));
const mockEqGrants = vi.fn(() => ({ single: mockSingle }));
const mockEqFunders = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn();
const mockFrom = vi.fn((table: string) => {
  if (table === "grant_sources") {
    return { select: () => ({ eq: mockEqGrants }) };
  }
  if (table === "funder_profiles") {
    return {
      select: () => ({ eq: mockEqFunders, ilike: mockIlike }),
    };
  }
  return { select: mockSelect };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { buildFunderContextBlock } from "@/lib/grants/funder_context";

describe("buildFunderContextBlock", () => {
  beforeEach(() => {
    mockSingle.mockReset();
    mockMaybeSingle.mockReset();
    mockLimit.mockReset();
    mockEqGrants.mockClear();
    mockEqFunders.mockClear();
    mockIlike.mockClear();
    mockFrom.mockClear();
  });

  it("returns null when no grant_sources row exists", async () => {
    mockSingle.mockResolvedValueOnce({ data: null });
    const result = await buildFunderContextBlock("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null when funder_id and funder_name both miss", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { funder_id: null, funder_name: null },
    });
    const result = await buildFunderContextBlock("g1");
    expect(result).toBeNull();
  });

  it("returns null when funder_profiles has no usable fields", async () => {
    // Funder resolves but every field is null — emitting a header-only block
    // would be a fabrication risk. Must return null to signal "skip block."
    mockSingle.mockResolvedValueOnce({
      data: { funder_id: "f1", funder_name: "Empty Foundation" },
    });
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        funder_name: "Empty Foundation",
        funder_type: null,
        focus_areas: null,
        avg_award_size: null,
        typical_award_range_min: null,
        typical_award_range_max: null,
        total_annual_giving: null,
        geographic_preference: null,
        org_size_preference: null,
        new_applicant_friendly: null,
        acceptance_rate: null,
      },
    });
    const result = await buildFunderContextBlock("g1");
    expect(result).toBeNull();
  });

  it("includes the provenance header when data is present", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { funder_id: "f1", funder_name: "Acme Foundation" },
    });
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        funder_name: "Acme Foundation",
        funder_type: "foundation",
        focus_areas: ["education", "youth_development"],
        avg_award_size: 75000,
        typical_award_range_min: 25000,
        typical_award_range_max: 150000,
        total_annual_giving: 12000000,
        geographic_preference: { states: ["CA", "OR", "WA"] },
        org_size_preference: "small_to_medium",
        new_applicant_friendly: true,
        acceptance_rate: 0.18,
      },
    });
    const result = await buildFunderContextBlock("g1");
    expect(result).toContain("FUNDER CONTEXT (FROM IRS 990 FILINGS)");
    expect(result).toContain("Do not invent details beyond what's listed here");
    expect(result).toContain("Acme Foundation");
  });

  it("formats money fields with USD comma separation", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { funder_id: "f1", funder_name: "Big Bucks" },
    });
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        funder_name: "Big Bucks",
        funder_type: "foundation",
        focus_areas: null,
        avg_award_size: 100000,
        typical_award_range_min: null,
        typical_award_range_max: null,
        total_annual_giving: 5_500_000,
        geographic_preference: null,
        org_size_preference: null,
        new_applicant_friendly: null,
        acceptance_rate: null,
      },
    });
    const result = await buildFunderContextBlock("g1");
    expect(result).toContain("$5,500,000");
    expect(result).toContain("$100,000");
  });

  it("omits null fields entirely — no 'unknown' or '0' fabrication", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { funder_id: "f1", funder_name: "Partial Data Foundation" },
    });
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        funder_name: "Partial Data Foundation",
        funder_type: "foundation",
        focus_areas: ["health"],
        avg_award_size: null,
        typical_award_range_min: null,
        typical_award_range_max: null,
        total_annual_giving: null,
        geographic_preference: null,
        org_size_preference: null,
        new_applicant_friendly: null,
        acceptance_rate: null,
      },
    });
    const result = await buildFunderContextBlock("g1");
    // Must not contain the placeholder strings that would fabricate data
    expect(result).not.toContain("unknown");
    expect(result).not.toContain("Unknown");
    expect(result).not.toContain("$0");
    expect(result).not.toContain("null");
    expect(result).not.toContain("Average award size");
    expect(result).not.toContain("Total annual giving");
    // But must contain what we DO have
    expect(result).toContain("health");
    expect(result).toContain("foundation");
  });

  it("falls back to funder_name ilike when funder_id is null", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { funder_id: null, funder_name: "Family Foundation" },
    });
    mockLimit.mockResolvedValueOnce({
      data: [
        {
          funder_name: "Family Foundation",
          funder_type: "foundation",
          focus_areas: ["arts_culture"],
          avg_award_size: 25000,
          typical_award_range_min: null,
          typical_award_range_max: null,
          total_annual_giving: null,
          geographic_preference: null,
          org_size_preference: null,
          new_applicant_friendly: null,
          acceptance_rate: null,
        },
      ],
    });
    const result = await buildFunderContextBlock("g1");
    expect(result).toContain("Family Foundation");
    expect(result).toContain("arts_culture");
    expect(result).toContain("$25,000");
    // ilike path was used, not eq-by-id path
    expect(mockEqFunders).not.toHaveBeenCalled();
    expect(mockIlike).toHaveBeenCalled();
  });

  it("renders new_applicant_friendly=false as the negative phrasing, not omission", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { funder_id: "f1", funder_name: "Repeat Grantee Foundation" },
    });
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        funder_name: "Repeat Grantee Foundation",
        funder_type: "foundation",
        focus_areas: ["education"],
        avg_award_size: null,
        typical_award_range_min: null,
        typical_award_range_max: null,
        total_annual_giving: null,
        geographic_preference: null,
        org_size_preference: null,
        new_applicant_friendly: false,
        acceptance_rate: null,
      },
    });
    const result = await buildFunderContextBlock("g1");
    expect(result).toContain("Tends to fund repeat grantees");
  });

  it("includes geographic preference array values when present", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { funder_id: "f1", funder_name: "Regional Funder" },
    });
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        funder_name: "Regional Funder",
        funder_type: "foundation",
        focus_areas: null,
        avg_award_size: 50000,
        typical_award_range_min: null,
        typical_award_range_max: null,
        total_annual_giving: null,
        geographic_preference: { states: ["NY", "NJ"], cities: ["New York"] },
        org_size_preference: null,
        new_applicant_friendly: null,
        acceptance_rate: null,
      },
    });
    const result = await buildFunderContextBlock("g1");
    expect(result).toContain("Geographic focus");
    expect(result).toContain("NY, NJ");
    expect(result).toContain("New York");
  });
});
