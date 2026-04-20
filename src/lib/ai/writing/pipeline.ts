// grantaq/src/lib/ai/writing/pipeline.ts

import type { WritingTier, WritingContext } from "@/types/writing";
import { analyzeFunder } from "./funder-analyzer";
import { generateDraft, type DraftSectionDeltaCallback, type DraftSectionDoneCallback } from "./draft-generator";
import { checkCoherence } from "./coherence-checker";
import { auditDraft, rewriteWithAuditFeedback } from "./ai-auditor";
import { simulateReview } from "./review-simulator";
import { checkCompliance } from "./compliance-sentinel";
import { retrieveNarrativeExamples } from "./narrative-memory";
import { buildFunderContextBlock } from "@/lib/grants/funder_context";
import { auditSection } from "@/lib/ai/agents/hallucination-auditor";
import { scoreDraft } from "@/lib/ai/agents/quality-scorer";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

interface PipelineInput {
  draft_id: string;
  tier: WritingTier;
  rfp_analysis_id: string;
  org_id: string;
  user_id: string;
  grant_source_id?: string;
  /**
   * Optional per-delta callback for streaming section text to the
   * browser via Supabase Realtime. The worker (worker/src/handlers/
   * writing.ts) initializes a broadcaster per draft and passes its
   * `delta` method here. Other callers (tests, scripts) leave
   * it undefined to skip streaming entirely.
   */
  onSectionDelta?: DraftSectionDeltaCallback;
  /**
   * Optional per-section completion callback paired with onSectionDelta.
   * Worker hooks broadcaster.done so the UI can lock the section's
   * accumulated text and hide the "writing..." indicator.
   */
  onSectionDone?: DraftSectionDoneCallback;
}

/**
 * The WritingPipeline orchestrates all engines in the correct order based
 * on the purchased tier:
 *
 * Tier 1 (AI Draft Only):
 *   RFP Parse -> Funder Analyze -> Draft -> Coherence -> Compliance -> Done
 *
 * Tier 2 (AI Draft + AI Audit) / Full Confidence:
 *   RFP Parse -> Funder Analyze -> Draft -> Coherence -> Audit -> Rewrite ->
 *   Review Simulation -> Compliance -> Done
 *
 * Tier 3 (AI Draft + Expert Audit):
 *   Same as Tier 2, then paused for human expert review (handled outside this pipeline)
 */
