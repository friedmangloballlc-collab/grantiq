import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/call", () => ({ aiCall: vi.fn() }));

const adminMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMock,
}));

import { aiCall } from "@/lib/ai/call";
import { triageSupportMessage } from "@/lib/ai/agents/support-triage";
import type { SupportTriageInput } from "@/lib/ai/agents/support-triage/types";

const mockAiCall = vi.mocked(aiCall);

function mockAiResp(content: string) {
  return {
    content,
    inputTokens: 1200,
    outputTokens: 350,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    costCents: 2,
    model: "claude-haiku-4-5-20251001",
  };
}

function input(partial: Partial<SupportTriageInput> = {}): SupportTriageInput {
  return {
    channel: "email",
    externalId: "EMAIL-1",
    senderEmail: "user@example.com",
    senderName: "Jane Doe",
    subject: "Charged twice for April",
    body: "Hi, I was billed for the Pro plan twice this month and need a refund for the duplicate charge.",
    orgId: null,
    userId: null,
    tier: "internal",
    ...partial,
  };
}

function setupAdmin({
  existing = null,
  insertId = "ticket-1",
  insertError = null,
}: {
  existing?: { id: string } | null;
  insertId?: string | null;
  insertError?: { message: string } | null;
} = {}) {
  const dedupMaybeSingle = vi.fn().mockResolvedValue({
    data: existing,
    error: null,
  });
  const dedupSelectEq = vi.fn(() => ({ maybeSingle: dedupMaybeSingle }));
  const dedupSelect = vi.fn(() => ({ eq: dedupSelectEq }));

  const insertSingle = vi.fn().mockResolvedValue({
    data: insertId ? { id: insertId } : null,
    error: insertError,
  });
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const insert = vi.fn(() => ({ select: insertSelect }));

  adminMock.from = vi.fn(() => ({
    select: dedupSelect,
    insert,
  }));
  return { insert };
}

describe("triageSupportMessage", () => {
  beforeEach(() => {
    mockAiCall.mockReset();
    adminMock.from = vi.fn();
  });

  it("classifies a billing message + drafts a response", async () => {
    const { insert } = setupAdmin();
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          intent: "billing",
          urgency: "high",
          sentiment: "frustrated",
          assignee_team: "billing",
          suggested_response:
            "I see you were charged twice for Pro in April. I will check on this and follow up shortly. — GrantAQ Support",
          triage_confidence: 0.9,
        })
      )
    );

    const r = await triageSupportMessage(input());
    expect(r.verdict).toBe("triaged");
    expect(r.intent).toBe("billing");
    expect(r.urgency).toBe("high");
    expect(r.assigneeTeam).toBe("billing");
    expect(r.suggestedResponse.length).toBeGreaterThan(20);
    expect(insert).toHaveBeenCalledOnce();
  });

  it("returns verdict='duplicate' when external_id already exists", async () => {
    setupAdmin({ existing: { id: "existing-1" } });
    const r = await triageSupportMessage(input());
    expect(r.verdict).toBe("duplicate");
    expect(r.ticketId).toBe("existing-1");
    expect(mockAiCall).not.toHaveBeenCalled();
  });

  it("still inserts ticket with defaults on malformed JSON", async () => {
    const { insert } = setupAdmin();
    mockAiCall.mockResolvedValueOnce(mockAiResp("not json"));
    const r = await triageSupportMessage(input());
    expect(r.intent).toBe("other");
    expect(r.urgency).toBe("normal");
    expect(r.verdict).toBe("unavailable");
    expect(insert).toHaveBeenCalledOnce();
  });

  it("still inserts ticket with defaults on AI failure", async () => {
    const { insert } = setupAdmin();
    mockAiCall.mockRejectedValueOnce(new Error("timeout"));
    const r = await triageSupportMessage(input());
    expect(r.intent).toBe("other");
    expect(r.verdict).toBe("unavailable");
    expect(insert).toHaveBeenCalledOnce();
  });

  it("normalizes unknown intent to 'other'", async () => {
    setupAdmin();
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          intent: "zoomorphic_request",
          urgency: "normal",
          sentiment: "neutral",
          assignee_team: "support",
          suggested_response: "Thanks.",
          triage_confidence: 0.4,
        })
      )
    );
    const r = await triageSupportMessage(input());
    expect(r.intent).toBe("other");
  });

  it("routes billing intent to billing team when assignee omitted", async () => {
    setupAdmin();
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          intent: "billing",
          urgency: "high",
          sentiment: "neutral",
          assignee_team: "not_a_team",
          suggested_response: "Checking on this.",
          triage_confidence: 0.7,
        })
      )
    );
    const r = await triageSupportMessage(input());
    expect(r.assigneeTeam).toBe("billing");
  });

  it("returns verdict='unavailable' when insert fails", async () => {
    setupAdmin({ insertError: { message: "db down" } });
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          intent: "billing",
          urgency: "normal",
          sentiment: "neutral",
          assignee_team: "billing",
          suggested_response: "Looking into this.",
          triage_confidence: 0.8,
        })
      )
    );
    const r = await triageSupportMessage(input());
    expect(r.verdict).toBe("unavailable");
    expect(r.ticketId).toBe(null);
  });
});
