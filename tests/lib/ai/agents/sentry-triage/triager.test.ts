import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/call", () => ({ aiCall: vi.fn() }));

const adminMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMock,
}));

import { aiCall } from "@/lib/ai/call";
import { triageError } from "@/lib/ai/agents/sentry-triage";
import type { TriageInput } from "@/lib/ai/agents/sentry-triage/types";

const mockAiCall = vi.mocked(aiCall);

function mockAiResp(content: string) {
  return {
    content,
    inputTokens: 800,
    outputTokens: 200,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    costCents: 1,
    model: "claude-haiku-4-5-20251001",
  };
}

function input(partial: Partial<TriageInput> = {}): TriageInput {
  return {
    source: "sentry",
    externalId: "SENTRY-123",
    title: "TypeError: Cannot read property 'x' of undefined",
    errorMessage: "Cannot read property 'x' of undefined",
    stackTrace: "at Object.foo (src/lib/foo.ts:10:5)",
    orgId: null,
    userId: null,
    tier: "internal",
    ...partial,
  };
}

function setupAdmin({
  existing = null,
  insertId = "event-1",
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

  return { insert, dedupSelect };
}

describe("triageError", () => {
  beforeEach(() => {
    mockAiCall.mockReset();
    adminMock.from = vi.fn();
  });

  it("classifies and persists a new event", async () => {
    const { insert } = setupAdmin();
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          severity: "high",
          category: "ai_failure",
          assignee_team: "engineering",
          likely_cause: "LLM returned malformed JSON",
          suggested_action: "Add fallback parser",
          affected_users_estimate: 3,
          triage_confidence: 0.8,
        })
      )
    );
    const r = await triageError(input());
    expect(r.verdict).toBe("triaged");
    expect(r.severity).toBe("high");
    expect(r.category).toBe("ai_failure");
    expect(r.assigneeTeam).toBe("engineering");
    expect(r.triageConfidence).toBe(0.8);
    expect(insert).toHaveBeenCalledOnce();
  });

  it("returns verdict='duplicate' when external_id already exists", async () => {
    setupAdmin({ existing: { id: "existing-1" } });
    const r = await triageError(input());
    expect(r.verdict).toBe("duplicate");
    expect(r.eventId).toBe("existing-1");
    expect(mockAiCall).not.toHaveBeenCalled();
  });

  it("normalizes unknown severity to 'medium'", async () => {
    setupAdmin();
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          severity: "catastrophic",
          category: "unknown",
          assignee_team: "engineering",
          likely_cause: "x",
          suggested_action: "y",
          affected_users_estimate: null,
          triage_confidence: 0.5,
        })
      )
    );
    const r = await triageError(input());
    expect(r.severity).toBe("medium");
  });

  it("auto-suppresses noise-severity events", async () => {
    const { insert } = setupAdmin();
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          severity: "noise",
          category: "rate_limit",
          assignee_team: "none",
          likely_cause: "expected 429",
          suggested_action: "ignore",
          affected_users_estimate: null,
          triage_confidence: 0.95,
        })
      )
    );
    await triageError(input());
    const insertArg = insert.mock.calls[0][0] as { status: string };
    expect(insertArg.status).toBe("suppressed");
  });

  it("returns verdict='unavailable' on AI failure", async () => {
    setupAdmin();
    mockAiCall.mockRejectedValueOnce(new Error("timeout"));
    const r = await triageError(input());
    expect(r.verdict).toBe("unavailable");
    expect(r.triageConfidence).toBe(0);
  });

  it("returns verdict='unavailable' on malformed JSON", async () => {
    setupAdmin();
    mockAiCall.mockResolvedValueOnce(mockAiResp("not json"));
    const r = await triageError(input());
    expect(r.verdict).toBe("unavailable");
  });
});
