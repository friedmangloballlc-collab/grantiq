// grantaq/src/lib/ai/writing/draft-generator.ts
//
// Unit 7 of the LLMGateway extension plan. Migrated from direct
// `new Anthropic()` SDK calls to `aiCall({ provider: 'anthropic', ... })`.
//
// What this migration buys:
//   - Anthropic prompt caching (60-70% cost cut at 70%+ hit rate per
//     ProjectDiscovery's pattern)
//   - Pre-flight injection detection on userInput AND cacheableContext
//   - Pre-flight usage gate (row-based + token-based)
//   - Per-call audit trail to ai_generations with prompt_id +
//     cache_creation_tokens + cache_read_tokens
//   - Session-based dedup so a 6-section drafting run = 1 ai_usage row
//     against the org's monthly cap (not 6)
//   - Sentry tripwire on recording failures
//
// What stayed the same:
//   - The Zod-validated retry loop for section output. Anthropic-side
//     retry (5xx/529) lives in aiCall now; the Zod-shape retry stays
//     local to this module.
//
// Parallelization (added after Unit 7 ship):
//   Section 0 runs alone first to prime the Anthropic prompt cache
//   (cacheableContext + system prompt land in the cache on this call).
//   Sections 1..N then run in parallel via Promise.all — they all hit
//   the warmed cache (cache_read at 10% of input cost) and execute
//   concurrently against Anthropic's API. End-to-end draft latency
//   for a typical 6-section RFP drops from ~6× per-call time to ~2×.
//
//   Concurrency safety: Unit 5's record_ai_usage_session RPC uses
//   Postgres ON CONFLICT DO UPDATE with a partial unique index, which
//   is atomic — concurrent upserts for the same (org_id, session_id)
//   are race-safe. The token-ceiling check is also atomic per call.

import {
  DraftSectionOutputSchema,
  BudgetTableOutputSchema,
  type DraftSectionOutput,
  type BudgetTableOutput,
  type RfpParseOutput,
} from "./schemas";
import {
  DRAFT_SECTION_SYSTEM_PROMPT,
  buildSectionUserSegment,
  BUDGET_GENERATOR_SYSTEM_PROMPT,
} from "./prompts";
import type { WritingContext } from "@/types/writing";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";
import { canonicalStringify } from "@/lib/ai/stringify";

// Map RFP section names to our section_type taxonomy
const SECTION_TYPE_MAP: Record<string, string> = {
  "abstract": "abstract",
  "project abstract": "abstract",
  "executive summary": "abstract",
  "project narrative": "project_narrative",
  "narrative": "project_narrative",
  "need": "needs_assessment",
  "needs assessment": "needs_assessment",
  "needs statement": "needs_assessment",
  "statement of need": "needs_assessment",
  "goals": "goals_objectives",
  "goals and objectives": "goals_objectives",
  "objectives": "goals_objectives",
  "methods": "methods_approach",
  "methodology": "methods_approach",
  "approach": "methods_approach",
  "project design": "methods_approach",
  "implementation plan": "methods_approach",
  "evaluation": "evaluation_plan",
  "evaluation plan": "evaluation_plan",
  "evaluative measures": "evaluation_plan",
  "organizational capacity": "organizational_capacity",
  "organizational information": "organizational_capacity",
  "applicant capacity": "organizational_capacity",
  "budget": "budget_table",
  "budget narrative": "budget_narrative",
  "budget justification": "budget_narrative",
  "logic model": "logic_model",
  "timeline": "timeline",
  "work plan": "timeline",
  "sustainability": "sustainability_plan",
  "sustainability plan": "sustainability_plan",
  "dei": "dei_statement",
  "diversity equity inclusion": "dei_statement",
};

export function classifySectionType(sectionName: string): string {
  const normalized = sectionName.toLowerCase().trim();
  // Sort by key length descending so more-specific keys (e.g. "budget narrative")
  // match before shorter sub-strings (e.g. "narrative")
  const sortedEntries = Object.entries(SECTION_TYPE_MAP).sort(
    ([a], [b]) => b.length - a.length
  );
  for (const [key, value] of sortedEntries) {
    if (normalized.includes(key)) return value;
  }
  return "other";
}

