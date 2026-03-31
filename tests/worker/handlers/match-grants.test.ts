import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMatchGrants } from "../../../worker/src/handlers/match-grants";

// Mock the admin Supabase client
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/matching/vector-recall", () => ({
  vectorRecall: vi.fn(),
}));

vi.mock("@/lib/matching/hard-filter", () => ({
  applyHardFilters: vi.fn(),
}));

vi.mock("@/lib/ai/engines/match", () => ({
  scoreGrantBatch: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { vectorRecall } from "@/lib/matching/vector-recall";
import { applyHardFilters } from "@/lib/matching/hard-filter";
import { scoreGrantBatch } from "@/lib/ai/engines/match";

const mockOrg = {
  id: "org-123",
  name: "Atlanta Youth Foundation",
  entity_type: "nonprofit_501c3",
  mission_statement: "Empowering Atlanta youth through education",
  mission_embedding: Array(1536).fill(0.1),
  state: "GA",
  city: "Atlanta",
  annual_budget: 500000,
  employee_count: 8,
  org_profiles: [{ program_areas: ["education"], population_served: ["youth"], grant_history_level: "some" }],
  org_capabilities: [{ has_501c3: true, has_sam_registration: false, has_audit: false, years_operating: 5 }],
};

function buildMockDb(orgOverride?: Partial<typeof mockOrg> | null) {
  const deleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
  const insertChain = vi.fn().mockResolvedValue({ error: null });
  const singleResult = orgOverride === null
    ? { data: null, error: { message: "Not found" } }
    : { data: { ...mockOrg, ...orgOverride }, error: null };

  // Cache-check query chain: select().eq().order().limit().single()
  // Returns null data so cache is always a miss and full pipeline runs.
  const cacheCheckChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    // count query (select("*", { count: "exact", head: true })) also uses eq
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  // match_cache table: select chain + upsert
  const matchCacheChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ data: [], error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };

  const db: any = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(singleResult),
        };
      }
      if (table === "grant_matches") {
        return {
          ...cacheCheckChain,
          delete: vi.fn().mockReturnValue(deleteChain),
          insert: insertChain,
        };
      }
      if (table === "match_cache") {
        return matchCacheChain;
      }
      return db;
    }),
  };
  return db;
}

describe("handleMatchGrants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws (returns failed) if org not found", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb(null));

    const result = await handleMatchGrants({
      org_id: "org-missing",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/not found/i);
  });

  it("returns completed with 0 matches when vector recall returns empty", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb());
    (vectorRecall as any).mockResolvedValue([]);

    const result = await handleMatchGrants({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("completed");
    expect(result.matches_found).toBe(0);
    expect(result.matches_scored).toBe(0);
  });

  it("returns failed with missing embedding message if org has no mission_embedding", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb({ mission_embedding: null as any }));

    const result = await handleMatchGrants({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/embedding/i);
  });

  it("runs full pipeline and returns completed when matches are found", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb());

    const fakeVectorResults = [
      {
        id: "grant-1",
        name: "Youth Education Fund",
        funder_name: "Atlanta Foundation",
        source_type: "foundation",
        amount_min: 10000,
        amount_max: 50000,
        description: "Supporting youth programs",
        deadline: "2026-06-30",
        states: ["GA"],
        eligibility_types: ["nonprofit_501c3"],
        similarity: 0.92,
      },
    ];

    const fakeScoredGrants = [
      {
        grant_id: "grant-1",
        match_score: 88,
        score_breakdown: {},
        why_it_matches: ["Strong mission alignment"],
        missing_requirements: [],
        win_probability: "high",
        recommended_action: "apply",
      },
    ];

    (vectorRecall as any).mockResolvedValue(fakeVectorResults);
    (applyHardFilters as any).mockReturnValue(fakeVectorResults);
    (scoreGrantBatch as any).mockResolvedValue({ scored_grants: fakeScoredGrants });

    const result = await handleMatchGrants({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("completed");
    expect(result.matches_found).toBe(1);
    expect(result.matches_scored).toBe(1);
    expect(vectorRecall).toHaveBeenCalledWith(mockOrg.mission_embedding);
    expect(applyHardFilters).toHaveBeenCalled();
    expect(scoreGrantBatch).toHaveBeenCalled();
  });

  it("returns completed with 0 matches when hard filter eliminates all candidates", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb());
    (vectorRecall as any).mockResolvedValue([{ id: "grant-1", name: "Test" }]);
    (applyHardFilters as any).mockReturnValue([]);

    const result = await handleMatchGrants({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("completed");
    expect(result.matches_found).toBe(0);
    expect(scoreGrantBatch).not.toHaveBeenCalled();
  });
});
