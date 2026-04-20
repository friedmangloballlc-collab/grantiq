import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/call", () => ({ aiCall: vi.fn() }));

interface SupabaseTableMock {
  upsert: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

const adminMock = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMock,
}));

import { aiCall } from "@/lib/ai/call";
import { learnFromOutcome } from "@/lib/ai/agents/outcome-learner";
import type { LearnerInput } from "@/lib/ai/agents/outcome-learner/types";

const mockAiCall = vi.mocked(aiCall);

function mockAiResp(content: string) {
  return {
    content,
    inputTokens: 2000,
    outputTokens: 500,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    costCents: 6,
    model: "claude-opus-4-20250514",
  };
}

function input(partial: Partial<LearnerInput> = {}): LearnerInput {
  return {
    pipelineId: "p1",
    orgId: "o1",
    userId: "u1",
    subscriptionTier: "pro",
    outcome: "awarded",
    funderId: "f1",
    funderName: "ABC Foundation",
    grantName: "Community Impact",
    awardAmount: 50000,
    decisionDate: "2026-04-20",
    funderFeedbackText:
      "Your proposal showed exceptional alignment with our focus areas and a rigorous evaluation plan.",
    draftSections: {
      narrative:
        "Our organization serves 1,200 youth in Newark through evidence-based afterschool programming that combines academic support with socioemotional development.".repeat(
          5
        ),
    },
    draftId: "d1",
    ...partial,
  };
}

function setupAdmin({
  historyUpsertError = null,
  learningsInsertCount = 0,
  learningsInsertError = null,
}: {
  historyUpsertError?: { message: string } | null;
  learningsInsertCount?: number;
  learningsInsertError?: { message: string } | null;
} = {}) {
  const historyUpsert = vi.fn().mockResolvedValue({ error: historyUpsertError });
  const learningsInsert = vi.fn().mockResolvedValue({
    count: learningsInsertCount,
    error: learningsInsertError,
  });
  const historyUpdateEqThen = vi.fn((cb) => cb({ error: null }));
  const historyUpdate = vi.fn(() => ({
    eq: vi.fn(() => ({
      then: historyUpdateEqThen,
    })),
  }));

  adminMock.from = vi.fn((table: string) => {
    if (table === "org_funder_history") {
      return {
        upsert: historyUpsert,
        update: historyUpdate,
      };
    }
    if (table === "funder_learnings") {
      return {
        insert: learningsInsert,
      };
    }
    return {};
  });

  return { historyUpsert, learningsInsert, historyUpdate };
}

describe("learnFromOutcome", () => {
  beforeEach(() => {
    mockAiCall.mockReset();
    adminMock.from = vi.fn();
  });

  it("inserts history row and extracts learnings on awarded + feedback", async () => {
    const { historyUpsert, learningsInsert } = setupAdmin({
      learningsInsertCount: 2,
    });
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          learnings: [
            {
              learning_type: "winning_language",
              insight: "Funder rewards specific population counts over generic claims",
              example_quote: "1,200 youth in Newark",
              confidence: 0.7,
            },
            {
              learning_type: "common_strength",
              insight: "Rigorous evaluation plan was explicitly called out",
              example_quote: "rigorous evaluation plan",
              confidence: 0.8,
            },
          ],
        })
      )
    );

    const r = await learnFromOutcome(input());
    expect(r.verdict).toBe("extracted");
    expect(r.historyInserted).toBe(true);
    expect(r.learnings).toHaveLength(2);
    expect(r.funderLearningsInserted).toBe(2);
    expect(historyUpsert).toHaveBeenCalledOnce();
    expect(learningsInsert).toHaveBeenCalledOnce();
  });

  it("returns verdict='no_signal' when withdrawn and no feedback", async () => {
    setupAdmin();
    const r = await learnFromOutcome(
      input({
        outcome: "withdrawn",
        funderFeedbackText: null,
        draftSections: null,
      })
    );
    expect(r.verdict).toBe("no_signal");
    expect(mockAiCall).not.toHaveBeenCalled();
  });

  it("returns verdict='insufficient_data' with no draft + no feedback", async () => {
    setupAdmin();
    const r = await learnFromOutcome(
      input({ funderFeedbackText: null, draftSections: null })
    );
    expect(r.verdict).toBe("insufficient_data");
    expect(mockAiCall).not.toHaveBeenCalled();
  });

  it("filters learnings below confidence 0.3", async () => {
    setupAdmin({ learningsInsertCount: 1 });
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          learnings: [
            {
              learning_type: "winning_language",
              insight: "Strong signal to keep",
              example_quote: null,
              confidence: 0.7,
            },
            {
              learning_type: "common_strength",
              insight: "Weak noise signal",
              example_quote: null,
              confidence: 0.1,
            },
          ],
        })
      )
    );
    const r = await learnFromOutcome(input());
    expect(r.learnings).toHaveLength(1);
    expect(r.learnings[0].insight).toBe("Strong signal to keep");
  });

  it("drops learnings with unknown learning_type", async () => {
    setupAdmin({ learningsInsertCount: 1 });
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          learnings: [
            {
              learning_type: "not_a_real_type",
              insight: "Should be dropped",
              example_quote: null,
              confidence: 0.9,
            },
            {
              learning_type: "winning_language",
              insight: "Should be kept despite its friend being weird",
              example_quote: null,
              confidence: 0.6,
            },
          ],
        })
      )
    );
    const r = await learnFromOutcome(input());
    expect(r.learnings).toHaveLength(1);
    expect(r.learnings[0].learning_type).toBe("winning_language");
  });

  it("clamps confidence > 1 to 1", async () => {
    setupAdmin({ learningsInsertCount: 1 });
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(
        JSON.stringify({
          learnings: [
            {
              learning_type: "winning_language",
              insight: "Out-of-range confidence",
              example_quote: null,
              confidence: 9.9,
            },
          ],
        })
      )
    );
    const r = await learnFromOutcome(input());
    expect(r.learnings[0].confidence).toBe(1);
  });

  it("returns verdict='unavailable' on AI failure but keeps history row", async () => {
    const { historyUpsert } = setupAdmin();
    mockAiCall.mockRejectedValueOnce(new Error("timeout"));
    const r = await learnFromOutcome(input());
    expect(r.verdict).toBe("unavailable");
    expect(r.historyInserted).toBe(true);
    expect(historyUpsert).toHaveBeenCalledOnce();
  });

  it("returns verdict='unavailable' on malformed JSON", async () => {
    setupAdmin();
    mockAiCall.mockResolvedValueOnce(mockAiResp("not json"));
    const r = await learnFromOutcome(input());
    expect(r.verdict).toBe("unavailable");
  });

  it("returns verdict='no_signal' when AI returns no usable learnings", async () => {
    setupAdmin();
    mockAiCall.mockResolvedValueOnce(
      mockAiResp(JSON.stringify({ learnings: [] }))
    );
    const r = await learnFromOutcome(input());
    expect(r.verdict).toBe("no_signal");
  });
});
