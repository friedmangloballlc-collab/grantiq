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
//   - Sequential section execution (the for-loop in generateDraft).
//     Parallelization was deliberately deferred to a separate unit
//     because it requires careful orchestration of progress updates
//     and would obscure the BD-1/cache wins by mixing concerns.
//   - The Zod-validated retry loop for section output. Anthropic-side
//     retry (5xx/529) lives in aiCall now; the Zod-shape retry stays
//     local to this module.

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
  return canonicalStringify({
    org_profile: context.org_profile,
    org_capabilities: context.org_capabilities,
    funder_analysis: context.funder_analysis,
    rfp_analysis: context.rfp_analysis,
  }) ?? "";
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
  draftId: string
): Promise<DraftSectionOutput> {
  const cacheableContext = buildCacheableContext(context);
  const userMessage = buildSectionUserMessage(section, context);
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? userMessage
      : `${userMessage}\n\nNOTE: Your previous response was not valid JSON. Return only a valid JSON object matching the schema.`;

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
 * Main entry: generates all sections + budget sequentially, updating
 * draft progress as it goes. Sections are generated one at a time to
 * allow later sections to reference earlier ones if needed.
 */
export async function generateDraft(
  draftId: string,
  context: WritingContext
): Promise<DraftGeneratorResult> {
  const supabase = createAdminClient();
  const rfp = context.rfp_analysis;
  const sections: DraftSectionOutput[] = [];

  // Filter out budget-type sections (generated separately)
  const narrativeSections = rfp.required_sections.filter(
    s => !classifySectionType(s.section_name).startsWith("budget")
  );
  const totalSteps = narrativeSections.length + 1; // +1 for budget
  let completedSteps = 0;

  // Generate each section sequentially
  for (const section of narrativeSections) {
    await supabase.from("grant_drafts").update({
      status: "drafting",
      current_step: `Writing: ${section.section_name}`,
      progress_pct: Math.round((completedSteps / totalSteps) * 80), // 0-80% for drafting
    }).eq("id", draftId);

    const result = await generateSection(section, context, draftId);
    sections.push(result);
    completedSteps++;
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
