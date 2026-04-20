// grantaq/src/lib/ai/writing/funder-analyzer.ts
//
// Migrated from direct `new Anthropic()` SDK calls to aiCall (service-audit
// pass, 2026-04-19). Same migration pattern as draft-generator.ts.
//
// What this migration buys (same as draft-generator):
//   - Anthropic prompt caching on system prompt (1h TTL) — sections of
//     subsequent funder analyses for the same prompt version hit the
//     warm cache
//   - Pre-flight injection detection on user input
//   - Pre-flight usage gate (row-based + token-based)
//   - Per-call audit trail to ai_generations with prompt_id
//   - Sentry tripwire on recording failures
//
// What stayed the same:
//   - Local Zod-shape retry stays here (NOT in aiCall's whitelist) —
//     same pattern as draft-generator's section retry
//   - rfp_analyses.funder_analysis update flow is unchanged

import { FunderAnalysisOutputSchema, type FunderAnalysisOutput } from "./schemas";
import { FUNDER_ANALYZER_SYSTEM_PROMPT } from "./prompts";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";

interface FunderAnalyzerInput {
  org_id: string;
  user_id: string;
  subscription_tier: string;
  rfp_analysis_id: string;
  funder_profile: {
    funder_name: string;
    funder_type: string;
    focus_areas: string[];
    avg_award_size: number | null;
    typical_award_range_min: number | null;
    typical_award_range_max: number | null;
    total_annual_giving: number | null;
    geographic_preference: Record<string, unknown> | null;
    org_size_preference: string | null;
    new_applicant_friendly: boolean | null;
    acceptance_rate: number | null;
  };
  org_profile: {
    name: string;
    mission_statement: string;
    entity_type: string;
    state: string;
    city: string;
    population_served: string[];
    program_areas: string[];
    annual_budget: number | null;
    employee_count: number | null;
  };
  irs_990_data?: string | null;          // Stringified 990 data if available
  federal_award_history?: string | null;  // Stringified USAspending data if available
}

/**
 * Calls Claude Sonnet to analyze a funder and produce alignment intelligence.
 * Validates output with Zod. Retries once on validation failure.
 *
 * Routes through aiCall (Unit 4) so the call is observable + cost-controlled.
 * Uses sessionId = rfp_analysis_id so funder analysis counts as part of the
 * same drafting session for usage-row dedup.
 */
export async function analyzeFunder(input: FunderAnalyzerInput): Promise<FunderAnalysisOutput> {
  const userMessage = `## Funder Profile
${JSON.stringify(input.funder_profile, null, 2)}

## Applicant Organization
${JSON.stringify(input.org_profile, null, 2)}

${input.irs_990_data ? `## IRS 990 Data\n${input.irs_990_data}` : "## IRS 990 Data\nNot available."}

${input.federal_award_history ? `## Federal Award History\n${input.federal_award_history}` : "## Federal Award History\nNot available."}`;

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? userMessage
      : `Your previous response failed validation: ${lastError}\n\nPlease fix and try again.\n\n${userMessage}`;

    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.SCORING,
      systemPrompt: FUNDER_ANALYZER_SYSTEM_PROMPT,
      userInput: prompt,
      promptId: "writing.funder_analysis.v1",
      sessionId: input.rfp_analysis_id,
      orgId: input.org_id,
      userId: input.user_id,
      tier: input.subscription_tier,
      actionType: "roadmap",
      maxTokens: 4096,
      temperature: 0,
    });

    try {
      const parsed = JSON.parse(response.content);
      const validated = FunderAnalysisOutputSchema.parse(parsed);

      // Store analysis on the rfp_analyses record
      const supabase = createAdminClient();
      await supabase
        .from("grant_rfp_analyses")
        .update({ funder_analysis: validated })
        .eq("id", input.rfp_analysis_id);

      return validated;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        throw new Error(`Funder analysis validation failed after retry: ${lastError}`);
      }
    }
  }

  throw new Error("Funder analysis failed unexpectedly");
}
