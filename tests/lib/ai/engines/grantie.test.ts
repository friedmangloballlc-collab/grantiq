import { describe, it, expect, vi } from "vitest";
import { chatWithGrantie, buildGrantieContext } from "@/lib/ai/engines/grantie";
import { GrantieChatOutputSchema } from "@/lib/ai/schemas/chat";

vi.mock("@/lib/ai/call", () => ({
  aiCall: vi.fn().mockResolvedValue({
    content: JSON.stringify({
      response: "The Ford Foundation Youth Education Initiative is one of your strongest matches at 78/100. Here's why it stands out:\n\nYour 12 years of youth education programming in Atlanta aligns directly with their Southeast education focus. The $25K-$100K range is right in your sweet spot — about 10-20% of your annual budget.\n\nThe deadline is June 15, so you have about 11 weeks. I'd suggest starting with the narrative sections since you'll want to develop a logic model for your after-school program.",
      suggested_actions: [
        {
          action_type: "add_to_pipeline",
          label: "Add to Pipeline",
          payload: { grant_id: "grant-001" },
        },
        {
          action_type: "set_reminder",
          label: "Set Deadline Reminder",
          payload: { grant_id: "grant-001", date: "2026-06-01" },
        },
      ],
      follow_up_prompts: [
        "What do I need to prepare for this application?",
        "Are there similar grants I should also consider?",
        "How does this grant fit into my overall funding strategy?",
      ],
      sources_referenced: ["Ford Foundation Youth Education Initiative (Match: 78/100)"],
    }),
    inputTokens: 2000,
    outputTokens: 400,
    costCents: 5,
    model: "claude-sonnet-4-20250514",
  }),
}));

describe("buildGrantieContext", () => {
  it("includes page context and org summary", () => {
    const ctx = buildGrantieContext({
      currentPage: "grant_detail",
      pageData: { grant_id: "grant-001", grant_name: "Youth Education Initiative" },
      orgSummary: {
        name: "Atlanta Youth Foundation",
        readiness_score: 67,
        pipeline_count: 3,
        top_match_score: 78,
      },
      recentMatches: [
        { grant_name: "Youth Education Initiative", match_score: 78, funder_name: "Ford Foundation" },
      ],
      pipelineSummary: [
        { grant_name: "State Arts Grant", stage: "writing", deadline: "2026-04-30" },
      ],
    });

    expect(ctx).toContain("grant_detail");
    expect(ctx).toContain("Atlanta Youth Foundation");
    expect(ctx).toContain("Youth Education Initiative");
  });
});

describe("chatWithGrantie", () => {
  it("returns Zod-validated chat response", async () => {
    const result = await chatWithGrantie(
      { orgId: "org-123", userId: "user-456", tier: "pro" },
      "Tell me about the Ford Foundation grant",
      {
        currentPage: "grant_detail",
        pageData: { grant_id: "grant-001" },
        orgSummary: { name: "Atlanta Youth Foundation", readiness_score: 67, pipeline_count: 3, top_match_score: 78 },
        recentMatches: [],
        pipelineSummary: [],
      },
      [] // no conversation history
    );

    const parsed = GrantieChatOutputSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.response).toContain("Ford Foundation");
    expect(result.suggested_actions).toBeDefined();
    expect(result.follow_up_prompts?.length).toBeLessThanOrEqual(3);
  });
});
