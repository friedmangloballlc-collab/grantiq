// grantiq/src/lib/ai/agents/compliance-calendar-builder/builder.ts
//
// Agent #4 — Compliance Calendar Builder.
//
// Trigger: pipeline stage transitions to 'awarded'.
// Job: extract every compliance obligation from the RFP + award info
// (interim reports, final report, audit, performance reviews, COI,
// insurance, etc.) and insert rows into compliance_events so the org
// never misses a deadline that would jeopardize the grant.
//
// Design decisions:
// - Single Opus call (STRATEGY model) — obligations are sparse but
//   judgment-heavy; Sonnet misses implicit deadlines.
// - Fail-open: errors → verdict='unavailable', pipeline transition
//   still succeeds. Missing a compliance event is never worth
//   blocking an award.
// - Dedup against existing compliance_events before insert so moving
//   the same grant awarded→declined→awarded doesn't double-populate.
// - No cacheable context — this fires once per award, not per-section.

import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  BuilderInput,
  BuilderResult,
  ComplianceEventType,
  ExtractedObligation,
  RecurrencePattern,
} from "./types";

const VALID_EVENT_TYPES: ComplianceEventType[] = [
  "sam_renewal",
  "990_filing",
  "state_annual_report",
  "insurance_renewal",
  "charitable_registration",
  "good_standing",
  "ein_verification",
  "audit_due",
  "board_meeting",
  "coi_renewal",
  "uei_renewal",
  "custom",
];

const VALID_RECURRENCE: RecurrencePattern[] = [
  "annual",
  "quarterly",
  "monthly",
  "one_time",
];

const SYSTEM_PROMPT = `You are a grant compliance officer. Your job is to
extract every GRANT-SPECIFIC compliance obligation from an RFP / award
document so the grantee never misses a deadline.

WHAT TO EXTRACT (grant-specific):
- Interim progress reports (quarterly, semi-annual, mid-term)
- Final narrative + financial reports
- Audit requirements (A-133 / Single Audit threshold, annual audit)
- Performance review / site visit dates
- Matching-funds documentation deadlines
- Budget modification / no-cost extension request deadlines
- Grant-specific insurance or COI renewal tied to the award period
- Board reporting or resolutions required by the funder
- Close-out reports

WHAT TO SKIP:
- Generic org-level obligations (990 filing, state annual report) unless
  the RFP specifically requires proof of filing
- Items that are not deadlines (e.g., "maintain records" without a date)
- Activities WITHIN the grant (program milestones) — those belong in a
  work plan, not a compliance calendar

FOR EACH OBLIGATION, COMPUTE due_date:
- If the source gives an explicit date, use it.
- If it gives a relative anchor ("90 days after award", "within 60 days
  of period end"), compute from award_date or award_end_date provided.
- If the date is genuinely ambiguous, skip it — don't invent dates.

CHOOSE event_type from: sam_renewal | 990_filing | state_annual_report
| insurance_renewal | charitable_registration | good_standing
| ein_verification | audit_due | board_meeting | coi_renewal
| uei_renewal | custom

Most grant-specific reports are event_type='custom'.

CHOOSE recurrence from: annual | quarterly | monthly | one_time

OUTPUT (JSON only, no markdown fences):
{
  "obligations": [
    {
      "event_type": "audit_due" | "custom" | ...,
      "title": "<short noun phrase>",
      "description": "<1-2 sentence summary of what's due and to whom>",
      "due_date": "YYYY-MM-DD",
      "recurrence": "annual" | "quarterly" | "monthly" | "one_time",
      "risk_if_missed": "<what happens if the grantee misses this>",
      "source_quote": "<verbatim passage from the RFP>" | null
    }
  ]
}

Stay tight. Target 3-10 obligations per grant. Don't invent deadlines
that aren't in the source.`;

interface RawResponse {
  obligations?: Array<{
    event_type?: string;
    title?: string;
    description?: string;
    due_date?: string;
    recurrence?: string;
    risk_if_missed?: string;
    source_quote?: string | null;
  }>;
}

function normalizeEventType(t: string | undefined): ComplianceEventType {
  if (t && VALID_EVENT_TYPES.includes(t as ComplianceEventType)) {
    return t as ComplianceEventType;
  }
  return "custom";
}

function normalizeRecurrence(r: string | undefined): RecurrencePattern {
  if (r && VALID_RECURRENCE.includes(r as RecurrencePattern)) {
    return r as RecurrencePattern;
  }
  return "one_time";
}

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime());
}

