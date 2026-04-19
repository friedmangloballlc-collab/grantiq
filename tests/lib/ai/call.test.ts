/**
 * Tests for src/lib/ai/call.ts — focused on the BD-1 fix surface.
 *
 * BD-1 was a year-long silent failure where the ai_generations insert wrote
 * the wrong column names (`action_type`, `model`) and omitted the NOT NULL
 * `user_id`. Errors were swallowed by Promise.allSettled + a logger.error
 * with no alerting hook. These tests lock down the fix:
 *
 *  - The insert now uses `generation_type`, `model_used`, `user_id`
 *  - Missing userId is surfaced via both logger and Sentry (defensive branch)
 *  - Recording failures emit `ai_recording_failed` to logger AND Sentry
 *  - Recording errors do NOT throw to the user-facing aiCall return
 *
 * Mocks `@/lib/ai/usage` so checkUsageLimit/recordUsage don't hit the DB; we
 * only care about the ai_generations insert path here.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/ai/client", () => ({
  getOpenAIClient: () => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "ok" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      },
    },
  }),
  estimateCostCents: vi.fn().mockReturnValue(1),
  MODELS: { SCORING: "gpt-4o-mini" },
}));

vi.mock("@/lib/ai/sanitize", () => ({
  detectPromptInjection: vi.fn().mockReturnValue({ detected: false }),
  sanitizeInput: (s: string) => s,
}));

vi.mock("@/lib/ai/usage", async (importOriginal) => {
  // Preserve real types/exports (AiActionType, AI_ACTION_TYPES, UsageLimitError)
  const actual = await importOriginal<typeof import("@/lib/ai/usage")>();
  return {
    ...actual,
    checkUsageLimit: vi.fn().mockResolvedValue({
      allowed: true,
      used: 0,
      limit: null,
      remaining: null,
    }),
    recordUsage: vi.fn().mockResolvedValue(undefined),
  };
});

const sentryCaptureMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => sentryCaptureMock(...args),
}));

// --------------------------------------------------------------------------
// Import under test (after mocks)
// --------------------------------------------------------------------------
// eslint-disable-next-line import/first
import { aiCall } from "@/lib/ai/call";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const baseOpts = {
  systemPrompt: "you are a test bot",
  userInput: "hello",
  orgId: "org-test-1",
  userId: "user-test-1",
  tier: "free",
  actionType: "match" as const,
};

beforeEach(() => {
  mockFrom.mockReset();
  sentryCaptureMock.mockReset();
});

// --------------------------------------------------------------------------
// BD-1 fix: ai_generations insert uses correct columns + user_id
// --------------------------------------------------------------------------
describe("aiCall ai_generations insert (BD-1 fix)", () => {
  it("inserts with correct column names: user_id, generation_type, model_used", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await aiCall(baseOpts);

    expect(mockFrom).toHaveBeenCalledWith("ai_generations");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-test-1",
        user_id: "user-test-1",
        generation_type: "match",
        model_used: "gpt-4o-mini",
        tokens_input: 10,
        tokens_output: 5,
        estimated_cost_cents: 1,
      })
    );
  });

  it("does NOT use the legacy column names (action_type, model)", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await aiCall(baseOpts);

    const [[insertArg]] = insertMock.mock.calls;
    expect(insertArg).not.toHaveProperty("action_type");
    expect(insertArg).not.toHaveProperty("model");
  });
});

// --------------------------------------------------------------------------
// Defensive branch: missing userId surfaces to logger + Sentry
// --------------------------------------------------------------------------
describe("aiCall missing-userId defensive branch", () => {
  it("does NOT insert into ai_generations when userId is missing", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const { userId: _omit, ...optsWithoutUserId } = baseOpts;
    await aiCall(optsWithoutUserId);

    // No insert into ai_generations should have occurred — branch returned early
    const insertCalls = mockFrom.mock.calls.filter(([table]) => table === "ai_generations");
    expect(insertCalls).toHaveLength(0);
  });

  it("emits Sentry.captureException with ai_recording_failed tag when userId is missing", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const { userId: _omit, ...optsWithoutUserId } = baseOpts;
    await aiCall(optsWithoutUserId);

    expect(sentryCaptureMock).toHaveBeenCalled();
    const [, captureContext] = sentryCaptureMock.mock.calls[0];
    expect(captureContext.tags.tag).toBe("ai_recording_failed");
    expect(captureContext.tags.reason).toBe("missing_user_id");
    expect(captureContext.extra.org_id).toBe("org-test-1");
    expect(captureContext.extra.action_type).toBe("match");
  });

  it("still returns the AiCallResult successfully when userId is missing", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const { userId: _omit, ...optsWithoutUserId } = baseOpts;
    const result = await aiCall(optsWithoutUserId);

    // Recording is best-effort — user-facing path must not break
    expect(result.content).toBe("ok");
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });
});

// --------------------------------------------------------------------------
// Recording-failure observability tripwire
// --------------------------------------------------------------------------
describe("aiCall ai_generations insert failure tripwire", () => {
  it("emits Sentry.captureException with ai_recording_failed tag when insert fails", async () => {
    const dbError = { message: "constraint violation" };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: dbError }),
    });

    await aiCall(baseOpts);

    expect(sentryCaptureMock).toHaveBeenCalled();
    const [capturedError, captureContext] = sentryCaptureMock.mock.calls[0];
    expect(capturedError).toBe(dbError);
    expect(captureContext.tags.tag).toBe("ai_recording_failed");
    expect(captureContext.tags.table).toBe("ai_generations");
    expect(captureContext.extra.org_id).toBe("org-test-1");
    expect(captureContext.extra.action_type).toBe("match");
    expect(captureContext.extra.model).toBe("gpt-4o-mini");
  });

  it("returns AiCallResult successfully even when ai_generations insert fails", async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: "db down" } }),
    });

    const result = await aiCall(baseOpts);

    // Recording is best-effort — user-facing path must not break
    expect(result.content).toBe("ok");
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });
});
