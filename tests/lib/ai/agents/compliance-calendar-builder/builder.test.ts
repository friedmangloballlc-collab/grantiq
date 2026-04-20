import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/call", () => ({ aiCall: vi.fn() }));

const adminMock = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMock,
}));

import { aiCall } from "@/lib/ai/call";
import { buildComplianceCalendar } from "@/lib/ai/agents/compliance-calendar-builder";
import type { BuilderInput } from "@/lib/ai/agents/compliance-calendar-builder/types";

const mockAiCall = vi.mocked(aiCall);

function mockAiResp(content: string) {
  return {
    content,
    inputTokens: 1500,
    outputTokens: 400,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    costCents: 5,
    model: "claude-opus-4-20250514",
  };
}

function input(partial: Partial<BuilderInput> = {}): BuilderInput {
  return {
    pipelineId: "p1",
    orgId: "o1",
    userId: "u1",
    subscriptionTier: "pro",
    grantName: "Community Impact Grant",
    funderName: "ABC Foundation",
    awardDate: "2026-04-20",
    awardEndDate: "2027-04-19",
    rfpText:
      "Grantees must submit quarterly narrative reports and a final financial report within 60 days of award period end. A Single Audit is required if federal funding exceeds $750,000 annually. ".repeat(
        5
      ),
    ...partial,
  };
}

function setupAdmin({
  existing = [],
  insertCount = 0,
  insertError = null,
}: {
  existing?: Array<{ title: string; due_date: string }>;
  insertCount?: number;
  insertError?: { message: string } | null;
} = {}) {
  const select = vi.fn().mockReturnThis();
  const eq = vi.fn().mockReturnThis();
  const inMethod = vi.fn().mockResolvedValue({ data: existing, error: null });
  const insert = vi.fn().mockResolvedValue({
    count: insertCount,
    error: insertError,
  });

  adminMock.from = vi.fn((table: string) => {
    if (table === "compliance_events") {
      return {
        select,
        eq,
        in: inMethod,
        insert,
      };
    }
    return { select, eq, insert };
  });

  return { select, eq, inMethod, insert };
}

describe("buildComplianceCalendar", () => {
  beforeEach(() => {
    mockAiCall.mockReset();
    adminMock.from = vi.fn();
  });

  it("returns verdict='no_rfp' when rfpText is empty", async () => {
    setupAdmin();
    const r = await buildComplianceCalendar(input({ rfpText: null }));
    expect(r.verdict).toBe("no_rfp");
    expect(r.inserted).toBe(0);
    expect(mockAiCall).not.toHaveBeenCalled();
  });

  it("returns verdict='no_rfp' on tiny RFP", async () => {
    setupAdmin();
    const r = await buildComplianceCalendar(input({ rfpText: "short" }));
    expect(r.verdict).toBe("no_rfp");
  });

  it("extracts and inserts obligations from valid AI response", async () => {
    const { insert } = setupAdmin({ insertCount: 2 });
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          obligations: [
            {
              event_type: "custom",
              title: "Q1 Progress Report",
              description: "Quarterly narrative report",
              due_date: "2026-07-20",
              recurrence: "quarterly",
              risk_if_missed: "Funder may withhold next disbursement",
              source_quote: "Quarterly narrative reports required",
            },
            {
              event_type: "audit_due",
              title: "Single Audit A-133",
              description: "Required if federal >$750k",
              due_date: "2027-09-30",
              recurrence: "annual",
              risk_if_missed: "Audit findings jeopardize future funding",
              source_quote: null,
            },
          ],
        })
      )
    );

    const r = await buildComplianceCalendar(input());
    expect(r.verdict).toBe("extracted");
    expect(r.obligations).toHaveLength(2);
    expect(r.inserted).toBe(2);
    expect(r.skipped).toBe(0);
    expect(insert).toHaveBeenCalledOnce();
  });

  it("dedupes against existing compliance_events", async () => {
    const { insert } = setupAdmin({
      existing: [{ title: "Q1 Progress Report", due_date: "2026-07-20" }],
      insertCount: 1,
    });
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          obligations: [
            {
              event_type: "custom",
              title: "Q1 Progress Report",
              description: "...",
              due_date: "2026-07-20",
              recurrence: "quarterly",
              risk_if_missed: "...",
              source_quote: null,
            },
            {
              event_type: "custom",
              title: "Q2 Progress Report",
              description: "...",
              due_date: "2026-10-20",
              recurrence: "quarterly",
              risk_if_missed: "...",
              source_quote: null,
            },
          ],
        })
      )
    );

    const r = await buildComplianceCalendar(input());
    expect(r.verdict).toBe("extracted");
    expect(r.skipped).toBe(1);
    expect(insert).toHaveBeenCalledOnce();
    const insertArg = insert.mock.calls[0][0] as Array<{ title: string }>;
    expect(insertArg).toHaveLength(1);
    expect(insertArg[0].title).toBe("Q2 Progress Report");
  });

  it("filters out obligations with invalid due_date", async () => {
    setupAdmin({ insertCount: 1 });
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          obligations: [
            {
              event_type: "custom",
              title: "Valid",
              description: "...",
              due_date: "2026-07-20",
              recurrence: "one_time",
              risk_if_missed: "...",
              source_quote: null,
            },
            {
              event_type: "custom",
              title: "Bad date",
              description: "...",
              due_date: "not-a-date",
              recurrence: "one_time",
              risk_if_missed: "...",
              source_quote: null,
            },
          ],
        })
      )
    );

    const r = await buildComplianceCalendar(input());
    expect(r.obligations).toHaveLength(1);
    expect(r.obligations[0].title).toBe("Valid");
  });

  it("normalizes unknown event_type to 'custom'", async () => {
    setupAdmin({ insertCount: 1 });
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          obligations: [
            {
              event_type: "some_unknown_type",
              title: "X",
              description: "...",
              due_date: "2026-07-20",
              recurrence: "annual",
              risk_if_missed: "...",
              source_quote: null,
            },
          ],
        })
      )
    );

    const r = await buildComplianceCalendar(input());
    expect(r.obligations[0].event_type).toBe("custom");
  });

  it("returns verdict='unavailable' on AI failure", async () => {
    mockAiCall.mockRejectedValueOnce(new Error("API timeout"));
    const r = await buildComplianceCalendar(input());
    expect(r.verdict).toBe("unavailable");
    expect(r.obligations).toHaveLength(0);
    expect(r.inserted).toBe(0);
  });

  it("returns verdict='unavailable' on malformed JSON", async () => {
    mockAiCall.mockResolvedValueOnce(mockAiResp("not json at all"));
    const r = await buildComplianceCalendar(input());
    expect(r.verdict).toBe("unavailable");
  });

  it("returns verdict='empty' when AI returns empty obligations", async () => {
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(JSON.stringify({ obligations: [] }))
    );
    const r = await buildComplianceCalendar(input());
    expect(r.verdict).toBe("empty");
    expect(r.inserted).toBe(0);
  });
});