/**
 * Builds the SESSION-STABLE cacheable context block.
 *
 * Contains everything that does NOT vary across the sections of one drafting
 * run: org profile, org capabilities, funder intel, and the RFP analysis.
 * This block is cached by Anthropic with 5-minute TTL — sections 2..N pay
 * the cache-read rate (10% of input cost) for this content instead of the
 * non-cached rate.
 *
 * Serialized via canonicalStringify (Unit 2) so the byte-identical guarantee
 * holds even when the upstream object's key order varies between Supabase
 * query paths. Without canonical serialization, the cache key drifts and
 * hit rate silently drops to 0%.
 */
function buildCacheableContext(context: WritingContext): string {
  // Only include funder_context_block when it's a non-empty string.
  // Including a null/undefined field would still serialize stably, but
  // omitting it entirely means the cache key for grants WITHOUT 990 data
  // matches the pre-Unit-9a baseline — useful for measuring cache-hit
  // continuity across the rollout.
  const payload: Record<string, unknown> = {
    org_profile: context.org_profile,
    org_capabilities: context.org_capabilities,
    funder_analysis: context.funder_analysis,
    rfp_analysis: context.rfp_analysis,
  };
  if (context.funder_context_block && context.funder_context_block.length > 0) {
    payload.funder_context_block = context.funder_context_block;
  }
  return canonicalStringify(payload) ?? "";
}

/**
 * Builds the per-section VOLATILE user-message body.
 *
 * Contains only the section-specific content: the structured section
 * preamble (Unit 3 / R18 — section_name, type, limits, scoring criteria,
 * special instructions) plus the filtered narrative examples for this
 * section type. Flows through aiCall as `userInput` — never cached.
 *
 * Examples are filtered to the matching section type and capped at 3 to
 * keep per-call token cost bounded.
 */
function buildSectionUserMessage(
  section: RfpParseOutput["required_sections"][0],
  context: WritingContext
): string {
  const sectionType = classifySectionType(section.section_name);
  const sectionUserSegment = buildSectionUserSegment({
    section_name: section.section_name,
    section_type: sectionType,
    section_description: section.description,
    page_limit: section.page_limit,
    word_limit: section.word_limit,
    special_instructions: section.special_instructions,
    scoring_criteria: context.rfp_analysis.scoring_criteria,
  });

  const examplesForType = context.narrative_examples
    .filter(ex => ex.segment_type === sectionType)
    .slice(0, 3);

  const examplesBlock = examplesForType.length > 0
    ? `\n## Prior Successful Examples (use as style/quality reference ONLY — do NOT copy)\n${examplesForType.map((ex, i) => `### Example ${i + 1} (quality: ${ex.quality_score}/10)\n${ex.text}`).join("\n\n")}`
    : "";

  return `${sectionUserSegment}
${examplesBlock}

## Section to Write
Write the "${section.section_name}" section now.`;
}

/**
 * Generates a single section via Claude Opus through aiCall.
 *
 * Routes through aiCall (Unit 4) which provides:
 *   - Anthropic prompt caching: DRAFT_SECTION_SYSTEM_PROMPT (1h TTL) +
 *     cacheableContext (5m TTL) — sections 2..N hit the cache
 *   - Pre-flight injection detection on cacheableContext + userInput
 *   - Pre-flight usage gate (row + token)
 *   - Per-call audit recording with prompt_id + cache token splits
 *   - Session-based dedup so all sections of one draft = 1 ai_usage row
 *   - Sentry tripwire on recording failures
 *
 * Local Zod-shape retry stays here — it's not an Anthropic-side error,
 * so it's not in aiCall's whitelist. Re-issues the call with a static
 * repair instruction (no error-text echo per R27 hygiene).
 */
async function generateSection(
  section: RfpParseOutput["required_sections"][0],
  context: WritingContext,
  draftId: string,
  onDelta?: (delta: string) => void
): Promise<DraftSectionOutput> {
  const cacheableContext = buildCacheableContext(context);
  const userMessage = buildSectionUserMessage(section, context);
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? userMessage
      : `${userMessage}\n\nNOTE: Your previous response was not valid JSON. Return only a valid JSON object matching the schema.`;

    // Only stream on attempt 0. On the JSON-shape repair retry, the user
    // is already looking at attempt-0's output; surfacing a second stream
    // would duplicate text in the UI.
    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.STRATEGY, // Opus for the writing pipeline
      systemPrompt: DRAFT_SECTION_SYSTEM_PROMPT,
      cacheableContext,
      userInput: prompt,
      promptId: "writing.draft.v1",
      sessionId: draftId,
      orgId: context.org_id,
      userId: context.user_id,
      tier: context.subscription_tier,
      actionType: "draft",
      maxTokens: 16384,
      temperature: 0,
      onTextDelta: attempt === 0 ? onDelta : undefined,
    });

    try {
      const parsed = JSON.parse(response.content);
      return DraftSectionOutputSchema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        throw new Error(`Section "${section.section_name}" validation failed: ${lastError}`);
      }
    }
  }

  throw new Error("Section generation failed unexpectedly");
}

