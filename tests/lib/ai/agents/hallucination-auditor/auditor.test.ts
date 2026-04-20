import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/call", () => ({ aiCall: vi.fn() }));

import { aiCall } from "@/lib/ai/call";
import { auditSection } from "@/lib/ai/agents/hallucination-auditor";
import type { AuditInput } from "@/lib/ai/agents/hallucination-auditor/types";

const mockAiCall = vi.mocked(aiCall);

function input(partial: Partial<AuditInput> = {}): AuditInput {
  return {
    sectionText: "Our program serves 500 students.",
    sectionName: "Project Description",
    rfpText: "Full RFP text here.",
    funderContextBlock: null,
    orgProfile: {
      name: "Test",
      mission_statement: "Serve kids",
      population_served: ["youth"],
      program_areas: ["education"],
    },
    context: {
      org_id: "o1",
      user_id: "u1",
      subscription_tier: "pro",
      draft_id: "d1",
    },
    ...partial,
  };
}

function mockAiResp(content: string) {
  return {
    content,
    inputTokens: 5000,
    outputTokens: 500,
    cacheCreationTokens: 0,
    cacheReadTokens: 3000,
    costCents: 5,
    model: "claude-opus-4-20250514",
  };
}

describe("auditSection", () => {
  beforeEach(() => mockAiCall.mockReset());

  it("returns verdict='clean' when all claims are grounded", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          claims: [
            {
              claim_text: "Our program serves 500 students.",
              status: "grounded",
              source_quote: "org profile lists 500 served",
              missing_source: null,
              is_hard_fact: true,
            },
          ],
        })
      )
    );
    const result = await auditSection(input());
    expect(result.verdict).toBe("clean");
    expect(result.claimsTotal).toBe(1);
    expect(result.claimsGrounded).toBe(1);
  });

  it("returns verdict='blocked' when a hard fact is ungrounded", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          claims: [
            {
              claim_text: "Our program serves 50,000 students.",
              status: "ungrounded",
              source_quote: null,
              missing_source: "Org profile says 500, section says 50,000",
              is_hard_fact: true,
            },
          ],
        })
      )
    );
    const result = await auditSection(input());
    expect(result.verdict).toBe("blocked");
    expect(result.claimsUngrounded).toBe(1);
  });

  it("returns verdict='flagged' for 1-2 soft ungrounded claims", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          claims: [
            {
              claim_text: "We are committed to excellence.",
              status: "ungrounded",
              source_quote: null,
              missing_source: "soft rhetoric not in source",
              is_hard_fact: false,
            },
          ],
        })
      )
    );
    const result = await auditSection(input());
    expect(result.verdict).toBe("flagged");
  });

  it("returns verdict='blocked' at 3+ ungrounded claims even if all soft", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          claims: [
            { claim_text: "a", status: "ungrounded", source_quote: null, missing_source: "x", is_hard_fact: false },
            { claim_text: "b", status: "ungrounded", source_quote: null, missing_source: "y", is_hard_fact: false },
            { claim_text: "c", status: "ungrounded", source_quote: null, missing_source: "z", is_hard_fact: false },
          ],
        })
      )
    );
    const result = await auditSection(input());
    expect(result.verdict).toBe("blocked");
  });

  it("returns verdict='unaudited' on non-JSON response", async () => {
    mockAiCall.mockResolvedValueOnce(mockAiResp("This is not JSON"));
    const result = await auditSection(input());
    expect(result.verdict).toBe("unaudited");
  });

  it("returns verdict='unaudited' on aiCall throw (fail-open)", async () => {
    mockAiCall.mockRejectedValueOnce(new Error("Anthropic down"));
    const result = await auditSection(input());
    expect(result.verdict).toBe("unaudited");
    expect(result.claimsTotal).toBe(0);
  });

  it("passes correct promptId + actionType to aiCall", async () => {
    mockAiCall.mockResolvedValueOnce(mockAiResp(JSON.stringify({ claims: [] })));
    await auditSection(input());
    const call = mockAiCall.mock.calls[0][0];
    expect(call.promptId).toBe("writing.hallucination_audit.v1");
    expect(call.actionType).toBe("audit");
    expect(call.provider).toBe("anthropic");
    expect(call.sessionId).toBe("d1");
  });

  it("uses caching: cacheableContext includes RFP + funder context + org", async () => {
    mockAiCall.mockResolvedValueOnce(mockAiResp(JSON.stringify({ claims: [] })));
    await auditSection(
      input({
        funderContextBlock: "=== FUNDER CONTEXT (FROM IRS 990 FILINGS) ===\nAcme",
      })
    );
    const call = mockAiCall.mock.calls[0][0];
    expect(call.cacheableContext).toContain("=== SOURCE RFP ===");
    expect(call.cacheableContext).toContain("=== FUNDER CONTEXT");
    expect(call.cacheableContext).toContain("=== ORG PROFILE ===");
  });
});
