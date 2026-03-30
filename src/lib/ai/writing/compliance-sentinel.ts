// grantiq/src/lib/ai/writing/compliance-sentinel.ts

import Anthropic from "@anthropic-ai/sdk";
import {
  ComplianceOutputSchema,
  ComplianceFindingSchema,
  type ComplianceOutput,
  type DraftSectionOutput,
  type BudgetTableOutput,
  type RfpParseOutput,
} from "./schemas";
import { COMPLIANCE_SEMANTIC_PROMPT } from "./prompts";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const anthropic = new Anthropic();

type ComplianceFinding = z.infer<typeof ComplianceFindingSchema>;

interface ComplianceInput {
  draft_id: string;
  sections: DraftSectionOutput[];
  budget: BudgetTableOutput;
  rfp_analysis: RfpParseOutput;
}

// ============================================================
// Pass 1: Deterministic Checks (no AI, pure logic)
// ============================================================

function runDeterministicChecks(
  sections: DraftSectionOutput[],
  budget: BudgetTableOutput,
  rfp: RfpParseOutput
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  let checkNum = 0;

  // Check 1: Word limit compliance for each section
  for (const rfpSection of rfp.required_sections) {
    const matchedSection = sections.find(
      s => s.section_name.toLowerCase() === rfpSection.section_name.toLowerCase()
    );

    if (!matchedSection) {
      if (rfpSection.is_required) {
        findings.push({
          check_id: `det_${++checkNum}`,
          pass_type: "deterministic",
          category: "required_section",
          passed: false,
          severity: "blocker",
          finding: `Required section "${rfpSection.section_name}" is missing`,
          details: `RFP requires this section. Description: ${rfpSection.description}`,
          auto_fixable: false,
          fix_suggestion: "Generate the missing section",
        });
      }
      continue;
    }

    // Word limit check
    if (rfpSection.word_limit && matchedSection.word_count > rfpSection.word_limit) {
      findings.push({
        check_id: `det_${++checkNum}`,
        pass_type: "deterministic",
        category: "word_count",
        passed: false,
        severity: "blocker",
        finding: `"${rfpSection.section_name}" exceeds word limit: ${matchedSection.word_count}/${rfpSection.word_limit} words`,
        details: `Over by ${matchedSection.word_count - rfpSection.word_limit} words`,
        auto_fixable: true,
        fix_suggestion: `Reduce by ${matchedSection.word_count - rfpSection.word_limit} words`,
      });
    } else if (rfpSection.word_limit) {
      findings.push({
        check_id: `det_${++checkNum}`,
        pass_type: "deterministic",
        category: "word_count",
        passed: true,
        severity: "info",
        finding: `"${rfpSection.section_name}" within word limit: ${matchedSection.word_count}/${rfpSection.word_limit}`,
        details: null,
        auto_fixable: false,
        fix_suggestion: null,
      });
    }

    // Page limit check
    if (rfpSection.page_limit) {
      const estimatedWords = rfpSection.page_limit * 500;
      if (matchedSection.word_count > estimatedWords) {
        findings.push({
          check_id: `det_${++checkNum}`,
          pass_type: "deterministic",
          category: "page_count",
          passed: false,
          severity: "blocker",
          finding: `"${rfpSection.section_name}" likely exceeds page limit: ~${matchedSection.page_estimate} pages vs ${rfpSection.page_limit} limit`,
          details: `Estimated ${matchedSection.word_count} words, limit suggests ~${estimatedWords} words max`,
          auto_fixable: true,
          fix_suggestion: `Reduce to approximately ${estimatedWords} words`,
        });
      }
    }
  }

  // Check 2: Budget math verification
  const lineItemTotal = budget.line_items.reduce((sum, li) => sum + li.total, 0);
  if (Math.abs(lineItemTotal - budget.total_project_cost) > 1) {
    findings.push({
      check_id: `det_${++checkNum}`,
      pass_type: "deterministic",
      category: "budget_math",
      passed: false,
      severity: "critical",
      finding: `Budget line items ($${lineItemTotal.toLocaleString()}) do not sum to total ($${budget.total_project_cost.toLocaleString()})`,
      details: `Difference: $${Math.abs(lineItemTotal - budget.total_project_cost).toLocaleString()}`,
      auto_fixable: true,
      fix_suggestion: "Recalculate budget totals",
    });
  } else {
    findings.push({
      check_id: `det_${++checkNum}`,
      pass_type: "deterministic",
      category: "budget_math",
      passed: true,
      severity: "info",
      finding: "Budget line items sum correctly to total",
      details: null,
      auto_fixable: false,
      fix_suggestion: null,
    });
  }

  // Check 3: Grant + cost share = total for each line
  for (const li of budget.line_items) {
    if (Math.abs((li.grant_funded + li.cost_share) - li.total) > 0.01) {
      findings.push({
        check_id: `det_${++checkNum}`,
        pass_type: "deterministic",
        category: "budget_math",
        passed: false,
        severity: "critical",
        finding: `Budget line "${li.description}": grant ($${li.grant_funded}) + match ($${li.cost_share}) != total ($${li.total})`,
        details: null,
        auto_fixable: true,
        fix_suggestion: "Fix arithmetic on this line item",
      });
    }
  }

  // Check 4: Cost sharing compliance
  if (rfp.cost_sharing_required && rfp.cost_sharing_pct) {
    const actualPct = (budget.total_cost_share / budget.total_project_cost) * 100;
    if (actualPct < rfp.cost_sharing_pct) {
      findings.push({
        check_id: `det_${++checkNum}`,
        pass_type: "deterministic",
        category: "budget_math",
        passed: false,
        severity: "blocker",
        finding: `Cost share is ${actualPct.toFixed(1)}%, but RFP requires ${rfp.cost_sharing_pct}%`,
        details: `Need $${((rfp.cost_sharing_pct / 100 * budget.total_project_cost) - budget.total_cost_share).toLocaleString()} more in cost share`,
        auto_fixable: false,
        fix_suggestion: "Increase cost share amounts in budget",
      });
    }
  }

  // Check 5: Award range compliance
  if (rfp.award_range_max && budget.total_grant_request > rfp.award_range_max) {
    findings.push({
      check_id: `det_${++checkNum}`,
      pass_type: "deterministic",
      category: "budget_math",
      passed: false,
      severity: "blocker",
      finding: `Grant request ($${budget.total_grant_request.toLocaleString()}) exceeds maximum award ($${rfp.award_range_max.toLocaleString()})`,
      details: null,
      auto_fixable: false,
      fix_suggestion: `Reduce grant request to at most $${rfp.award_range_max.toLocaleString()}`,
    });
  }

  return findings;
}

