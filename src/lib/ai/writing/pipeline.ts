// grantaq/src/lib/ai/writing/pipeline.ts

import type { WritingTier, WritingContext } from "@/types/writing";
import { analyzeFunder } from "./funder-analyzer";
import { generateDraft } from "./draft-generator";
import { checkCoherence } from "./coherence-checker";
import { auditDraft, rewriteWithAuditFeedback } from "./ai-auditor";
import { simulateReview } from "./review-simulator";
import { checkCompliance } from "./compliance-sentinel";
import { retrieveNarrativeExamples } from "./narrative-memory";
import { createAdminClient } from "@/lib/supabase/admin";

interface PipelineInput {
  draft_id: string;
  tier: WritingTier;
  rfp_analysis_id: string;
  org_id: string;
  user_id: string;
  grant_source_id?: string;
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

    // 5. Build writing context
    const context: WritingContext = {
      org_id: input.org_id,
      user_id: input.user_id,
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
    };

    // 6. Generate draft (all sections + budget)
    const { sections, budget } = await generateDraft(input.draft_id, context);

    // 7. Coherence check
    const _coherence = await checkCoherence({
      draft_id: input.draft_id,
      sections,
      budget,
      rfp_analysis: rfpAnalysis,
    });

    // Tier 1 stops here (after compliance check below)
    let finalSections = sections;

    // 8. Tier 2 / Full Confidence: AI Audit + Rewrite + Review Simulation
    if (input.tier === "tier2_ai_audit" || input.tier === "full_confidence" || input.tier === "tier3_expert") {
      const audit = await auditDraft({
        draft_id: input.draft_id,
        sections,
        budget_json: JSON.stringify(budget, null, 2),
        rfp_analysis: rfpAnalysis,
        funder_analysis: context.funder_analysis,
      });

      // Rewrite sections based on audit feedback
      finalSections = await rewriteWithAuditFeedback(
        input.draft_id,
        sections,
        audit,
        rfpAnalysis,
        context.funder_analysis
      );

      // Review simulation
      await simulateReview({
        draft_id: input.draft_id,
        sections: finalSections,
        budget_json: JSON.stringify(budget, null, 2),
        rfp_analysis: rfpAnalysis,
        funder_analysis: context.funder_analysis,
      });
    }

    // 9. Compliance check (all tiers)
    await checkCompliance({
      draft_id: input.draft_id,
      sections: finalSections,
      budget,
      rfp_analysis: rfpAnalysis,
    });

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
