import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGenerateRoadmap } from "../../../worker/src/handlers/generate-roadmap";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/ai/engines/strategy", () => ({
  generateStrategy: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { generateStrategy } from "@/lib/ai/engines/strategy";

const mockOrg = {
  id: "org-123",
  name: "Atlanta Youth Foundation",
  entity_type: "nonprofit_501c3",
  state: "GA",
  annual_budget: 500000,
  employee_count: 8,
  org_profiles: [{ grant_history_level: "some" }],
  org_capabilities: [{ has_grant_writer: true }],
};

const mockReadiness = {
  overall_score: 72,
  gaps: ["Not registered in SAM.gov", "No annual audit", "Not on Grants.gov"],
  recommendations: ["Register at SAM.gov", "Commission audit", "Register on Grants.gov"],
  criteria: [
    { criterion_id: "a_legal_status", score: 9 },
    { criterion_id: "b_financial_systems", score: 7 },
    { criterion_id: "c_federal_registration", score: 4 },
    { criterion_id: "g_mission_narrative", score: 8 },
  ],
  scored_at: "2026-03-01T00:00:00Z",
};

const mockMatches = [
  {
    grant_source_id: "grant-1",
    match_score: 88,
    win_probability: "high",
    grant_sources: {
      name: "Youth Education Fund",
      funder_name: "Atlanta Foundation",
      source_type: "foundation",
      amount_min: 10000,
      amount_max: 50000,
      deadline: "2026-06-30",
    },
  },
];

const mockStrategyResult = {
  quarters: [
    {
      quarter: "Q1",
      year: 2026,
      grants: [
        { grant_id: "grant-1", grant_name: "Youth Education Fund", amount_range: "$10,000 - $50,000" },
      ],
      strategy_notes: "Start with foundation grants",
      capacity_hours_total: 20,
      risk_assessment: "Low risk",
    },
  ],
  annual_summary: {
    total_applications: 1,
    total_potential_funding: 50000,
    recommended_focus: "Foundation grants",
  },
};

function buildMockDb({
  orgNull = false,
  readinessRows = [mockReadiness],
  matchRows = mockMatches,
  pipelineRows = [],
  insertError = null as any,
} = {}) {
  const singleResult = orgNull
    ? { data: null, error: { message: "Not found" } }
    : { data: mockOrg, error: null };

  const deleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) };

  const db: any = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(singleResult),
        };
      }
      if (table === "readiness_scores") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: readinessRows }),
        };
      }
      if (table === "grant_matches") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: matchRows }),
        };
      }
      if (table === "grant_pipeline") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: pipelineRows }),
        };
      }
      if (table === "funding_roadmaps") {
        return {
          delete: vi.fn().mockReturnValue(deleteChain),
          insert: vi.fn().mockResolvedValue({ error: insertError }),
        };
      }
      return db;
    }),
  };
  return db;
}

describe("handleGenerateRoadmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns failed when org not found", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb({ orgNull: true }));

    const result = await handleGenerateRoadmap({
      org_id: "org-missing",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/not found/i);
  });

  it("returns failed when no readiness score exists", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb({ readinessRows: [] }));

    const result = await handleGenerateRoadmap({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/readiness/i);
  });

  it("returns failed when no grant matches exist", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb({ matchRows: [] }));

    const result = await handleGenerateRoadmap({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/grant matches/i);
  });

  it("runs strategy engine and returns completed", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb());
    (generateStrategy as any).mockResolvedValue(mockStrategyResult);

    const result = await handleGenerateRoadmap({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("completed");
    expect(result.quarters_generated).toBe(1);
    expect(result.total_grants_recommended).toBe(1);
    expect(generateStrategy).toHaveBeenCalledWith(
      { orgId: "org-123", userId: "user-456", tier: "pro" },
      expect.objectContaining({ name: mockOrg.name }),
      expect.objectContaining({ overall_score: 72 }),
      expect.any(Array),
      expect.any(Array),
      expect.any(String)
    );
  });

  it("returns failed when insert to funding_roadmaps fails", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb({ insertError: { message: "DB write error" } }));
    (generateStrategy as any).mockResolvedValue(mockStrategyResult);

    const result = await handleGenerateRoadmap({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.quarters_generated).toBe(1);
    expect(result.error).toMatch(/failed to save/i);
  });

  it("returns failed when generateStrategy throws", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb());
    (generateStrategy as any).mockRejectedValue(new Error("Strategy engine error"));

    const result = await handleGenerateRoadmap({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/Strategy engine error/i);
  });
});
