// grantiq/src/lib/ai/writing/ai-auditor.ts

import Anthropic from "@anthropic-ai/sdk";
import {
  AuditOutputSchema,
  DraftSectionOutputSchema,
  type AuditOutput,
  type DraftSectionOutput,
  type RfpParseOutput,
  type FunderAnalysisOutput,
} from "./schemas";
import { AI_AUDITOR_SYSTEM_PROMPT } from "./prompts";
import { createAdminClient } from "@/lib/supabase/admin";

const anthropic = new Anthropic();

interface AuditInput {
  draft_id: string;
  sections: DraftSectionOutput[];
  budget_json: string;
  rfp_analysis: RfpParseOutput;
  funder_analysis: FunderAnalysisOutput;
}

/**
 * Independent AI audit using a SEPARATE Claude Opus context (fresh eyes).
 * The auditor has no access to the generation prompts — only the final output.
 * Scores on 6 dimensions, identifies weaknesses, suggests specific before/after fixes.
 */
export async function auditDraft(input: AuditInput): Promise<AuditOutput> {
  const fullDraft = input.sections.map(s => `## ${s.section_name}\n${s.content}`).join("\n\n");

  // NOTE: We deliberately do NOT include the generation prompts or internal context.
  // The auditor sees only what a funder reviewer would see: the application + RFP.
  const userMessage = `## Grant Application to Audit

${fullDraft}

## Budget
${input.budget_json}

## RFP/NOFO Summary
Title: ${input.rfp_analysis.grant_title}
Funder: ${input.rfp_analysis.funder_name}
Grant Type: ${input.rfp_analysis.grant_type}

Scoring Criteria:
${input.rfp_analysis.scoring_criteria.map(c => `- ${c.criterion} (${c.max_points} points): ${c.description}`).join("\n")}

Key Themes: ${input.rfp_analysis.key_themes.join(", ")}

## Funder Intelligence
Alignment Score: ${input.funder_analysis.alignment_score}/100
Priorities: ${input.funder_analysis.stated_priorities.join(", ")}
Language Preferences: ${input.funder_analysis.language_preferences.join(", ")}
Red Flags: ${input.funder_analysis.red_flags.join(", ")}`;

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? userMessage
      : `VALIDATION ERROR: ${lastError}\n\nFix your JSON.\n\n${userMessage}`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-0-20250514",
      max_tokens: 16384,
      system: AI_AUDITOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    try {
      const parsed = JSON.parse(content.text);
      const validated = AuditOutputSchema.parse(parsed);

      const supabase = createAdminClient();
      await supabase.from("grant_drafts").update({
        audit_report: validated,
        status: "audit_complete",
        progress_pct: 90,
        current_step: `Audit complete — Score: ${validated.overall_score}/100 (${validated.grade})`,
      }).eq("id", input.draft_id);

      return validated;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) throw new Error(`Audit validation failed: ${lastError}`);
    }
  }

  throw new Error("Audit failed unexpectedly");
}

/**
 * AI Rewriter: Takes audit feedback and rewrites sections that scored low
 * or have high-impact improvements. Uses Claude Opus.
 */
export async function rewriteWithAuditFeedback(
  draftId: string,
  originalSections: DraftSectionOutput[],
  audit: AuditOutput,
  rfpAnalysis: RfpParseOutput,
  funderAnalysis: FunderAnalysisOutput
): Promise<DraftSectionOutput[]> {
  const supabase = createAdminClient();

  // Identify sections that need rewriting (those with improvements ranked in top 10)
  const topImprovements = audit.ranked_improvements.slice(0, 10);
  const sectionsToRewrite = new Set(topImprovements.map(imp => imp.section));

  const rewrittenSections: DraftSectionOutput[] = [];

  for (const section of originalSections) {
    if (!sectionsToRewrite.has(section.section_name) && !sectionsToRewrite.has(section.section_type)) {
      rewrittenSections.push(section);
      continue;
    }

    // Get improvements specific to this section
    const sectionImprovements = audit.dimensions
      .flatMap(d => d.improvements)
      .filter(imp => imp.section.toLowerCase().includes(section.section_type) ||
                     imp.section.toLowerCase().includes(section.section_name.toLowerCase()));

    await supabase.from("grant_drafts").update({
      status: "rewriting",
      current_step: `Rewriting: ${section.section_name}`,
    }).eq("id", draftId);

    const rewritePrompt = `You are rewriting a grant section based on audit feedback. Incorporate ALL improvements while maintaining the section's strengths.

## Original Section
${section.content}

## Audit Feedback for This Section
Overall audit score: ${audit.overall_score}/100

Specific improvements to incorporate:
${sectionImprovements.map(imp => `- Issue: ${imp.issue}\n  Before: "${imp.before_text}"\n  Suggested After: "${imp.after_text}"\n  Rationale: ${imp.rationale}`).join("\n\n")}

## General Audit Notes
Strengths to preserve: ${audit.top_strengths.join("; ")}
Critical weaknesses to address: ${audit.critical_weaknesses.join("; ")}

## Funder Priorities
Language to use: ${funderAnalysis.language_preferences.join(", ")}
Avoid: ${funderAnalysis.red_flags.join(", ")}

## Constraints
- Maintain the same word count (within 10%)
- Keep all specific data points and citations
- Preserve the organizational voice
- Address EVERY listed improvement
- Do not introduce new claims without evidence brackets [CITE: ...]

Return ONLY a JSON object matching the DraftSectionOutput schema.`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-0-20250514",
      max_tokens: 16384,
      messages: [{ role: "user", content: rewritePrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    try {
      const parsed = JSON.parse(content.text);
      const validated = DraftSectionOutputSchema.parse(parsed);
      rewrittenSections.push(validated);
    } catch {
      // If rewrite fails validation, keep original
      rewrittenSections.push(section);
    }
  }

  // Store rewritten sections
  const rewrittenMap: Record<string, DraftSectionOutput> = {};
  for (const s of rewrittenSections) {
    rewrittenMap[s.section_type] = s;
  }

  await supabase.from("grant_drafts").update({
    rewritten_sections: rewrittenMap,
    status: "rewrite_complete",
    progress_pct: 93,
    current_step: "Rewrite complete",
  }).eq("id", draftId);

  return rewrittenSections;
}
