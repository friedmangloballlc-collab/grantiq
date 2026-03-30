// grantiq/src/lib/ai/writing/draft-generator.ts

import Anthropic from "@anthropic-ai/sdk";
import {
  DraftSectionOutputSchema,
  BudgetTableOutputSchema,
  type DraftSectionOutput,
  type BudgetTableOutput,
  type RfpParseOutput,
} from "./schemas";
import { buildDraftSectionPrompt, BUDGET_GENERATOR_SYSTEM_PROMPT } from "./prompts";
import type { WritingContext } from "@/types/writing";
import { createAdminClient } from "@/lib/supabase/admin";

const anthropic = new Anthropic();

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
 * Builds the user message for a section generation call, including
 * all context the writer needs: RFP, funder intel, org profile, and examples.
 */
function buildSectionUserMessage(
  section: RfpParseOutput["required_sections"][0],
  context: WritingContext
): string {
  const examplesForType = context.narrative_examples
    .filter(ex => ex.segment_type === classifySectionType(section.section_name))
    .slice(0, 3);

  const examplesBlock = examplesForType.length > 0
    ? `\n## Prior Successful Examples (use as style/quality reference ONLY — do NOT copy)\n${examplesForType.map((ex, i) => `### Example ${i + 1} (quality: ${ex.quality_score}/10)\n${ex.text}`).join("\n\n")}`
    : "";

  return `## RFP Analysis
${JSON.stringify(context.rfp_analysis, null, 2)}

## Funder Intelligence
${JSON.stringify(context.funder_analysis, null, 2)}

## Organization Profile
Name: ${context.org_profile.name}
Mission: ${context.org_profile.mission_statement}
Entity Type: ${context.org_profile.entity_type}
Population Served: ${context.org_profile.population_served.join(", ")}
Program Areas: ${context.org_profile.program_areas.join(", ")}
${context.org_profile.voice_profile ? `Voice Profile: ${JSON.stringify(context.org_profile.voice_profile)}` : ""}

## Organization Capabilities
${JSON.stringify(context.org_capabilities, null, 2)}
${examplesBlock}

## Section to Write
Write the "${section.section_name}" section now.`;
}

/**
 * Generates a single section via Claude Opus with Zod validation and retry.
 */
async function generateSection(
  section: RfpParseOutput["required_sections"][0],
  context: WritingContext,
  relevantCriteria: RfpParseOutput["scoring_criteria"]
): Promise<DraftSectionOutput> {
  const sectionType = classifySectionType(section.section_name);
  const systemPrompt = buildDraftSectionPrompt({
    section_name: section.section_name,
    section_type: sectionType,
    section_description: section.description,
    page_limit: section.page_limit,
    word_limit: section.word_limit,
    special_instructions: section.special_instructions,
    scoring_criteria: relevantCriteria,
  });

  const userMessage = buildSectionUserMessage(section, context);
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? userMessage
      : `VALIDATION ERROR: ${lastError}\n\nPlease fix your JSON output.\n\n${userMessage}`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    try {
      const parsed = JSON.parse(content.text);
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
 * Generates the budget table via Claude Opus.
 */
async function generateBudget(
  context: WritingContext,
  generatedSections: DraftSectionOutput[]
): Promise<BudgetTableOutput> {
  const userMessage = `## RFP Analysis
${JSON.stringify(context.rfp_analysis, null, 2)}

## Funder Intelligence
${JSON.stringify(context.funder_analysis, null, 2)}

## Organization Profile
${JSON.stringify(context.org_profile, null, 2)}

## Generated Narrative Sections (budget must align with these)
${generatedSections.map(s => `### ${s.section_name}\n${s.content}`).join("\n\n")}`;

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? userMessage
      : `VALIDATION ERROR: ${lastError}\n\nFix your JSON.\n\n${userMessage}`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 8192,
      system: BUDGET_GENERATOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    try {
      const parsed = JSON.parse(content.text);
      return BudgetTableOutputSchema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) throw new Error(`Budget validation failed: ${lastError}`);
    }
  }

  throw new Error("Budget generation failed unexpectedly");
}

/**
 * Tracks AI usage for billing and cost accounting.
 */
async function trackUsage(
  orgId: string,
  userId: string,
  draftId: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  generationType: string
) {
  const supabase = createAdminClient();
  const costCents = model.includes("opus")
    ? Math.round((tokensIn * 15 + tokensOut * 75) / 1_000_000 * 100)  // Opus pricing
    : Math.round((tokensIn * 3 + tokensOut * 15) / 1_000_000 * 100);  // Sonnet pricing

  await Promise.all([
    supabase.from("ai_generations").insert({
      org_id: orgId,
      user_id: userId,
      grant_application_id: draftId,
      generation_type: generationType,
      model_used: model,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      estimated_cost_cents: costCents,
    }),
    supabase.from("ai_usage").insert({
      org_id: orgId,
      action_type: generationType === "budget" ? "draft" : generationType,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      estimated_cost_cents: costCents,
      billing_period: new Date().toISOString().slice(0, 10),
    }),
  ]);
}

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

    const result = await generateSection(section, context, rfp.scoring_criteria);
    sections.push(result);
    completedSteps++;
  }

  // Generate budget (informed by all narrative sections)
  await supabase.from("grant_drafts").update({
    current_step: "Generating budget",
    progress_pct: Math.round((completedSteps / totalSteps) * 80),
  }).eq("id", draftId);

  const budget = await generateBudget(context, sections);

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
