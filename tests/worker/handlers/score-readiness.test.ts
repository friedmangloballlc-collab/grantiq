import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleScoreReadiness } from "../../../worker/src/handlers/score-readiness";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/ai/engines/readiness", () => ({
  assessReadiness: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { assessReadiness } from "@/lib/ai/engines/readiness";

const mockOrg = {
  id: "org-123",
  name: "Atlanta Youth Foundation",
  entity_type: "nonprofit_501c3",
  mission_statement: "Empowering Atlanta youth through education",
  state: "GA",
  annual_budget: 500000,
  employee_count: 8,
  org_profiles: [{
    program_areas: ["education"],
    population_served: ["youth"],
    grant_history_level: "some",
    outcomes_tracking: true,
  }],
  org_capabilities: [{
    years_operating: 5,
    has_501c3: true,
    has_ein: true,
    has_sam_registration: false,
    has_grants_gov: false,
    has_audit: false,
    has_fiscal_sponsor: false,
    has_grant_writer: true,
    prior_federal_grants: 0,
    prior_foundation_grants: 3,
    sam_gov_status: "none",
    grants_gov_status: "not_registered",
    annual_budget: 500000,
  }],
};

const mockReadinessResult = {
  overall_score: 72,
  tier_label: "good",
  criteria: [
    { criterion_id: "a_legal_status", score: 9, max_score: 10 },
    { criterion_id: "b_financial_systems", score: 7, max_score: 10 },
  ],
  top_3_gaps: [
    { criterion_name: "Federal Registration", gap_description: "Not registered in SAM.gov", fix_action: "Register at SAM.gov", estimated_fix_hours: 8 },
    { criterion_name: "Audit", gap_description: "No annual audit", fix_action: "Commission audit", estimated_fix_hours: 40 },
    { criterion_name: "Federal Access", gap_description: "Not on Grants.gov", fix_action: "Register on Grants.gov", estimated_fix_hours: 4 },
  ],
};

function buildMockDb(orgOverride?: Partial<typeof mockOrg> | null, insertError?: any) {
  const singleResult = orgOverride === null
    ? { data: null, error: { message: "Not found" } }
    : { data: { ...mockOrg, ...orgOverride }, error: null };

  // Cache-check query chain: select().eq().order().limit().single()
  const cacheCheckChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
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
      if (table === "readiness_scores") {
        return {
          ...cacheCheckChain,
          insert: vi.fn().mockResolvedValue({ error: insertError ?? null }),
        };
      }
      return db;
    }),
  };
  return db;
}

describe("handleScoreReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns failed when org not found", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb(null));

    const result = await handleScoreReadiness({
      org_id: "org-missing",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.overall_score).toBeNull();
    expect(result.error).toMatch(/not found/i);
  });

  it("calls assessReadiness with org data and returns completed", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb());
    (assessReadiness as any).mockResolvedValue(mockReadinessResult);

    const result = await handleScoreReadiness({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("completed");
    expect(result.overall_score).toBe(72);
    expect(result.tier_label).toBe("good");
    expect(assessReadiness).toHaveBeenCalledWith(
      { orgId: "org-123", userId: "user-456", tier: "pro" },
      expect.objectContaining({
        name: mockOrg.name,
        entity_type: mockOrg.entity_type,
        mission_statement: mockOrg.mission_statement,
      })
    );
  });

  it("returns failed when insert to readiness_scores fails", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb(undefined, { message: "DB error" }));
    (assessReadiness as any).mockResolvedValue(mockReadinessResult);

    const result = await handleScoreReadiness({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.overall_score).toBe(72);
    expect(result.error).toMatch(/failed to save/i);
  });

  it("returns failed when assessReadiness throws", async () => {
    (createAdminClient as any).mockReturnValue(buildMockDb());
    (assessReadiness as any).mockRejectedValue(new Error("AI service unavailable"));

    const result = await handleScoreReadiness({
      org_id: "org-123",
      user_id: "user-456",
      tier: "pro",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/AI service unavailable/i);
  });
});
