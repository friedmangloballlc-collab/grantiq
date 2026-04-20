// grantaq/src/lib/ai/writing/coherence-checker.ts

import { CoherenceCheckOutputSchema, type CoherenceCheckOutput } from "./schemas";
import { COHERENCE_CHECKER_SYSTEM_PROMPT } from "./prompts";
import type { DraftSectionOutput, BudgetTableOutput, RfpParseOutput } from "./schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";

interface CoherenceCheckInput {
  draft_id: string;
  org_id: string;
  user_id: string;
  subscription_tier: string;
  sections: DraftSectionOutput[];
  budget: BudgetTableOutput;
  rfp_analysis: RfpParseOutput;
}

/**
 * Reviews the complete draft for internal consistency, budget-narrative
 * alignment, and RFP requirement coverage. Uses Claude Sonnet.
 */
export async function checkCoherence(input: CoherenceCheckInput): Promise<CoherenceCheckOutput> {
  const fullDraft = input.sections.map(s => `## ${s.section_name}\n${s.content}`).join("\n\n");

  const userMessage = `## Complete Application Draft
${fullDraft}

## Budget
${JSON.stringify(input.budget, null, 2)}

## RFP Requirements
Required Sections: ${input.rfp_analysis.required_sections.map(s => s.section_name).join(", ")}
Scoring Criteria: ${input.rfp_analysis.scoring_criteria.map(c => `${c.criterion} (${c.max_points}pts)`).join(", ")}
Key Themes: ${input.rfp_analysis.key_themes.join(", ")}
Page/Word Limits: ${input.rfp_analysis.required_sections.map(s => `${s.section_name}: ${s.page_limit ? s.page_limit + " pages" : ""}${s.word_limit ? s.word_limit + " words" : ""}`).filter(x => x.includes("page") || x.includes("word")).join(", ")}`;

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? userMessage
      : `VALIDATION ERROR: ${lastError}\n\nFix your JSON.\n\n${userMessage}`;

    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.SCORING,
      systemPrompt: COHERENCE_CHECKER_SYSTEM_PROMPT,
      userInput: prompt,
      promptId: "writing.coherence.v1",
      sessionId: input.draft_id,
      orgId: input.org_id,
      userId: input.user_id,
      tier: input.subscription_tier,
      actionType: "audit",
      maxTokens: 8192,
      temperature: 0,
    });

    try {
      const parsed = JSON.parse(response.content);
      const validated = CoherenceCheckOutputSchema.parse(parsed);

      // Store on draft record
      const supabase = createAdminClient();
      await supabase.from("grant_drafts").update({
        coherence_report: validated,
        status: "coherence_checked",
        progress_pct: 85,
        current_step: "Coherence check complete",
      }).eq("id", input.draft_id);

      return validated;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) throw new Error(`Coherence check validation failed: ${lastError}`);
    }
  }

  throw new Error("Coherence check failed unexpectedly");
}