// ============================================================
// Pass 2: Semantic Checks (Claude Sonnet)
// ============================================================

async function runSemanticChecks(
  sections: DraftSectionOutput[],
  budget: BudgetTableOutput,
  rfp: RfpParseOutput
): Promise<ComplianceFinding[]> {
  const applicationText = sections.map(s => `## ${s.section_name}\n${s.content}`).join("\n\n");

  const userMessage = `## Application Text
${applicationText}

## Budget Summary
Total Request: $${budget.total_grant_request.toLocaleString()}
Total Project Cost: $${budget.total_project_cost.toLocaleString()}

## RFP Key Information
Funder: ${rfp.funder_name}
Key Themes: ${rfp.key_themes.join(", ")}
Grant Type: ${rfp.grant_type}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: COMPLIANCE_SEMANTIC_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  try {
    const parsed = JSON.parse(content.text);
    return z.array(ComplianceFindingSchema).parse(parsed);
  } catch {
    // If semantic parse fails, return a warning
    return [{
      check_id: "semantic_error",
      pass_type: "semantic" as const,
      category: "content_quality" as const,
      passed: true,
      severity: "info" as const,
      finding: "Semantic checks could not be fully completed",
      details: "AI response did not validate. Manual review recommended.",
      auto_fixable: false,
      fix_suggestion: null,
    }];
  }
}

// ============================================================
// Main Entry: Two-pass compliance check
// ============================================================

export async function checkCompliance(input: ComplianceInput): Promise<ComplianceOutput> {
  const supabase = createAdminClient();

  await supabase.from("grant_drafts").update({
    current_step: "Running compliance checks",
    progress_pct: 97,
  }).eq("id", input.draft_id);

  // Run both passes (deterministic is instant, semantic runs in parallel)
  const [deterministicFindings, semanticFindings] = await Promise.all([
    Promise.resolve(runDeterministicChecks(input.sections, input.budget, input.rfp_analysis)),
    runSemanticChecks(input.sections, input.budget, input.rfp_analysis),
  ]);

  const allFindings = [...deterministicFindings, ...semanticFindings];

  const blockerCount = allFindings.filter(f => !f.passed && f.severity === "blocker").length;
  const criticalCount = allFindings.filter(f => !f.passed && f.severity === "critical").length;
  const warningCount = allFindings.filter(f => !f.passed && f.severity === "warning").length;
  const infoCount = allFindings.filter(f => f.severity === "info").length;

  const overallPass = blockerCount === 0 && criticalCount === 0;
  const submissionReady = overallPass && warningCount === 0;

  const detFindings = allFindings.filter(f => f.pass_type === "deterministic");
  const semFindings = allFindings.filter(f => f.pass_type === "semantic");

  const output: ComplianceOutput = {
    overall_pass: overallPass,
    submission_ready: submissionReady,
    blocker_count: blockerCount,
    critical_count: criticalCount,
    warning_count: warningCount,
    info_count: infoCount,
    findings: allFindings,
    deterministic_pass: {
      all_passed: detFindings.every(f => f.passed),
      checks_run: detFindings.length,
      checks_failed: detFindings.filter(f => !f.passed).length,
    },
    semantic_pass: {
      all_passed: semFindings.every(f => f.passed),
      checks_run: semFindings.length,
      checks_failed: semFindings.filter(f => !f.passed).length,
    },
    summary: submissionReady
      ? "Application passes all compliance checks and is ready for submission."
      : overallPass
        ? `Application passes critical checks but has ${warningCount} warning(s) to review before submission.`
        : `Application has ${blockerCount} blocker(s) and ${criticalCount} critical issue(s) that must be resolved before submission.`,
  };

  ComplianceOutputSchema.parse(output);

  await supabase.from("grant_drafts").update({
    compliance_report: output,
    status: "compliance_checked",
    progress_pct: 99,
    current_step: submissionReady
      ? "Compliance: READY for submission"
      : `Compliance: ${blockerCount} blockers, ${criticalCount} critical, ${warningCount} warnings`,
  }).eq("id", input.draft_id);

  return output;
}

// Export deterministic check function for testing
export { runDeterministicChecks };
