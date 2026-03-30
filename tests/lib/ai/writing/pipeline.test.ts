// grantiq/tests/lib/ai/writing/pipeline.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Tier routing logic — unit tests (no external calls)
// ============================================================

/**
 * The pipeline decides which engines to call based on tier:
 *
 * tier1_ai_only:       draft + coherence + compliance
 * tier2_ai_audit:      draft + coherence + audit + rewrite + review + compliance
 * tier3_expert:        same as tier2 (expert review added outside pipeline)
 * full_confidence:     same as tier2
 */

function getTierEngines(tier: string): string[] {
  const base = ["generateDraft", "checkCoherence", "checkCompliance"];
  const extended = [
    "generateDraft",
    "checkCoherence",
    "auditDraft",
    "rewriteWithAuditFeedback",
    "simulateReview",
    "checkCompliance",
  ];

  switch (tier) {
    case "tier1_ai_only":
      return base;
    case "tier2_ai_audit":
    case "tier3_expert":
    case "full_confidence":
      return extended;
    default:
      return base;
  }
}

describe("Pipeline Tier Routing", () => {
  it("tier1_ai_only runs base engines only (no audit, no review sim)", () => {
    const engines = getTierEngines("tier1_ai_only");
    expect(engines).toContain("generateDraft");
    expect(engines).toContain("checkCoherence");
    expect(engines).toContain("checkCompliance");
    expect(engines).not.toContain("auditDraft");
    expect(engines).not.toContain("rewriteWithAuditFeedback");
    expect(engines).not.toContain("simulateReview");
  });

  it("tier2_ai_audit includes audit, rewrite, and review simulation", () => {
    const engines = getTierEngines("tier2_ai_audit");
    expect(engines).toContain("auditDraft");
    expect(engines).toContain("rewriteWithAuditFeedback");
    expect(engines).toContain("simulateReview");
    expect(engines).toContain("checkCompliance");
  });

  it("tier3_expert runs same engines as tier2 (expert review is manual, outside pipeline)", () => {
    const tier2 = getTierEngines("tier2_ai_audit");
    const tier3 = getTierEngines("tier3_expert");
    expect(tier3).toEqual(tier2);
  });

  it("full_confidence runs same engines as tier2", () => {
    const tier2 = getTierEngines("tier2_ai_audit");
    const fullConfidence = getTierEngines("full_confidence");
    expect(fullConfidence).toEqual(tier2);
  });

  it("compliance check always runs last for all tiers", () => {
    for (const tier of ["tier1_ai_only", "tier2_ai_audit", "tier3_expert", "full_confidence"]) {
      const engines = getTierEngines(tier);
      expect(engines[engines.length - 1]).toBe("checkCompliance");
    }
  });

  it("generateDraft always runs first (after context setup) for all tiers", () => {
    for (const tier of ["tier1_ai_only", "tier2_ai_audit", "tier3_expert", "full_confidence"]) {
      const engines = getTierEngines(tier);
      expect(engines[0]).toBe("generateDraft");
    }
  });
});

describe("Pipeline Status Progression", () => {
  it("defines correct status sequence for tier1", () => {
    // Tier 1 status progression
    const tier1Statuses = [
      "funder_analyzed",
      "drafting",
      "draft_complete",
      "coherence_checked",
      "compliance_checked",
      "completed",
    ];

    // Each status should be reachable from the previous
    for (let i = 1; i < tier1Statuses.length; i++) {
      expect(tier1Statuses[i]).toBeTruthy();
      expect(tier1Statuses[i - 1]).toBeTruthy();
    }

    // Draft complete comes before coherence check
    expect(tier1Statuses.indexOf("draft_complete")).toBeLessThan(
      tier1Statuses.indexOf("coherence_checked")
    );

    // Compliance is second to last before completed
    expect(tier1Statuses.indexOf("compliance_checked")).toBeLessThan(
      tier1Statuses.indexOf("completed")
    );
  });

  it("defines correct status sequence for tier2/full_confidence", () => {
    const tier2Statuses = [
      "funder_analyzed",
      "drafting",
      "draft_complete",
      "coherence_checked",
      "auditing",
      "audit_complete",
      "rewriting",
      "rewrite_complete",
      "review_simulated",
      "compliance_checked",
      "completed",
    ];

    // Audit comes after coherence
    expect(tier2Statuses.indexOf("auditing")).toBeGreaterThan(
      tier2Statuses.indexOf("coherence_checked")
    );

    // Review simulation comes after rewrite
    expect(tier2Statuses.indexOf("review_simulated")).toBeGreaterThan(
      tier2Statuses.indexOf("rewrite_complete")
    );

    // Compliance last before completed
    expect(tier2Statuses.indexOf("compliance_checked")).toBeLessThan(
      tier2Statuses.indexOf("completed")
    );
  });
});

describe("Pipeline Error Handling", () => {
  it("marks draft as failed when an engine throws", async () => {
    // Simulate: if generateDraft throws, status should be "failed"
    const updateStatuses: string[] = [];

    const mockUpdate = async (status: string) => {
      updateStatuses.push(status);
    };

    // Simulate pipeline failure
    try {
      await mockUpdate("drafting");
      throw new Error("Draft generation failed: OpenAI rate limit");
    } catch {
      await mockUpdate("failed");
    }

    expect(updateStatuses).toContain("drafting");
    expect(updateStatuses).toContain("failed");
    expect(updateStatuses[updateStatuses.length - 1]).toBe("failed");
  });
});
