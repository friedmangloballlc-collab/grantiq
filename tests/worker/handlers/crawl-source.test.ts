import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCrawlSource } from "../../../worker/src/handlers/crawl-source";

const mockUpdateChain = {
  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
};

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  upsert: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnValue(mockUpdateChain),
};

describe("handleCrawlSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.upsert.mockResolvedValue({ data: [], error: null });
    mockSupabase.insert.mockResolvedValue({ data: [], error: null });
    mockUpdateChain.eq.mockResolvedValue({ data: [], error: null });
  });

  it("throws if crawl_source_id is missing from payload", async () => {
    await expect(
      handleCrawlSource({ payload: {} } as any, mockSupabase as any)
    ).rejects.toThrow("crawl_source_id");
  });

  it("looks up the crawl source by id", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: "src-1", source_type: "api", config: { api: "unknown" } },
      error: null,
    });
    await handleCrawlSource(
      { payload: { crawl_source_id: "src-1" } } as any,
      mockSupabase as any
    );
    expect(mockSupabase.from).toHaveBeenCalledWith("crawl_sources");
  });

  it("throws if crawl source not found", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: "Not found" } });
    await expect(
      handleCrawlSource({ payload: { crawl_source_id: "bad-id" } } as any, mockSupabase as any)
    ).rejects.toThrow("Not found");
  });
});
