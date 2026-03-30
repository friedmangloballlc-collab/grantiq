// grantiq/tests/lib/ai/writing/pricing.test.ts

import { describe, it, expect } from "vitest";
import {
  getWritingPrice,
  getEstimatedTurnaround,
  getSuccessFeeRate,
  calculateSuccessFee,
  getAvailableTiers,
} from "@/lib/ai/writing/pricing";

describe("Writing Pricing", () => {
  it("returns correct prices for all tier/type combinations", () => {
    expect(getWritingPrice("tier1_ai_only", "state_foundation")).toBe(14900);
    expect(getWritingPrice("tier1_ai_only", "federal")).toBe(34900);
    expect(getWritingPrice("tier1_ai_only", "sbir_sttr")).toBe(49900);
    expect(getWritingPrice("tier2_ai_audit", "state_foundation")).toBe(24900);
    expect(getWritingPrice("tier2_ai_audit", "federal")).toBe(54900);
    expect(getWritingPrice("tier2_ai_audit", "sbir_sttr")).toBe(74900);
    expect(getWritingPrice("tier3_expert", "state_foundation")).toBe(49900);
    expect(getWritingPrice("tier3_expert", "federal")).toBe(124900);
    expect(getWritingPrice("tier3_expert", "sbir_sttr")).toBe(174900);
    expect(getWritingPrice("full_confidence", "state_foundation")).toBe(0);
    expect(getWritingPrice("full_confidence", "federal")).toBe(0);
    expect(getWritingPrice("full_confidence", "sbir_sttr")).toBe(0);
  });

  it("returns correct turnaround estimates", () => {
    expect(getEstimatedTurnaround("tier1_ai_only")).toBe("30 minutes");
    expect(getEstimatedTurnaround("tier2_ai_audit")).toBe("1 hour");
    expect(getEstimatedTurnaround("tier3_expert")).toBe("24-48 hours");
    expect(getEstimatedTurnaround("full_confidence")).toBe("1 hour");
  });
});

describe("Success Fees", () => {
  it("returns correct rates per tier/subscription combination", () => {
    expect(getSuccessFeeRate("tier1_ai_only", "starter")).toBe(7);
    expect(getSuccessFeeRate("tier2_ai_audit", "pro")).toBe(6);
    expect(getSuccessFeeRate("tier3_expert", "enterprise")).toBe(7);
    expect(getSuccessFeeRate("full_confidence", "pro")).toBe(10);
  });

  it("applies minimum fees for small grants", () => {
    // Under $10K: $250 minimum
    expect(calculateSuccessFee(5000, 5)).toBe(250);  // 5% of $5K = $250, matches minimum
    expect(calculateSuccessFee(3000, 5)).toBe(250);  // 5% of $3K = $150, use $250 minimum

    // $10K-$50K: $500 minimum
    expect(calculateSuccessFee(10000, 4)).toBe(500);  // 4% of $10K = $400, use $500 minimum
    expect(calculateSuccessFee(25000, 4)).toBe(1000); // 4% of $25K = $1000, exceeds minimum

    // $50K+: percentage applies
    expect(calculateSuccessFee(100000, 6)).toBe(6000);  // 6% of $100K
    expect(calculateSuccessFee(1000000, 5)).toBe(50000); // 5% of $1M — uncapped
  });

  it("free tier cannot purchase writing", () => {
    expect(getAvailableTiers("free")).toEqual([]);
  });

  it("paid tiers can access all writing tiers", () => {
    const tiers = getAvailableTiers("starter");
    expect(tiers).toContain("tier1_ai_only");
    expect(tiers).toContain("tier2_ai_audit");
    expect(tiers).toContain("tier3_expert");
    expect(tiers).toContain("full_confidence");
  });
});
