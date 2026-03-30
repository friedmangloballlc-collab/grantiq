// grantiq/src/lib/ai/writing/review-simulator.ts

import Anthropic from "@anthropic-ai/sdk";
import {
  ReviewerPersonaSchema,
  ReviewSimulationOutputSchema,
  type ReviewSimulationOutput,
  type DraftSectionOutput,
  type RfpParseOutput,
  type FunderAnalysisOutput,
} from "./schemas";
import {
  REVIEW_SIM_TECHNICAL_EXPERT_PROMPT,
  REVIEW_SIM_PROGRAM_OFFICER_PROMPT,
  REVIEW_SIM_COMMUNITY_ADVOCATE_PROMPT,
} from "./prompts";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const anthropic = new Anthropic();

type ReviewerPersona = z.infer<typeof ReviewerPersonaSchema>;

interface ReviewSimulationInput {
  draft_id: string;
  sections: DraftSectionOutput[];
  budget_json: string;
  rfp_analysis: RfpParseOutput;
  funder_analysis: FunderAnalysisOutput;
}

const PERSONA_PROMPTS = [
  { persona: "technical_expert" as const, prompt: REVIEW_SIM_TECHNICAL_EXPERT_PROMPT },
  { persona: "program_officer" as const, prompt: REVIEW_SIM_PROGRAM_OFFICER_PROMPT },
  { persona: "community_advocate" as const, prompt: REVIEW_SIM_COMMUNITY_ADVOCATE_PROMPT },
];

/**
 * Runs a single reviewer persona evaluation.
 */
async function runReviewerPersona(
  systemPrompt: string,
  applicationText: string,
  scoringCriteria: string
): Promise<ReviewerPersona> {
  const userMessage = `## Application to Review
${applicationText}

## Scoring Criteria (use these to assign scores)
${scoringCriteria}

Score this application using the criteria above. Be thorough and honest.`;

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0
      ? userMessage
      : `VALIDATION ERROR: ${lastError}\n\nFix your JSON.\n\n${userMessage}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    try {
      const parsed = JSON.parse(content.text);
      return ReviewerPersonaSchema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) throw new Error(`Review persona validation failed: ${lastError}`);
    }
  }

  throw new Error("Review persona failed unexpectedly");
}

/**
 * Main entry: runs 3 reviewer personas IN PARALLEL, then synthesizes
 * consensus score and ranked revision list.
 */
export async function simulateReview(input: ReviewSimulationInput): Promise<ReviewSimulationOutput> {
  const supabase = createAdminClient();

  await supabase.from("grant_drafts").update({
    current_step: "Running review simulation (3 reviewers in parallel)",
    progress_pct: 94,
  }).eq("id", input.draft_id);

  const applicationText = input.sections.map(s => `## ${s.section_name}\n${s.content}`).join("\n\n")
    + `\n\n## Budget\n${input.budget_json}`;

  const scoringCriteria = input.rfp_analysis.scoring_criteria
    .map(c => `- **${c.criterion}** (${c.max_points} points): ${c.description}`)
    .join("\n");

  // Run all 3 reviewers in parallel
  const reviewerResults = await Promise.all(
    PERSONA_PROMPTS.map(({ prompt }) =>
      runReviewerPersona(prompt, applicationText, scoringCriteria)
    )
  );

  // Calculate consensus metrics
  const totalScores = reviewerResults.map(r => r.total_score);
  const maxScores = reviewerResults.map(r => r.max_possible_score);
  const consensusScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
  const consensusMax = maxScores[0] || 100;
  const mean = consensusScore;
  const variance = totalScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / totalScores.length;
  const stdDev = Math.sqrt(variance);

  // Determine consensus recommendation
  const recommendations = reviewerResults.map(r => r.recommendation);
  const fundCount = recommendations.filter(r => r === "fund").length;
  const dontFundCount = recommendations.filter(r => r === "do_not_fund").length;
  const consensusRec = fundCount >= 2 ? "fund"
    : dontFundCount >= 2 ? "do_not_fund"
    : "fund_with_conditions";

  // Aggregate and rank revisions from all reviewers
  const allConcerns: Array<{
    section: string;
    issue: string;
    suggested_fix: string;
    reviewers_who_flagged: string[];
    expected_score_impact: number;
  }> = [];

  for (const reviewer of reviewerResults) {
    for (const concern of reviewer.concerns) {
      // Check if this concern is similar to an existing one
      const existing = allConcerns.find(c =>
        c.section === "general" && c.issue.toLowerCase().includes(concern.toLowerCase().slice(0, 20))
      );
      if (existing) {
        existing.reviewers_who_flagged.push(reviewer.persona);
        existing.expected_score_impact += 2;
      } else {
        allConcerns.push({
          section: "general",
          issue: concern,
          suggested_fix: "Address this concern in the relevant section",
          reviewers_who_flagged: [reviewer.persona],
          expected_score_impact: 3,
        });
      }
    }
  }

  // Sort by number of reviewers who flagged (more = higher priority), then by impact
  allConcerns.sort((a, b) =>
    b.reviewers_who_flagged.length - a.reviewers_who_flagged.length ||
    b.expected_score_impact - a.expected_score_impact
  );

  const rankedRevisions = allConcerns.map((c, i) => ({ rank: i + 1, ...c }));

  // Generate panel discussion summary
  const disagreements = [];
  if (stdDev > 10) {
    disagreements.push(`Significant score spread (std dev: ${stdDev.toFixed(1)}) indicates reviewer disagreement.`);
  }
  for (let i = 0; i < reviewerResults.length; i++) {
    for (let j = i + 1; j < reviewerResults.length; j++) {
      if (reviewerResults[i].recommendation !== reviewerResults[j].recommendation) {
        disagreements.push(
          `${reviewerResults[i].persona} recommended "${reviewerResults[i].recommendation}" while ${reviewerResults[j].persona} recommended "${reviewerResults[j].recommendation}".`
        );
      }
    }
  }

  const panelSummary = disagreements.length > 0
    ? `The review panel showed some disagreement. ${disagreements.join(" ")} Key areas of contention include scoring on methodology and community engagement.`
    : `The review panel reached broad consensus. All three reviewers agreed the application is ${consensusRec === "fund" ? "strong and fundable" : consensusRec === "fund_with_conditions" ? "promising but needs modifications" : "not ready for funding in its current form"}.`;

  const simulation: ReviewSimulationOutput = {
    reviewers: reviewerResults,
    consensus_score: Math.round(consensusScore * 10) / 10,
    consensus_max: consensusMax,
    consensus_pct: Math.round((consensusScore / consensusMax) * 1000) / 10,
    consensus_recommendation: consensusRec,
    score_variance: Math.round(stdDev * 10) / 10,
    ranked_revisions: rankedRevisions,
    panel_discussion_summary: panelSummary,
  };

  // Validate final output
  ReviewSimulationOutputSchema.parse(simulation);

  await supabase.from("grant_drafts").update({
    review_simulation: simulation,
    status: "review_simulated",
    progress_pct: 96,
    current_step: `Review simulation complete — Consensus: ${simulation.consensus_pct}%`,
  }).eq("id", input.draft_id);

  return simulation;
}
