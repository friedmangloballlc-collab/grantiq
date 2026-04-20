// grantiq/src/lib/ai/agents/sentry-triage/triager.ts
//
// Agent #10 — classifies error events and persists a triage row.
//
// Model: CLASSIFY (Haiku 4.5) — triage is pattern-recognition, not
// judgment; Sonnet/Opus is wasted cost for this workload.
//
// Fail-open: any error returns verdict='unavailable'. Errors reaching
// the triager are already errors; we do not also break the error
// pipeline when classification fails.

import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  AssigneeTeam,
  Category,
  Severity,
  TriageInput,
  TriageResult,
} from "./types";

const VALID_SEVERITIES: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "noise",
];

const VALID_CATEGORIES: Category[] = [
  "auth_failure",
  "payment_failure",
  "data_corruption",
  "third_party_outage",
  "rate_limit",
  "rls_violation",
  "ai_failure",
  "ui_crash",
  "performance",
  "unknown",
];

const VALID_TEAMS: AssigneeTeam[] = [
  "engineering",
  "billing",
  "data",
  "security",
  "none",
];

const SYSTEM_PROMPT = `You are an error-triage classifier for a SaaS
grant platform. You will receive an error event with title, message,
stack trace, and context. Classify it tightly.

SEVERITY — choose one:
- critical: user data loss, payments broken, auth broken, widespread outage
- high: specific feature broken, paid users affected, revenue-blocking
- medium: non-blocking bug, workaround exists, limited user impact
- low: cosmetic, rare, recoverable
- noise: expected error, third-party flake, user-induced, should be suppressed

CATEGORY — choose the SINGLE most specific match:
auth_failure | payment_failure | data_corruption | third_party_outage
| rate_limit | rls_violation | ai_failure | ui_crash | performance | unknown

ASSIGNEE TEAM — route to:
engineering | billing | data | security | none

Produce:
- likely_cause: 1-2 sentences — what actually failed, in plain English
- suggested_action: 1-2 sentences — what the on-call should do first
- affected_users_estimate: integer or null. Don't guess if no signal.
- triage_confidence: 0..1. Be honest — payment stack traces are easier
  than novel UI crashes.

OUTPUT (JSON only, no markdown fences):
{
  "severity": "...",
  "category": "...",
  "assignee_team": "...",
  "likely_cause": "...",
  "suggested_action": "...",
  "affected_users_estimate": 0 | null,
  "triage_confidence": 0.0..1.0
}`;

interface RawResponse {
  severity?: string;
  category?: string;
  assignee_team?: string;
  likely_cause?: string;
  suggested_action?: string;
  affected_users_estimate?: number | null;
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

function categoryToTeam(cat: Category): AssigneeTeam {
  if (cat === "payment_failure") return "billing";
  if (cat === "data_corruption" || cat === "rls_violation") return "data";
  if (cat === "auth_failure") return "security";
  return "engineering";
}

export async function triageError(input: TriageInput): Promise<TriageResult> {
  const admin = createAdminClient();
  let tokensUsed = { input: 0, output: 0, cached: 0 };

  // Dedup: if external_id already exists, don't re-triage.
  if (input.externalId) {
    const { data: existing } = await admin
      .from("error_triage_events")
      .select("id")
      .eq("external_id", input.externalId)
      .maybeSingle();
    if (existing) {
      return {
        severity: "low",
        category: "unknown",
        assigneeTeam: "none",
        likelyCause: "duplicate",
        suggestedAction: "see prior triage row",
        affectedUsersEstimate: null,
        triageConfidence: 1,
        eventId: existing.id as string,
        verdict: "duplicate",
        tokensUsed,
      };
    }
  }

  const userInput = `Triage this error event.

SOURCE: ${input.source}
TITLE: ${input.title}

ERROR MESSAGE:
${input.errorMessage ?? "(none)"}

STACK PREVIEW (first 3000 chars):
${(input.stackTrace ?? "").slice(0, 3000)}

ADDITIONAL CONTEXT:
${input.context ? JSON.stringify(input.context).slice(0, 2000) : "(none)"}`;

  let severity: Severity = "medium";
  let category: Category = "unknown";
  let assigneeTeam: AssigneeTeam = "engineering";
  let likelyCause = "";
  let suggestedAction = "";
  let affectedUsersEstimate: number | null = null;
  let triageConfidence = 0;

  try {
    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.CLASSIFY,
      systemPrompt: SYSTEM_PROMPT,
      userInput,
      promptId: "ops.sentry_triage.v1",
      orgId: input.orgId ?? "00000000-0000-0000-0000-000000000000",
      userId: input.userId ?? undefined,
      tier: input.tier,
      actionType: "audit",
      maxTokens: 800,
      temperature: 0,
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
      logger.warn("sentry_triage parse_failed", { title: input.title });
      return {
        severity,
        category,
        assigneeTeam,
        likelyCause: "Triager failed to return parseable JSON",
        suggestedAction: "Manual triage required",
        affectedUsersEstimate,
        triageConfidence: 0,
        eventId: null,
        verdict: "unavailable",
        tokensUsed,
      };
    }

    severity = normalize(parsed.severity, VALID_SEVERITIES, "medium");
    category = normalize(parsed.category, VALID_CATEGORIES, "unknown");
    assigneeTeam = normalize(
      parsed.assignee_team,
      VALID_TEAMS,
      categoryToTeam(category)
    );
    likelyCause = String(parsed.likely_cause ?? "").slice(0, 1000);
    suggestedAction = String(parsed.suggested_action ?? "").slice(0, 1000);
    affectedUsersEstimate =
      typeof parsed.affected_users_estimate === "number"
        ? parsed.affected_users_estimate
        : null;
    triageConfidence = clampConfidence(parsed.triage_confidence);
  } catch (err) {
    logger.error("sentry_triage ai_call_failed", {
      title: input.title,
      err: String(err),
    });
    return {
      severity: "medium",
      category: "unknown",
      assigneeTeam: "engineering",
      likelyCause: "Triage service unavailable",
      suggestedAction: "Manual triage required",
      affectedUsersEstimate: null,
      triageConfidence: 0,
      eventId: null,
      verdict: "unavailable",
      tokensUsed,
    };
  }

  // Persist the triage row.
  const { data: inserted, error: insertErr } = await admin
    .from("error_triage_events")
    .insert({
      external_id: input.externalId,
      source: input.source,
      severity,
      category,
      title: input.title.slice(0, 500),
      error_message: input.errorMessage,
      stack_preview: (input.stackTrace ?? "").slice(0, 4000),
      likely_cause: likelyCause,
      suggested_action: suggestedAction,
      affected_users_estimate: affectedUsersEstimate,
      assignee_team: assigneeTeam,
      status: severity === "noise" ? "suppressed" : "open",
      org_id: input.orgId,
      user_id: input.userId,
      triage_confidence: triageConfidence,
      triage_model: ANTHROPIC_MODELS.CLASSIFY,
    })
    .select("id")
    .single();

  if (insertErr) {
    logger.error("sentry_triage insert_failed", {
      title: input.title,
      err: insertErr.message,
    });
  }

  return {
    severity,
    category,
    assigneeTeam,
    likelyCause,
    suggestedAction,
    affectedUsersEstimate,
    triageConfidence,
    eventId: (inserted?.id as string | undefined) ?? null,
    verdict: "triaged",
    tokensUsed,
  };
}
