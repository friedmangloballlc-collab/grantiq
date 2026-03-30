import { createAdminClient } from "../../../src/lib/supabase/admin";
import { generateStrategy } from "../../../src/lib/ai/engines/strategy";

interface GenerateRoadmapPayload {
  org_id: string;
  user_id: string;
  tier: string;
}

interface GenerateRoadmapResult {
  status: "completed" | "failed";
  quarters_generated: number;
  total_grants_recommended: number;
  error?: string;
}

/**
 * generate_roadmap job handler
 *
 * Requires existing match results and readiness score.
 * Fetches both, runs Strategy Engine, stores results in funding_roadmaps table.
 */
export async function handleGenerateRoadmap(
  payload: GenerateRoadmapPayload
): Promise<GenerateRoadmapResult> {
  const db = createAdminClient();
  const { org_id, user_id, tier } = payload;

  try {
    // 1. Fetch org data
    const { data: org, error: orgError } = await db
      .from("organizations")
      .select("*, org_profiles(*), org_capabilities(*)")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return { status: "failed", quarters_generated: 0, total_grants_recommended: 0, error: "Organization not found" };
    }

    // 2. Fetch latest readiness score
    const { data: readinessRows } = await db
      .from("readiness_scores")
      .select("*")
      .eq("org_id", org_id)
      .order("scored_at", { ascending: false })
      .limit(1);

    const readiness = readinessRows?.[0];
    if (!readiness) {
      return {
        status: "failed",
        quarters_generated: 0,
        total_grants_recommended: 0,
        error: "No readiness score found. Run readiness assessment first.",
      };
    }

    // 3. Fetch grant matches (top 50 by score)
    const { data: matches } = await db
      .from("grant_matches")
      .select("*, grant_sources(name, funder_name, source_type, amount_min, amount_max, deadline)")
      .eq("org_id", org_id)
      .order("match_score", { ascending: false })
      .limit(50);

    if (!matches || matches.length === 0) {
      return {
        status: "failed",
        quarters_generated: 0,
        total_grants_recommended: 0,
        error: "No grant matches found. Run matching first.",
      };
    }

    // 4. Fetch current pipeline
    const { data: pipeline } = await db
      .from("grant_pipeline")
      .select("*, grant_sources(name)")
      .eq("org_id", org_id);

    // 5. Build inputs for Strategy Engine
    const capabilities = org.org_capabilities?.[0] ?? org.org_capabilities ?? {};
    const profile = org.org_profiles?.[0] ?? org.org_profiles ?? {};

    // Parse readiness criteria for eligible/blocked grant types
    const readinessCriteria = Array.isArray(readiness.criteria) ? readiness.criteria : [];
    const cFedScore =
      readinessCriteria.find((c: { criterion_id: string }) => c.criterion_id === "c_federal_registration")?.score ?? 0;
    const bFinScore =
      readinessCriteria.find((c: { criterion_id: string }) => c.criterion_id === "b_financial_systems")?.score ?? 0;
    const aLegalScore =
      readinessCriteria.find((c: { criterion_id: string }) => c.criterion_id === "a_legal_status")?.score ?? 0;
    const gNarrativeScore =
      readinessCriteria.find((c: { criterion_id: string }) => c.criterion_id === "g_mission_narrative")?.score ?? 0;

    const eligible: string[] = [];
    const blocked: string[] = [];

    if (aLegalScore >= 8 && bFinScore >= 7 && cFedScore >= 7) eligible.push("federal");
    else blocked.push("federal");
    if (aLegalScore >= 6 && bFinScore >= 5) eligible.push("state");
    else blocked.push("state");
    if (aLegalScore >= 5 && gNarrativeScore >= 5) eligible.push("foundation");
    else blocked.push("foundation");
    if (aLegalScore >= 5) eligible.push("corporate");
    else blocked.push("corporate");

    const currentDate = new Date().toISOString().split("T")[0];

    const matchedGrants = matches.map((m: any) => ({
      grant_id: m.grant_source_id,
      grant_name: m.grant_sources?.name ?? "Unknown",
      funder_name: m.grant_sources?.funder_name ?? "Unknown",
      source_type: m.grant_sources?.source_type ?? "foundation",
      match_score: m.match_score,
      win_probability: m.win_probability ?? "moderate",
      amount_range: `$${(m.grant_sources?.amount_min ?? 0).toLocaleString()} - $${(m.grant_sources?.amount_max ?? 0).toLocaleString()}`,
      deadline: m.grant_sources?.deadline ?? null,
    }));

    const pipelineItems = (pipeline ?? []).map((p: any) => ({
      grant_name: p.grant_sources?.name ?? "Unknown",
      stage: p.stage,
      deadline: p.deadline ?? null,
    }));

    // 6. Run Strategy Engine
    const strategy = await generateStrategy(
      { orgId: org_id, userId: user_id, tier },
      {
        name: org.name,
        entity_type: org.entity_type,
        state: org.state,
        annual_budget: org.annual_budget,
        employee_count: org.employee_count,
        has_grant_writer: capabilities.has_grant_writer ?? false,
        grant_history_level: profile.grant_history_level ?? null,
      },
      {
        overall_score: readiness.overall_score,
        tier_label:
          readiness.overall_score >= 90
            ? "excellent"
            : readiness.overall_score >= 70
              ? "good"
              : readiness.overall_score >= 50
                ? "moderate"
                : "not_ready",
        eligible_grant_types: eligible,
        blocked_grant_types: blocked,
        top_3_gaps: (readiness.gaps ?? []).slice(0, 3).map((gap: string, i: number) => ({
          criterion_name: gap,
          gap_description: gap,
          fix_action: readiness.recommendations?.[i] ?? "Address this gap",
          estimated_fix_hours: 8,
        })),
        criteria: readinessCriteria,
      },
      matchedGrants,
      pipelineItems,
      currentDate
    );

    // 7. Delete old roadmaps for this org, insert new quarters
    await db.from("funding_roadmaps").delete().eq("org_id", org_id);

    const roadmapRows = strategy.quarters.map((q) => ({
      org_id,
      quarter: q.quarter,
      year: q.year,
      recommended_grants: q.grants,
      strategy_notes: q.strategy_notes,
      total_potential_amount: q.grants.reduce((sum, g) => {
        const match = g.amount_range.match(/\$([\d,]+)/);
        return sum + (match ? parseInt(match[1].replace(/,/g, "")) : 0);
      }, 0),
      capacity_notes: `${q.capacity_hours_total} hours estimated. ${q.risk_assessment}`,
      risk_assessment: q.risk_assessment,
      generated_at: new Date().toISOString(),
    }));

    if (roadmapRows.length > 0) {
      const { error: insertError } = await db.from("funding_roadmaps").insert(roadmapRows);
      if (insertError) {
        console.error("Failed to save roadmap:", insertError);
        return {
          status: "failed",
          quarters_generated: strategy.quarters.length,
          total_grants_recommended: strategy.annual_summary.total_applications,
          error: `Roadmap generated but failed to save: ${insertError.message}`,
        };
      }
    }

    return {
      status: "completed",
      quarters_generated: strategy.quarters.length,
      total_grants_recommended: strategy.annual_summary.total_applications,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate_roadmap handler failed:", message);
    return { status: "failed", quarters_generated: 0, total_grants_recommended: 0, error: message };
  }
}
