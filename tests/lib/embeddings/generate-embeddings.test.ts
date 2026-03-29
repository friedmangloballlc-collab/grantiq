import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildEmbeddingText, batchGenerateEmbeddings } from "@/lib/embeddings/generate-embeddings";

describe("buildEmbeddingText", () => {
  it("concatenates all available fields", () => {
    const text = buildEmbeddingText({
      name: "Community Health Grant",
      funder_name: "HHS",
      description: "Improve community health outcomes",
      category: "Health",
      eligibility_types: ["nonprofit_501c3"],
      states: ["CA", "TX"],
    });
    expect(text).toContain("Community Health Grant");
    expect(text).toContain("HHS");
    expect(text).toContain("Improve community health outcomes");
    expect(text).toContain("Health");
    expect(text).toContain("CA");
  });

  it("handles nulls gracefully", () => {
    const text = buildEmbeddingText({
      name: "Test Grant",
      funder_name: "Test Funder",
      description: null,
      category: null,
      eligibility_types: [],
      states: [],
    });
    expect(text).toContain("Test Grant");
    expect(text).not.toContain("null");
    expect(text).not.toContain("undefined");
  });

  it("truncates text to 8000 characters", () => {
    const text = buildEmbeddingText({
      name: "Grant",
      funder_name: "Funder",
      description: "x".repeat(10000),
      category: null,
      eligibility_types: [],
      states: [],
    });
    expect(text.length).toBeLessThanOrEqual(8000);
  });
});

describe("batchGenerateEmbeddings", () => {
  const mockOpenAI = {
    embeddings: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    mockOpenAI.embeddings.create.mockReset();
  });

  it("calls OpenAI with correct model and batches of 100", async () => {
    const texts = Array.from({ length: 150 }, (_, i) => `Grant ${i}`);
    const makeData = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ embedding: [0.1, 0.2, 0.3], index: i }));

    mockOpenAI.embeddings.create
      .mockResolvedValueOnce({ data: makeData(100) })
      .mockResolvedValueOnce({ data: makeData(50) });

    const result = await batchGenerateEmbeddings(texts, mockOpenAI as any);
    expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(150);
    expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "text-embedding-3-small" })
    );
  });

  it("returns null embeddings for failed items", async () => {
    mockOpenAI.embeddings.create.mockRejectedValueOnce(new Error("Rate limit"));

    const texts = ["Grant A", "Grant B"];
    const result = await batchGenerateEmbeddings(texts, mockOpenAI as any);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
  });

  it("handles empty input", async () => {
    const result = await batchGenerateEmbeddings([], mockOpenAI as any);
    expect(result).toHaveLength(0);
    expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
  });
});