export async function runWritingPipeline(input: PipelineInput): Promise<void> {
  const supabase = createAdminClient();

  try {
    // 1. Load RFP analysis (already parsed during upload step)
    const { data: rfpRecord } = await supabase
      .from("grant_rfp_analyses")
      .select("parsed_data, funder_analysis")
      .eq("id", input.rfp_analysis_id)
      .single();

    if (!rfpRecord) throw new Error("RFP analysis not found");

    const rfpAnalysis = rfpRecord.parsed_data;

    // Look up subscription tier early so aiCall-routed services (funder
    // analysis, draft generation, etc.) can pass it through their
    // pre-flight usage gates. Falls back to 'free' if no subscription row
    // exists; the gates handle missing tier_limits gracefully.
    const { data: subRowEarly } = await supabase
      .from("subscriptions")
      .select("tier")
      .eq("org_id", input.org_id)
      .maybeSingle();
    const subscriptionTier: string = (subRowEarly?.tier as string | undefined) ?? "free";

    // 2. Run funder analysis if not already done
    let funderAnalysis = rfpRecord.funder_analysis;
    if (!funderAnalysis) {
      // Load funder profile from database
      const funderName = rfpAnalysis.funder_name;
      const { data: funderProfile } = await supabase
        .from("funder_profiles")
        .select("*")
        .ilike("funder_name", `%${funderName}%`)
        .limit(1)
        .single();

      // Load org profile
      const { data: org } = await supabase
        .from("organizations")
        .select("name, mission_statement, entity_type, state, city, annual_budget, employee_count, mission_embedding")
        .eq("id", input.org_id)
        .single();

      const { data: orgProfile } = await supabase
        .from("org_profiles")
        .select("population_served, program_areas, voice_profile")
        .eq("org_id", input.org_id)
        .single();

      if (funderProfile && org) {
        funderAnalysis = await analyzeFunder({
          org_id: input.org_id,
          user_id: input.user_id,
          subscription_tier: subscriptionTier,
          rfp_analysis_id: input.rfp_analysis_id,
          funder_profile: funderProfile,
          org_profile: {
            name: org.name,
            mission_statement: org.mission_statement || "",
            entity_type: org.entity_type,
            state: org.state || "",
            city: org.city || "",
            population_served: orgProfile?.population_served || [],
            program_areas: orgProfile?.program_areas || [],
            annual_budget: org.annual_budget,
            employee_count: org.employee_count,
          },
        });
      }

      await supabase.from("grant_drafts").update({
        status: "funder_analyzed",
        progress_pct: 10,
        current_step: "Funder analysis complete",
      }).eq("id", input.draft_id);
    }

    // 3. Load org context
    const { data: org } = await supabase
      .from("organizations")
      .select("name, mission_statement, entity_type, mission_embedding")
      .eq("id", input.org_id)
      .single();

    const { data: orgProfile } = await supabase
      .from("org_profiles")
      .select("population_served, program_areas, voice_profile")
      .eq("org_id", input.org_id)
      .single();

    const { data: orgCaps } = await supabase
      .from("org_capabilities")
      .select("*")
      .eq("org_id", input.org_id)
      .single();

    // 4. Retrieve narrative examples from memory
    const sectionTypes = rfpAnalysis.required_sections.map((s: { section_name: string }) =>
      s.section_name.toLowerCase()
    );
    const narrativeExamples = org?.mission_embedding
      ? await retrieveNarrativeExamples(input.org_id, org.mission_embedding, sectionTypes)
      : [];

    // 4a. Build funder context block from existing 990 data (Unit 9a).
    // Returns null when no funder_profiles row resolves OR when the row
    // has no usable fields. Caller (draft-generator) will skip including
    // the block in cacheable context if null — never emit empty stubs.
    const funderContextBlock = input.grant_source_id
      ? await buildFunderContextBlock(input.grant_source_id)
      : null;

    // 5. Build writing context
    const context: WritingContext = {
      org_id: input.org_id,
      user_id: input.user_id,
      subscription_tier: subscriptionTier,
      rfp_analysis: rfpAnalysis,
      funder_analysis: funderAnalysis || {
        funder_name: rfpAnalysis.funder_name,
        funder_type: rfpAnalysis.grant_type,
        mission_alignment_notes: "Funder profile not available — writing based on RFP analysis only.",
        giving_trends: { direction: "unknown", total_annual_giving: null, avg_award_size: null, typical_range: { min: null, max: null } },
        stated_priorities: rfpAnalysis.key_themes,
        geographic_focus: [],
        past_award_patterns: { favors_new_applicants: null, typical_org_size: null, repeat_funding_common: null, avg_grant_duration_years: null },
        language_preferences: rfpAnalysis.key_themes,
        red_flags: [],
        writing_recommendations: ["Focus on RFP requirements and scoring criteria."],
        alignment_score: 50,
      },
      org_profile: {
        name: org?.name || "",
        mission_statement: org?.mission_statement || "",
        entity_type: org?.entity_type || "",
        population_served: orgProfile?.population_served || [],
        program_areas: orgProfile?.program_areas || [],
        voice_profile: orgProfile?.voice_profile || null,
      },
      org_capabilities: orgCaps || {},
      narrative_examples: narrativeExamples,
      funder_context_block: funderContextBlock,
    };

    // 6. Generate draft (all sections + budget)
    const { sections, budget } = await generateDraft(
      input.draft_id,
      context,
      input.onSectionDelta,
      input.onSectionDone
    );

    // 7. Coherence check
    const _coherence = await checkCoherence({
      draft_id: input.draft_id,
      org_id: input.org_id,
      user_id: input.user_id,
      subscription_tier: subscriptionTier,
      sections,
      budget,
      rfp_analysis: rfpAnalysis,
    });

    // 7a. Hallucination Auditor: run on every section in parallel.
    // Persist each audit row; tier-aware blocking in UI (Tier 2/3
    // gate advancement on blocked verdicts). Fail-open if audit fails.
    // Source RFP text is on rfp_analysis (from rfp-parser).
    const rfpSourceText = ((rfpAnalysis as unknown as { source_rfp_text?: string }).source_rfp_text) ?? "";
    const auditResults = await Promise.all(
      sections.map((section) =>
        auditSection({
          sectionText: section.content,
          sectionName: section.section_name,
          rfpText: rfpSourceText,
          funderContextBlock: context.funder_context_block ?? null,
          orgProfile: {
            name: context.org_profile.name,
            mission_statement: context.org_profile.mission_statement,
            population_served: context.org_profile.population_served,
            program_areas: context.org_profile.program_areas,
          },
          context: {
            org_id: input.org_id,
            user_id: input.user_id,
            subscription_tier: subscriptionTier,
            draft_id: input.draft_id,
          },
        }).then((result) => ({ section, result }))
      )
    );

    // Persist audit rows (best-effort; never block pipeline)
    for (const { section, result } of auditResults) {
      await supabase.from("section_audits").insert({
        draft_id: input.draft_id,
        section_name: section.section_name,
        section_type: (section as unknown as { section_type?: string }).section_type ?? null,
        claims_total: result.claimsTotal,
        claims_grounded: result.claimsGrounded,
        claims_ungrounded: result.claimsUngrounded,
        verdict: result.verdict,
        claims_detail: result.claimsDetail,
        audited_by: "writing.hallucination_audit.v1",
        input_tokens: result.tokensUsed.input,
        output_tokens: result.tokensUsed.output,
        cached_input_tokens: result.tokensUsed.cached,
      });
    }

    // Tier 2 / Full Confidence: block pipeline advancement if any
    // section has verdict='blocked'. Tier 1 advisory-only; ship anyway.
    const hasBlocked = auditResults.some((r) => r.result.verdict === "blocked");
    if (
      hasBlocked &&
      (input.tier === "tier2_ai_audit" ||
        input.tier === "full_confidence" ||
        input.tier === "tier3_expert")
    ) {
      await supabase
        .from("grant_drafts")
        .update({
          status: "audit_blocked",
          current_step: "Hallucination audit flagged claims — operator review required",
        })
        .eq("id", input.draft_id);
      return; // Halt pipeline; operator resolves via UI then retriggers
    }

    // Tier 1 stops here (after compliance check below)
    let finalSections = sections;

    // 8. Tier 2 / Full Confidence: AI Audit + Rewrite + Review Simulation
    if (input.tier === "tier2_ai_audit" || input.tier === "full_confidence" || input.tier === "tier3_expert") {
      const audit = await auditDraft({
        draft_id: input.draft_id,
        org_id: input.org_id,
        user_id: input.user_id,
        subscription_tier: subscriptionTier,
        sections,
        budget_json: JSON.stringify(budget, null, 2),
        rfp_analysis: rfpAnalysis,
        funder_analysis: context.funder_analysis,
      });

      // Rewrite sections based on audit feedback
      finalSections = await rewriteWithAuditFeedback(
        input.draft_id,
        input.org_id,
        input.user_id,
        subscriptionTier,
        sections,
        audit,
        rfpAnalysis,
        context.funder_analysis
      );

      // Review simulation
      await simulateReview({
        draft_id: input.draft_id,
        org_id: input.org_id,
        user_id: input.user_id,
        subscription_tier: subscriptionTier,
        sections: finalSections,
        budget_json: JSON.stringify(budget, null, 2),
        rfp_analysis: rfpAnalysis,
        funder_analysis: context.funder_analysis,
      });
    }

    // 9. Compliance check (all tiers)
    await checkCompliance({
      draft_id: input.draft_id,
      org_id: input.org_id,
      user_id: input.user_id,
      subscription_tier: subscriptionTier,
      sections: finalSections,
      budget,
      rfp_analysis: rfpAnalysis,
    });

    // 9a. Application Quality Scorer: pre-submission rubric score.
    // Runs for ALL tiers (including Tier 1) — score is a conversion
    // lever even on free/starter. Fail-open: score errors don't
    // prevent completion.
    try {
      const contentHash = createHash("sha256")
        .update(finalSections.map((s) => s.content).join("\n"))
        .digest("hex");

      const scoreResult = await scoreDraft({
        draftId: input.draft_id,
        sections: finalSections.map((s) => ({
          section_name: s.section_name,
          content: s.content,
        })),
        budget,
        rfpAnalysis: rfpAnalysis as unknown as Parameters<typeof scoreDraft>[0]["rfpAnalysis"],
        funderContextBlock: context.funder_context_block ?? null,
        context: {
          org_id: input.org_id,
          user_id: input.user_id,
          subscription_tier: subscriptionTier,
        },
      });

      await supabase.from("draft_quality_scores").insert({
        draft_id: input.draft_id,
        total_score: scoreResult.totalScore,
        max_possible: scoreResult.maxPossible,
        criteria_detail: scoreResult.criteriaDetail,
        rubric_source: scoreResult.rubricSource,
        draft_content_hash: contentHash,
        improvements_ranked: scoreResult.improvementsRanked,
        verdict: scoreResult.verdict,
        scored_by: "writing.quality_scorer.v1",
      });
    } catch (scoreErr) {
      // Score failure never blocks completion; operators just don't see a score
      console.error("quality_scorer failed", { draft_id: input.draft_id, err: String(scoreErr) });
    }

    // 10. Mark complete
    await supabase.from("grant_drafts").update({
      status: "completed",
      progress_pct: 100,
      current_step: "Complete",
      completed_at: new Date().toISOString(),
    }).eq("id", input.draft_id);

  } catch (error) {
    // Mark as failed with error message
    const supabase = createAdminClient();
    await supabase.from("grant_drafts").update({
      status: "failed",
      error_message: error instanceof Error ? error.message : "Unknown error",
      current_step: "Failed",
    }).eq("id", input.draft_id);

    throw error;
  }
}
