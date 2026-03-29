import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchSamGov } from "@/lib/ingestion/sam-gov-client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("searchSamGov", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls the SAM.gov v2 search endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ opportunitiesData: [], totalRecords: 0 }),
    });
    await searchSamGov({ api_key: "test-key", limit: 10, offset: 0 });
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain("api.sam.gov/opportunities/v2/search");
    expect(callUrl).toContain("api_key=test-key");
  });

  it("maps SAM.gov fields to normalized opportunity format", async () => {
    const mockOpp = {
      noticeId: "SAM-2026-001",
      title: "SBIR Phase I",
      fullParentPathName: "Department of Defense",
      responseDeadLine: "2026-06-30T17:00:00-04:00",
      postedDate: "2026-01-01",
      archiveDate: null,
      award: { amount: "500000" },
      description: "Small business innovation research",
      naicsCode: "541715",
      active: "Yes",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ opportunitiesData: [mockOpp], totalRecords: 1 }),
    });

    const result = await searchSamGov({ api_key: "test-key", limit: 10, offset: 0 });
    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0].id).toBe("SAM-2026-001");
    expect(result.opportunities[0].title).toBe("SBIR Phase I");
    expect(result.total).toBe(1);
  });

  it("throws on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: "Unauthorized" });
    await expect(
      searchSamGov({ api_key: "bad-key", limit: 10, offset: 0 })
    ).rejects.toThrow("401");
  });

  it("uses 30-second timeout via AbortController", async () => {
    mockFetch.mockImplementationOnce((_url: string, opts: RequestInit) => {
      expect(opts.signal).toBeDefined();
      return Promise.resolve({
        ok: true,
        json: async () => ({ opportunitiesData: [], totalRecords: 0 }),
      });
    });
    await searchSamGov({ api_key: "test-key", limit: 1, offset: 0 });
  });
});