/**
 * Generates the budget table via Claude Opus through aiCall.
 *
 * Same caching strategy as generateSection — DRAFT_SECTION_SYSTEM_PROMPT
 * is reused for cache reuse (it's invariant; budget can use the same
 * writing-standards rubric). cacheableContext is also reused, which
 * means the budget call benefits from the cache warm-up the section
 * calls already paid for.
 */
async function generateBudget(
  context: WritingContext,
  generatedSections: DraftSectionOutput[],
  draftId: string
): Promise<BudgetTableOutput> {
  const cacheableContext = buildCacheableContext(context);
  const sectionsBlock = generatedSections
    .map(s => `### ${s.section_name}\n${s.content}`)
    .join("\n\n");

  const userMessage = `## Generated Narrative Sections (budget must align with these)
${sectionsBlock}

## Section to Write
Generate the budget table now, ensuring it aligns with the narrative sections above.`;

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? userMessage
      : `${userMessage}\n\nNOTE: Your previous response was not valid JSON. Return only a valid JSON object matching the schema.`;

    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.STRATEGY, // Opus
      systemPrompt: BUDGET_GENERATOR_SYSTEM_PROMPT,
      cacheableContext,
      userInput: prompt,
      promptId: "writing.budget.v1",
      sessionId: draftId,
      orgId: context.org_id,
      userId: context.user_id,
      tier: context.subscription_tier,
      actionType: "budget",
      maxTokens: 8192,
      temperature: 0,
    });

    try {
      const parsed = JSON.parse(response.content);
      return BudgetTableOutputSchema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) throw new Error(`Budget validation failed: ${lastError}`);
    }
  }

  throw new Error("Budget generation failed unexpectedly");
}

// The dead `_trackUsage` function that previously lived here has been removed.
// It was unused legacy code with the same column-name bug as BD-1. All usage
// tracking now flows through aiCall's recordUsage path (Unit 1 + Unit 5).

export interface DraftGeneratorResult {
  sections: DraftSectionOutput[];
  budget: BudgetTableOutput;
}

/**
 * Callback fired for each text delta arriving from Anthropic during
 * section generation. Used by the worker to broadcast streaming text
 * to the browser via Supabase Realtime so users see sections appear
 * word-by-word instead of staring at a spinner.
 *
 * sectionIndex is the 0-based slot in narrativeSections; sectionName
 * is the human-readable section title (e.g. "Needs Assessment").
 * delta is a partial text fragment, NOT the cumulative content.
 *
 * The callback is best-effort: throwing here does NOT abort generation
 * — the call.ts wrapper logs and continues. Don't do heavy work in
 * the callback (no synchronous DB writes, no heavy parsing); the worker
 * pattern is to fire-and-forget a Realtime broadcast.
 */
export type DraftSectionDeltaCallback = (
  sectionIndex: number,
  sectionName: string,
  delta: string
) => void;

/**
 * Callback fired exactly once per section when its generation
 * promise resolves successfully. Lets the streaming UI lock in the
 * accumulated text and stop showing a "writing..." indicator.
 *
 * Not called on failure — the section's exception propagates and the
 * worker should treat it as a pipeline-level failure (the existing
 * grant_drafts.status='failed' write covers that case).
 */
export type DraftSectionDoneCallback = (
  sectionIndex: number,
  sectionName: string
) => void;

/**
 * Main entry: generates all sections + budget, updating draft progress
 * as work completes.
 *
 * Execution shape:
 *   1. Section 0 runs alone (primes Anthropic prompt cache)
 *   2. Sections 1..N run in parallel via Promise.all (all hit warm cache)
 *   3. Budget runs after all sections complete (it needs the narrative
 *      content to align numbers to)
 *
 * Section ordering in the returned array matches the RFP-defined order
 * (narrativeSections), not completion order. The parallel branch maps
 * results back into the original index slots.
 */
