import { describe, it, expect } from "vitest";
import { buildVectorRecallQuery } from "@/lib/matching/vector-recall";

describe("buildVectorRecallQuery", () => {
  it("returns SQL that selects top 200 by cosine similarity", () => {
    const sql = buildVectorRecallQuery();
    expect(sql).toContain("description_embedding");
    expect(sql).toContain("200");
    expect(sql).toContain("is_active");
  });
});
