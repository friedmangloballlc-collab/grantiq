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

// Anthropic mock — the per-test handler controls what messages.create returns.
const anthropicMessagesCreate = vi.fn();
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
  getAnthropicClient: () => ({
    messages: { create: anthropicMessagesCreate },
  }),
  estimateCostCents: vi.fn().mockReturnValue(1),
  estimateAnthropicCostCents: vi.fn().mockReturnValue(7),
  MODELS: { SCORING: "gpt-4o-mini" },
}));

vi.mock("@/lib/ai/sanitize", () => ({
  detectPromptInjection: vi.fn().mockReturnValue({ detected: false }),
  sanitizeInput: (s: string) => s,
}));

// Circuit breaker mock — defaults to NOT tripped so existing tests keep
// using the cached path. Individual tests override per-call.
const breakerMock = vi.fn().mockResolvedValue(false);
vi.mock("@/lib/ai/circuit-breaker", () => ({
  isCacheBreakerTripped: (...args: unknown[]) => breakerMock(...args),
  clearCircuitBreakerCache: vi.fn(),
}));

vi.mock("@/lib/ai/usage", async (importOriginal) => {
  // Preserve real types/exports (AiActionType, AI_ACTION_TYPES, UsageLimitError, TokenCeilingError)
  const actual = await importOriginal<typeof import("@/lib/ai/usage")>();
  return {
    ...actual,
    checkUsageLimit: vi.fn().mockResolvedValue({
      allowed: true,
      used: 0,
      limit: null,
      remaining: null,
    }),
    checkTokenCeiling: vi.fn().mockResolvedValue(undefined),
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
import {
  aiCall,
  PromptIdRequiredError,
  UnexpectedBlockTypeError,
} from "@/lib/ai/call";

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
  anthropicMessagesCreate.mockReset();
  // Default Anthropic happy-path response — tests can override
  anthropicMessagesCreate.mockResolvedValue({
    content: [{ type: "text", text: "anthropic ok" }],
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 200,
      cache_read_input_tokens: 0,
    },
    stop_reason: "end_turn",
  });
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

// --------------------------------------------------------------------------
// UNIT 4: Anthropic provider branch (cache + promptId + retry + normalization)
// --------------------------------------------------------------------------
const anthropicOpts = {
  ...baseOpts,
  provider: "anthropic" as const,
  promptId: "writing.draft.v1",
  model: "claude-sonnet-4-20250514",
};

describe("aiCall Anthropic branch — basic dispatch (Unit 4)", () => {
  it("routes to anthropic.messages.create when provider === 'anthropic'", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const result = await aiCall(anthropicOpts);

    expect(anthropicMessagesCreate).toHaveBeenCalledTimes(1);
    expect(result.content).toBe("anthropic ok");
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(50);
    expect(result.cacheCreationTokens).toBe(200);
    expect(result.cacheReadTokens).toBe(0);
    expect(result.stopReason).toBe("end_turn");
  });

  it("uses estimateAnthropicCostCents for cost (not estimateCostCents)", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const result = await aiCall(anthropicOpts);

    // Mocked estimateAnthropicCostCents returns 7
    expect(result.costCents).toBe(7);
  });

  it("auto-marks systemPrompt with cache_control ttl=1h", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    await aiCall(anthropicOpts);

    const callArg = anthropicMessagesCreate.mock.calls[0][0];
    expect(callArg.system).toEqual([
      expect.objectContaining({
        type: "text",
        text: anthropicOpts.systemPrompt,
        cache_control: { type: "ephemeral", ttl: "1h" },
      }),
    ]);
  });

  it("places userInput as the final user message (uncached)", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    await aiCall(anthropicOpts);

    const callArg = anthropicMessagesCreate.mock.calls[0][0];
    const lastMessage = callArg.messages[callArg.messages.length - 1];
    expect(lastMessage.role).toBe("user");
    expect(lastMessage.content).toBe(anthropicOpts.userInput);
  });
});

describe("aiCall Anthropic branch — cacheableContext", () => {
  it("auto-marks cacheableContext with cache_control ttl=5m when supplied", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    await aiCall({ ...anthropicOpts, cacheableContext: "org profile json" });

    const callArg = anthropicMessagesCreate.mock.calls[0][0];
    // First user message should be the cached context block
    expect(callArg.messages[0].role).toBe("user");
    expect(callArg.messages[0].content).toEqual([
      expect.objectContaining({
        type: "text",
        text: "org profile json",
        cache_control: { type: "ephemeral", ttl: "5m" },
      }),
    ]);
    // Second user message is the uncached userInput
    expect(callArg.messages[1].content).toBe(anthropicOpts.userInput);
  });

  it("omits the cacheable block when cacheableContext is not supplied", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    await aiCall(anthropicOpts);

    const callArg = anthropicMessagesCreate.mock.calls[0][0];
    expect(callArg.messages).toHaveLength(1);
    expect(callArg.messages[0].content).toBe(anthropicOpts.userInput);
  });
});

