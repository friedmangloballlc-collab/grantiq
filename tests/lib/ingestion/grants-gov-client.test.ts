import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchGrantsGov, GrantsGovOpportunity } from "@/lib/ingestion/grants-gov-client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("searchGrantsGov", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("calls the correct Grants.gov endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ oppHits: [], totalCount: 0 }),
    });
    await searchGrantsGov({ startRecordNum: 0, rows: 10 });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://apply07.grants.gov/grantsws/rest/opportunities/search",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns mapped opportunities on success", async () => {
    const mockOpp = {
      id: "12345",
      number: "HHS-2026-001",
      title: "Community Health Grant",
      agencyName: "HHS",
      closeDate: "20260630",
      openDate: "20260101",
      awardCeiling: 500000,
      awardFloor: 25000,
      synopsis: "Health improvement grants for nonprofits",
      opportunityCategory: { category: "D" },
      cfdaList: [{ programNumber: "93.123" }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ oppHits: [mockOpp], totalCount: 1 }),
    });

    const result = await searchGrantsGov({ startRecordNum: 0, rows: 10 });
    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0].id).toBe("12345");
    expect(result.opportunities[0].title).toBe("Community Health Grant");
    expect(result.opportunities[0].cfda_number).toBe("93.123");
    expect(result.opportunities[0].amount_max).toBe(500000);
    expect(result.total).toBe(1);
  });

  it("throws on non-OK HTTP response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: "Service Unavailable" });
    await expect(searchGrantsGov({ startRecordNum: 0, rows: 10 })).rejects.toThrow("503");
  });

  it("applies 30-second timeout", async () => {
    mockFetch.mockImplementationOnce((_url: string, opts: RequestInit) => {
      expect(opts.signal).toBeDefined();
      return Promise.resolve({ ok: true, json: async () => ({ oppHits: [], totalCount: 0 }) });
    });
    await searchGrantsGov({ startRecordNum: 0, rows: 1 });
  });
});
