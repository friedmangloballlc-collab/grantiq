// grantiq/src/lib/ai/agents/support-triage/triager.ts
//
// Agent #12 — classifies a support message + drafts a first response.
//
// Model: CLASSIFY (Haiku 4.5) — support triage is high-volume,
// pattern-recognition work. The suggested response is a draft, not
// the final reply; humans edit before sending.
//
// Fail-open: errors return verdict='unavailable'. We still insert a
// minimally-classified ticket row so the message doesn't get lost.

import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  Intent,
  Sentiment,
  SupportTeam,
  SupportTriageInput,
  SupportTriageResult,
  Urgency,
} from "./types";

const VALID_INTENTS: Intent[] = [
  "billing",
  "bug_report",
  "feature_request",
  "onboarding",
  "refund",
  "cancellation",
  "account_access",
  "grant_question",
  "compliment",
  "other",
];

const VALID_URGENCY: Urgency[] = ["urgent", "high", "normal", "low"];
const VALID_SENTIMENT: Sentiment[] = ["angry", "frustrated", "neutral", "happy"];
const VALID_TEAMS: SupportTeam[] = [
  "support",
  "billing",
  "engineering",
  "success",
  "none",
];

const SYSTEM_PROMPT = `You are a support triage classifier for a SaaS
grant platform (GrantIQ). You receive an inbound support message
(email, Intercom, in-app form) and classify it + draft a first
response for the human agent to edit.

INTENT — one of:
billing | bug_report | feature_request | onboarding | refund
| cancellation | account_access | grant_question | compliment | other

URGENCY — one of:
- urgent: revenue-blocking, paid user can't work, threat of churn
- high: paid user workflow blocked, non-trivial impact
- normal: reasonable question, standard SLA
- low: nice-to-have, cosmetic, general feedback

SENTIMENT — one of: angry | frustrated | neutral | happy

ASSIGNEE_TEAM — one of: support | billing | engineering | success | none

SUGGESTED_RESPONSE — draft 3-6 sentences. Rules:
- Start with specific acknowledgment of what they're asking, not "Thanks for reaching out"
- If it's a bug, confirm you're looking into it and ask for reproduction steps
- If it's billing, explain next steps concretely (credit, refund, etc.)
- If it's a cancellation, express empathy and offer a specific alternative
- If compliment, thank with specificity tied to what they said
- Never promise a refund/credit/fix in the draft — say "I'll check on this and follow up"
- Sign off with "— GrantIQ Support"

TRIAGE_CONFIDENCE — 0..1. Lower for ambiguous/mixed-intent messages.

OUTPUT (JSON only, no markdown fences):
{
  "intent": "...",
  "urgency": "...",
  "sentiment": "...",
  "assignee_team": "...",
  "suggested_response": "...",
  "triage_confidence": 0.0..1.0
}`;

interface RawResponse {
  intent?: string;
  urgency?: string;
  sentiment?: string;
  assignee_team?: string;
  suggested_response?: string;
  triage_confidence?: number;
}

function normalize<T extends string>(raw: unknown, valid: T[], fallback: T): T {
  if (typeof raw === "string" && valid.includes(raw as T)) return raw as T;
  return fallback;
}

function clampConfidence(c: unknown): number {
  const n = typeof c === "number" ? c : 0;
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function intentToTeam(intent: Intent): SupportTeam {
  if (intent === "billing" || intent === "refund") return "billing";
  if (intent === "bug_report" || intent === "account_access") return "engineering";
  if (intent === "onboarding") return "success";
  return "support";
}

export async function triageSupportMessage(
  input: SupportTriageInput
): Promise<SupportTriageResult> {
  const admin = createAdminClient();
  let tokensUsed = { input: 0, output: 0, cached: 0 };

  // Dedup on external_id
  if (input.externalId) {
    const { data: existing } = await admin
      .from("support_tickets")
      .select("id")
      .eq("external_id", input.externalId)
      .maybeSingle();
    if (existing) {
      return {
        intent: "other",
        urgency: "normal",
        sentiment: "neutral",
        assigneeTeam: "none",
        suggestedResponse: "",
        triageConfidence: 1,
        ticketId: existing.id as string,
        verdict: "duplicate",
        tokensUsed,
      };
    }
  }

  const userInput = `Triage this support message.

CHANNEL: ${input.channel}
FROM: ${input.senderName ?? "(unknown)"} <${input.senderEmail ?? "unknown@unknown"}>
SUBJECT: ${input.subject ?? "(no subject)"}

MESSAGE BODY:
${input.body.slice(0, 6000)}`;

  let intent: Intent = "other";
  let urgency: Urgency = "normal";
  let sentiment: Sentiment = "neutral";
  let assigneeTeam: SupportTeam = "support";
  let suggestedResponse = "";
  let triageConfidence = 0;

  try {
    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.CLASSIFY,
      systemPrompt: SYSTEM_PROMPT,
      userInput,
      promptId: "ops.support_triage.v1",
      orgId: input.orgId ?? "00000000-0000-0000-0000-000000000000",
      userId: input.userId ?? undefined,
      tier: input.tier,
      actionType: "audit",
      maxTokens: 1500,
      temperature: 0.2,
    });

    tokensUsed = {
      input: response.inputTokens,
      output: response.outputTokens,
      cached: response.cacheReadTokens ?? 0,
    };

    let parsed: RawResponse;
    try {
      parsed = JSON.parse(response.content) as RawResponse;
    } catch {
      logger.warn("support_triage parse_failed", { subject: input.subject });
      // Fall through to minimal-insert path so we don't lose the ticket.
      parsed = {};
    }

    intent = normalize(parsed.intent, VALID_INTENTS, "other");
    urgency = normalize(parsed.urgency, VALID_URGENCY, "normal");
    sentiment = normalize(parsed.sentiment, VALID_SENTIMENT, "neutral");
    assigneeTeam = normalize(
      parsed.assignee_team,
      VALID_TEAMS,
      intentToTeam(intent)
    );
    suggestedResponse = String(parsed.suggested_response ?? "").slice(0, 3000);
    triageConfidence = clampConfidence(parsed.triage_confidence);
  } catch (err) {
    logger.error("support_triage ai_call_failed", {
      subject: input.subject,
      err: String(err),
    });
    // Fall through — still insert a minimally-classified ticket.
  }

  const { data: inserted, error: insertErr } = await admin
    .from("support_tickets")
    .insert({
      external_id: input.externalId,
      channel: input.channel,
      sender_email: input.senderEmail,
      sender_name: input.senderName,
      subject: input.subject,
      body: input.body,
      intent,
      urgency,
      sentiment,
      suggested_response: suggestedResponse || null,
      assignee_team: assigneeTeam,
      status: "open",
      org_id: input.orgId,
      user_id: input.userId,
      triage_confidence: triageConfidence,
      triage_model: ANTHROPIC_MODELS.CLASSIFY,
    })
    .select("id")
    .single();

  if (insertErr) {
    logger.error("support_triage insert_failed", {
      subject: input.subject,
      err: insertErr.message,
    });
    return {
      intent,
      urgency,
      sentiment,
      assigneeTeam,
      suggestedResponse,
      triageConfidence,
      ticketId: null,
      verdict: "unavailable",
      tokensUsed,
    };
  }

  return {
    intent,
    urgency,
    sentiment,
    assigneeTeam,
    suggestedResponse,
    triageConfidence,
    ticketId: (inserted?.id as string | undefined) ?? null,
    verdict: triageConfidence > 0 ? "triaged" : "unavailable",
    tokensUsed,
  };
}