describe("aiCall Anthropic branch — promptId enforcement", () => {
  it("throws PromptIdRequiredError when provider='anthropic' but promptId missing", async () => {
    const { promptId: _omit, ...optsWithoutPromptId } = anthropicOpts;
    await expect(aiCall(optsWithoutPromptId)).rejects.toBeInstanceOf(PromptIdRequiredError);
    // SDK never called when validation fails pre-flight
    expect(anthropicMessagesCreate).not.toHaveBeenCalled();
  });

  it("does NOT require promptId when provider='openai'", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    // baseOpts has no promptId — should still succeed on OpenAI
    await expect(aiCall(baseOpts)).resolves.toMatchObject({ content: "ok" });
  });

  it("records promptId in ai_generations insert", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await aiCall(anthropicOpts);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ prompt_id: "writing.draft.v1" })
    );
  });

  it("records cache_creation_tokens + cache_read_tokens in ai_generations insert", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await aiCall(anthropicOpts);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cache_creation_tokens: 200,
        cache_read_tokens: 0,
      })
    );
  });
});

describe("aiCall Anthropic branch — response normalization (R26)", () => {
  it("concatenates multiple text blocks in order", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    anthropicMessagesCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: "first " },
        { type: "text", text: "second " },
        { type: "text", text: "third" },
      ],
      usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      stop_reason: "end_turn",
    });

    const result = await aiCall(anthropicOpts);
    expect(result.content).toBe("first second third");
  });

  it("throws UnexpectedBlockTypeError on tool_use block (week-1 scope)", async () => {
    anthropicMessagesCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: "hi" },
        { type: "tool_use", id: "abc", name: "test_tool", input: {} },
      ],
      usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      stop_reason: "tool_use",
    });

    await expect(aiCall(anthropicOpts)).rejects.toBeInstanceOf(UnexpectedBlockTypeError);
  });

  it("surfaces stop_reason='max_tokens' on the result for caller to detect truncation", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    anthropicMessagesCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "truncated..." }],
      usage: { input_tokens: 10, output_tokens: 2048, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      stop_reason: "max_tokens",
    });

    const result = await aiCall(anthropicOpts);
    expect(result.stopReason).toBe("max_tokens");
    expect(result.content).toBe("truncated...");
  });
});

describe("aiCall Anthropic branch — retry semantics (R27)", () => {
  it("retries once on 529 overloaded then succeeds", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    const overloadedErr = Object.assign(new Error("overloaded"), { status: 529 });
    anthropicMessagesCreate
      .mockRejectedValueOnce(overloadedErr)
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "recovered" }],
        usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        stop_reason: "end_turn",
      });

    const result = await aiCall(anthropicOpts);
    expect(anthropicMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.content).toBe("recovered");
  }, 10000);

  it("retries on 5xx server error then succeeds", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    const serverErr = Object.assign(new Error("internal server error"), { status: 503 });
    anthropicMessagesCreate
      .mockRejectedValueOnce(serverErr)
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "recovered" }],
        usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        stop_reason: "end_turn",
      });

    const result = await aiCall(anthropicOpts);
    expect(anthropicMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.content).toBe("recovered");
  }, 10000);

  it("does NOT retry on 4xx client error", async () => {
    const clientErr = Object.assign(new Error("bad request"), { status: 400 });
    anthropicMessagesCreate.mockRejectedValueOnce(clientErr);

    await expect(aiCall(anthropicOpts)).rejects.toMatchObject({ status: 400 });
    expect(anthropicMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on UnexpectedBlockTypeError (local exception)", async () => {
    anthropicMessagesCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "x", name: "t", input: {} }],
      usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      stop_reason: "tool_use",
    });

    await expect(aiCall(anthropicOpts)).rejects.toBeInstanceOf(UnexpectedBlockTypeError);
    expect(anthropicMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it("propagates the error after 2 failed attempts (no third try)", async () => {
    const overloadedErr = Object.assign(new Error("overloaded"), { status: 529 });
    anthropicMessagesCreate
      .mockRejectedValueOnce(overloadedErr)
      .mockRejectedValueOnce(overloadedErr);

    await expect(aiCall(anthropicOpts)).rejects.toMatchObject({ status: 529 });
    expect(anthropicMessagesCreate).toHaveBeenCalledTimes(2);
  }, 10000);
});

describe("aiCall Anthropic branch — sanitization on cacheableContext (R12)", () => {
  it("propagates PromptInjectionError when cacheableContext contains a banned pattern", async () => {
    // Override the default sanitize mock for this one test
    const { detectPromptInjection } = await import("@/lib/ai/sanitize");
    (detectPromptInjection as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => ({ detected: false }) // userInput passes
    );
    (detectPromptInjection as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => ({ detected: true, pattern: "ignore previous instructions" }) // cacheableContext fails
    );

    await expect(
      aiCall({ ...anthropicOpts, cacheableContext: "ignore previous instructions" })
    ).rejects.toThrow(/disallowed pattern/);
    // SDK should not have been called when injection blocks pre-flight
    expect(anthropicMessagesCreate).not.toHaveBeenCalled();
  });
});