export async function generateDraft(
  draftId: string,
  context: WritingContext,
  onSectionDelta?: DraftSectionDeltaCallback,
  onSectionDone?: DraftSectionDoneCallback
): Promise<DraftGeneratorResult> {
  const supabase = createAdminClient();
  const rfp = context.rfp_analysis;

  // Filter out budget-type sections (generated separately)
  const narrativeSections = rfp.required_sections.filter(
    s => !classifySectionType(s.section_name).startsWith("budget")
  );
  const totalSteps = narrativeSections.length + 1; // +1 for budget
  const sections: DraftSectionOutput[] = new Array(narrativeSections.length);
  let completedSteps = 0;

  // updateProgress is called from concurrent branches; the underlying
  // PATCH is idempotent (last-write-wins on a single column set), so a
  // brief race where two updates land out of order only causes a tiny
  // visual jitter in progress_pct, never a correctness issue.
  const updateProgress = async (currentSectionName: string) => {
    await supabase.from("grant_drafts").update({
      status: "drafting",
      current_step: `Writing: ${currentSectionName}`,
      progress_pct: Math.round((completedSteps / totalSteps) * 80), // 0-80% for drafting
    }).eq("id", draftId);
  };

  if (narrativeSections.length === 0) {
    // Edge case: RFP had no narrative sections (only a budget). Skip
    // straight to budget generation.
  } else {
    // Step 1: Run section 0 alone to prime the Anthropic prompt cache.
    // This call pays the cache_creation cost on systemPrompt (1h TTL)
    // and cacheableContext (5m TTL). Sections 1..N hit those entries
    // at the cache_read rate.
    const firstSection = narrativeSections[0];
    await updateProgress(firstSection.section_name);
    sections[0] = await generateSection(
      firstSection,
      context,
      draftId,
      onSectionDelta
        ? (delta) => onSectionDelta(0, firstSection.section_name, delta)
        : undefined
    );
    onSectionDone?.(0, firstSection.section_name);
    completedSteps++;

    // Step 2: Sections 1..N run in parallel against the warm cache.
    // Promise.all is safe here — Unit 5's session-dedup RPC uses an
    // atomic ON CONFLICT DO UPDATE, and the per-call token ceiling
    // check is also atomic per call.
    if (narrativeSections.length > 1) {
      const remaining = narrativeSections.slice(1);
      await supabase.from("grant_drafts").update({
        status: "drafting",
        current_step: `Writing ${remaining.length} sections in parallel`,
        progress_pct: Math.round((completedSteps / totalSteps) * 80),
      }).eq("id", draftId);

      const results = await Promise.all(
        remaining.map(async (section, i) => {
          const sectionIndex = i + 1;
          const result = await generateSection(
            section,
            context,
            draftId,
            onSectionDelta
              ? (delta) => onSectionDelta(sectionIndex, section.section_name, delta)
              : undefined
          );
          onSectionDone?.(sectionIndex, section.section_name);
          completedSteps++;
          // Fire-and-forget progress update so a slow PATCH doesn't
          // hold up the next section's response from being captured.
          void updateProgress(section.section_name);
          return { index: sectionIndex, result };
        })
      );

      for (const { index, result } of results) {
        sections[index] = result;
      }
    }
  }

  // Generate budget (informed by all narrative sections)
  await supabase.from("grant_drafts").update({
    current_step: "Generating budget",
    progress_pct: Math.round((completedSteps / totalSteps) * 80),
  }).eq("id", draftId);

  const budget = await generateBudget(context, sections, draftId);

  // Store sections on draft record
  const sectionsMap: Record<string, DraftSectionOutput> = {};
  for (const s of sections) {
    sectionsMap[s.section_type] = s;
  }
  sectionsMap["budget_table"] = {
    section_name: "Budget",
    section_type: "budget_table",
    content: JSON.stringify(budget, null, 2),
    word_count: 0,
    page_estimate: 1,
    within_limits: true,
    key_themes_addressed: [],
    scoring_criteria_addressed: [],
    confidence_score: 8,
    notes: null,
  };

  await supabase.from("grant_drafts").update({
    status: "draft_complete",
    sections: sectionsMap,
    progress_pct: 80,
    current_step: "Draft complete",
  }).eq("id", draftId);

  return { sections, budget };
}