/**
 * Extract obligations via Opus, dedup against existing compliance_events
 * for this org, then insert the new rows. Returns a BuilderResult
 * suitable for logging. Never throws — errors surface as verdict.
 */
export async function buildComplianceCalendar(
  input: BuilderInput
): Promise<BuilderResult> {
  const admin = createAdminClient();

  // No RFP = nothing to extract. Exit early to save a $0.03 call.
  if (!input.rfpText || input.rfpText.trim().length < 200) {
    return {
      obligations: [],
      inserted: 0,
      skipped: 0,
      verdict: "no_rfp",
      tokensUsed: { input: 0, output: 0, cached: 0 },
    };
  }

  const userInput = `Extract all compliance obligations for this awarded grant.

GRANT: ${input.grantName}
FUNDER: ${input.funderName}
AWARD DATE: ${input.awardDate}
${input.awardEndDate ? `AWARD PERIOD END: ${input.awardEndDate}` : ""}

RFP / AWARD TEXT:
${input.rfpText}`;

  let obligations: ExtractedObligation[] = [];
  let tokensUsed = { input: 0, output: 0, cached: 0 };

  try {
    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.STRATEGY,
      systemPrompt: SYSTEM_PROMPT,
      userInput,
      promptId: "compliance.calendar_builder.v1",
      sessionId: input.pipelineId,
      orgId: input.orgId,
      userId: input.userId,
      tier: input.subscriptionTier,
      actionType: "audit",
      maxTokens: 3000,
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
      logger.warn("compliance.calendar_builder parse_failed", {
        pipelineId: input.pipelineId,
      });
      return {
        obligations: [],
        inserted: 0,
        skipped: 0,
        verdict: "unavailable",
        tokensUsed,
      };
    }

    const raw = Array.isArray(parsed.obligations) ? parsed.obligations : [];
    obligations = raw
      .filter((o): o is NonNullable<typeof o> =>
        Boolean(
          o &&
            typeof o.title === "string" &&
            typeof o.due_date === "string" &&
            isValidIsoDate(o.due_date)
        )
      )
      .map((o) => ({
        event_type: normalizeEventType(o.event_type),
        title: String(o.title ?? "").slice(0, 200),
        description: String(o.description ?? ""),
        due_date: String(o.due_date),
        recurrence: normalizeRecurrence(o.recurrence),
        risk_if_missed: String(o.risk_if_missed ?? ""),
        source_quote:
          typeof o.source_quote === "string" ? o.source_quote : null,
      }));
  } catch (err) {
    logger.error("compliance.calendar_builder ai_call_failed", {
      pipelineId: input.pipelineId,
      err: String(err),
    });
    return {
      obligations: [],
      inserted: 0,
      skipped: 0,
      verdict: "unavailable",
      tokensUsed,
    };
  }

  if (obligations.length === 0) {
    return {
      obligations: [],
      inserted: 0,
      skipped: 0,
      verdict: "empty",
      tokensUsed,
    };
  }

  // Dedup: pull any existing compliance_events rows that would collide
  // on (org_id, title, due_date). Extractions can re-run if the pipeline
  // stage flips back to 'awarded' after correction.
  const titles = obligations.map((o) => o.title);
  const { data: existing } = await admin
    .from("compliance_events")
    .select("title, due_date")
    .eq("org_id", input.orgId)
    .in("title", titles);

  const existingKeys = new Set(
    (existing ?? []).map((r: { title: string; due_date: string }) =>
      `${r.title}::${r.due_date}`
    )
  );

  const rowsToInsert = obligations
    .filter((o) => !existingKeys.has(`${o.title}::${o.due_date}`))
    .map((o) => ({
      org_id: input.orgId,
      event_type: o.event_type,
      title: o.title,
      description: o.source_quote
        ? `${o.description}\n\nSource: "${o.source_quote}"`
        : o.description,
      due_date: o.due_date,
      recurrence: o.recurrence,
      risk_if_missed: o.risk_if_missed || null,
      auto_generated: true,
    }));

  let inserted = 0;
  if (rowsToInsert.length > 0) {
    const { error: insertErr, count } = await admin
      .from("compliance_events")
      .insert(rowsToInsert, { count: "exact" });

    if (insertErr) {
      logger.error("compliance.calendar_builder insert_failed", {
        pipelineId: input.pipelineId,
        err: insertErr.message,
      });
    } else {
      inserted = count ?? rowsToInsert.length;
    }
  }

  return {
    obligations,
    inserted,
    skipped: obligations.length - rowsToInsert.length,
    verdict: "extracted",
    tokensUsed,
  };
}
