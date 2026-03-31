import { aiCall } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/client";
import { GrantieChatOutputSchema, type GrantieChatOutput } from "@/lib/ai/schemas/chat";
import { GRANTIE_SYSTEM_PROMPT } from "@/lib/ai/prompts/grantie-system";

function classifyQueryComplexity(message: string): "simple" | "complex" {
  const simplePatterns = [
    /what('s| is) my (readiness|score|pipeline|status)/i,
    /when is .* deadline/i,
    /how many (grants|matches|applications)/i,
    /show me .* (matches|grants|pipeline)/i,
    /what documents? do I (need|have|missing)/i,
    /what('s| is) my (budget|revenue|org type)/i,
  ];
  if (simplePatterns.some((p) => p.test(message))) return "simple";
  if (
    message.length < 50 &&
    !message.includes("why") &&
    !message.includes("should") &&
    !message.includes("how")
  )
    return "simple";
  return "complex";
}

interface GrantieContext {
  currentPage: string;
  pageData: Record<string, unknown>;
  orgSummary: {
    name: string;
    readiness_score: number | null;
    pipeline_count: number;
    top_match_score: number | null;
  };
  recentMatches: Array<{
    grant_name: string;
    match_score: number;
    funder_name: string;
  }>;
  pipelineSummary: Array<{
    grant_name: string;
    stage: string;
    deadline: string | null;
  }>;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface CallContext {
  orgId: string;
  userId: string;
  tier: string;
}

export function buildGrantieContext(ctx: GrantieContext): string {
  const matchesList =
    ctx.recentMatches.length > 0
      ? ctx.recentMatches
          .map((m) => `- ${m.grant_name} (${m.funder_name}) — Match: ${m.match_score}/100`)
          .join("\n")
      : "No recent matches.";

  const pipelineList =
    ctx.pipelineSummary.length > 0
      ? ctx.pipelineSummary
          .map(
            (p) =>
              `- ${p.grant_name} — Stage: ${p.stage}${p.deadline ? `, Deadline: ${p.deadline}` : ""}`
          )
          .join("\n")
      : "Pipeline is empty.";

  return `## CONTEXT

### Current Page: ${ctx.currentPage}
${ctx.pageData ? `Page Data: ${JSON.stringify(ctx.pageData)}` : ""}

### Organization
Name: ${ctx.orgSummary.name}
Readiness Score: ${ctx.orgSummary.readiness_score ?? "Not assessed"}
Pipeline Count: ${ctx.orgSummary.pipeline_count}
Top Match Score: ${ctx.orgSummary.top_match_score ?? "No matches yet"}

### Recent Top Matches
${matchesList}

### Pipeline
${pipelineList}`;
}

/**
 * Grantie AI Advisor: Context-aware persistent chat.
 *
 * Takes current page context + org profile + pipeline and answers questions.
 * Supports multi-turn conversation via conversation history.
 *
 * Cost: ~$0.05 per message
 * Model: Claude Sonnet
 */
export async function chatWithGrantie(
  callCtx: CallContext,
  userMessage: string,
  grantieCtx: GrantieContext,
  conversationHistory: ConversationMessage[]
): Promise<GrantieChatOutput> {
  const contextBlock = buildGrantieContext(grantieCtx);

  // Build full message with context + conversation history
  const historySection =
    conversationHistory.length > 0
      ? "\n\n## CONVERSATION HISTORY\n" +
        conversationHistory
          .slice(-10) // keep last 10 turns for context window management
          .map((m) => `${m.role === "user" ? "User" : "Grantie"}: ${m.content}`)
          .join("\n\n")
      : "";

  const fullMessage = `${contextBlock}${historySection}

## USER MESSAGE
${userMessage}

---

Respond as Grantie. Return ONLY valid JSON.`;

  const complexity = classifyQueryComplexity(userMessage);
  const model = complexity === "simple" ? MODELS.CLASSIFY : MODELS.SCORING;

  const response = await aiCall({
    orgId: callCtx.orgId,
    userId: callCtx.userId,
    actionType: "chat",
    tier: callCtx.tier,
    model,
    systemPrompt: GRANTIE_SYSTEM_PROMPT,
    userInput: fullMessage,
    maxTokens: 2048,
    temperature: 0.5,
  });

  try {
    const raw = JSON.parse(response.content);
    return GrantieChatOutputSchema.parse(raw);
  } catch (err) {
    // If JSON parsing fails, wrap the raw text as a simple response
    console.error("Grantie response parsing failed, returning raw:", err);
    return {
      response: response.content,
      suggested_actions: [],
      follow_up_prompts: [],
      sources_referenced: [],
    };
  }
}
