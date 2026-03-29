import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGenerateEmbedding } from "../../../worker/src/handlers/generate-embedding";

const mockUpdateChain = {
  eq: vi.fn().mockResolvedValue({ error: null }),
};

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnValue(mockUpdateChain),
  insert: vi.fn().mockReturnThis(),
};

const mockOpenAI = {
  embeddings: { create: vi.fn() },
};

describe("handleGenerateEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.is.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.limit.mockReturnThis();
    mockUpdateChain.eq.mockResolvedValue({ error: null });
    mockSupabase.insert.mockResolvedValue({ error: null });
  });

  it("returns early when no grants need embeddings", async () => {
    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });
    const result = await handleGenerateEmbedding(
      { payload: {} } as any,
      mockSupabase as any,
      mockOpenAI as any
    );
    expect(result.updated).toBe(0);
    expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
  });

  it("generates embeddings for pending grants", async () => {
    const fakeGrants = [
      { id: "g1", name: "Grant A", funder_name: "Funder A", description: null, category: null, eligibility_types: [], states: [] },
      { id: "g2", name: "Grant B", funder_name: "Funder B", description: "desc", category: "Health", eligibility_types: [], states: [] },
    ];
    mockSupabase.limit.mockResolvedValueOnce({ data: fakeGrants, error: null });
    mockOpenAI.embeddings.create.mockResolvedValueOnce({
      data: [
        { embedding: [0.1, 0.2], index: 0 },
        { embedding: [0.3, 0.4], index: 1 },
      ],
    });

    const result = await handleGenerateEmbedding(
      { payload: { batch_size: 100 } } as any,
      mockSupabase as any,
      mockOpenAI as any
    );
    expect(result.updated).toBe(2);
    expect(result.failed).toBe(0);
  });
});
