// grantiq/src/lib/ai/agents/hallucination-auditor/auditor.ts
//
// Agent #1 from the roadmap. After each draft section generates,
// extract every factual claim and verify each against the source
// RFP + funder context block (from 990 data) + org profile.
// Ungrounded claims = hallucinations.
//
// Design decisions locked in docs/plans/2026-04-20-002:
// - Single-call: extraction + verdict in one JSON response (halves cost)
// - Model: Opus (STRATEGY) — judgment-heavy; Sonnet is too lossy
// - Prompt-cached system + sources block — sections 2..N ride the cache
// - Fail-open: audit errors → verdict='unaudited', draft ships anyway

import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";
import type { AuditInput, AuditResult, Claim, Verdict } from "./types";

const SYSTEM_PROMPT = `You are a grant-writing fact auditor. Your job is to find
HALLUCINATIONS in AI-generated grant sections — claims that sound true but aren't
supported by the source material.

Process each section in TWO stages within a single response:

STAGE 1 — EXTRACT every factual claim. A factual claim is a statement that asserts:
- A specific number, percentage, statistic, or dollar amount
- A specific date, timeline, or duration
- A specific population count served
- A program detail (activity, method, scope) not just rhetoric
- A funder priority or evaluation criterion
- An organizational capability, history, or track record
EXCLUDE: transition sentences, pure rhetoric ("we are committed to"), general
aspirational language, and paraphrased funder mission statements.

STAGE 2 — For each claim, mark it GROUNDED or UNGROUNDED:
- GROUNDED: The claim can be traced to the RFP, funder context, or org profile.
  Match semantically, not lexically — paraphrase is fine as long as the
  substance comes from a source.
- UNGROUNDED: The claim introduces specifics not present in any source.

For UNGROUNDED claims, additionally tag is_hard_fact=true when the invented
detail is a specific number, date, population count, funder priority, or
org capability. Tag is_hard_fact=false for softer claims (general mission
language, plausible paraphrase the source didn't actually say).

OUTPUT (JSON only, no markdown fences):
{
  "claims": [
    {
      "claim_text": "<verbatim from section>",
      "status": "grounded" | "ungrounded",
      "source_quote": "<verbatim supporting passage>" | null,
      "missing_source": "<what the AI invented>" | null,
      "is_hard_fact": true | false
    }
  ]
}

For GROUNDED: source_quote non-null, missing_source null.
For UNGROUNDED: source_quote null, missing_source non-null.

Stay tight. Target 8-15 claims per section. Don't be pedantic — aspirational
rhetoric isn't a factual claim.`;

function buildCacheableContext(input: AuditInput): string {
  // This block is identical across all sections of one draft, so prompt
  // caching hits on sections 2..N.
  const parts: string[] = [];
  parts.push("=== SOURCE RFP ===");
  parts.push(input.rfpText);
  parts.push("");

  if (input.funderContextBlock) {
    parts.push(input.funderContextBlock);
    parts.push("");
  }

  parts.push("=== ORG PROFILE ===");
  parts.push(`Name: ${input.orgProfile.name}`);
  parts.push(`Mission: ${input.orgProfile.mission_statement}`);
  if (input.orgProfile.program_areas.length > 0) {
    parts.push(`Program areas: ${input.orgProfile.program_areas.join(", ")}`);
  }
  if (input.orgProfile.population_served.length > 0) {
    parts.push(`Populations served: ${input.orgProfile.population_served.join(", ")}`);
  }
  return parts.join("\n");
}

function classifyVerdict(claims: Claim[]): Verdict {
  const ungrounded = claims.filter((c) => c.status === "ungrounded");
  if (ungrounded.length === 0) return "clean";

  const hardUngrounded = ungrounded.filter((c) => c.is_hard_fact);
  if (hardUngrounded.length >= 1 || ungrounded.length >= 3) return "blocked";
  return "flagged";
}

interface RawResponse {
  claims?: Array<{
    claim_text?: string;
    status?: string;
    source_quote?: string | null;
    missing_source?: string | null;
    is_hard_fact?: boolean;
  }>;
}

/**
 * Run the audit. On any error, returns verdict='unaudited' with empty
 * claims — caller's pipeline proceeds (fail-open invariant). UI shows
 * gray "audit unavailable" badge.
 */
export async function auditSection(input: AuditInput): Promise<AuditResult> {
  const cacheableContext = buildCacheableContext(input);
  const userInput = `Audit this grant section for hallucinations:

SECTION NAME: ${input.sectionName}

SECTION TEXT:
${input.sectionText}`;

  try {
    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.STRATEGY,
      systemPrompt: SYSTEM_PROMPT,
      cacheableContext,
      userInput,
      promptId: "writing.hallucination_audit.v1",
      sessionId: input.context.draft_id,
      orgId: input.context.org_id,
      userId: input.context.user_id,
      tier: input.context.subscription_tier,
      actionType: "audit",
      maxTokens: 4096,
      temperature: 0,
    });

    let parsed: RawResponse;
    try {
      parsed = JSON.parse(response.content) as RawResponse;
    } catch {
      return {
        claimsTotal: 0,
        claimsGrounded: 0,
        claimsUngrounded: 0,
        verdict: "unaudited",
        claimsDetail: [],
        tokensUsed: {
          input: response.inputTokens,
          output: response.outputTokens,
          cached: response.cacheReadTokens ?? 0,
        },
      };
    }

    const rawClaims = Array.isArray(parsed.claims) ? parsed.claims : [];
    const claims: Claim[] = rawClaims
      .filter((c): c is NonNullable<typeof c> => Boolean(c && typeof c.claim_text === "string"))
      .map((c) => ({
        claim_text: String(c.claim_text ?? ""),
        status: c.status === "ungrounded" ? "ungrounded" : "grounded",
        source_quote: typeof c.source_quote === "string" ? c.source_quote : null,
        missing_source: typeof c.missing_source === "string" ? c.missing_source : null,
        is_hard_fact: c.is_hard_fact === true,
      }));

    const grounded = claims.filter((c) => c.status === "grounded").length;
    const ungrounded = claims.filter((c) => c.status === "ungrounded").length;

    return {
      claimsTotal: claims.length,
      claimsGrounded: grounded,
      claimsUngrounded: ungrounded,
      verdict: claims.length === 0 ? "clean" : classifyVerdict(claims),
      claimsDetail: claims,
      tokensUsed: {
        input: response.inputTokens,
        output: response.outputTokens,
        cached: response.cacheReadTokens ?? 0,
      },
    };
  } catch {
    // Fail-open: pipeline proceeds with unaudited verdict
    return {
      claimsTotal: 0,
      claimsGrounded: 0,
      claimsUngrounded: 0,
      verdict: "unaudited",
      claimsDetail: [],
      tokensUsed: { input: 0, output: 0, cached: 0 },
    };
  }
}
