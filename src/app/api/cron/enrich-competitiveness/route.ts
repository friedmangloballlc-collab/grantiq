import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSpendingByProgram, computeCompetitivenessScore } from "@/lib/ingestion/usaspending-client";
import { isCronAuthorized } from "@/lib/cron/auth";
import { recordHeartbeat } from "@/lib/cron/heartbeat";

/**
 * GET /api/cron/enrich-competitiveness
 * Enriches federal grants that have CFDA numbers with competitiveness data
 * from USAspending.gov. No API key needed — public endpoint.
 *
 * Processes 50 grants per run. Free API, no cost.
 */

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const started = Date.now();
  const startedAt = new Date(started);
  let enriched = 0;
  let errors = 0;

  try {
    // Find federal grants with CFDA numbers that haven't been enriched
    const { data: grants } = await supabase
      .from("grant_sources")
      .select("id, cfda_number, amount_max, estimated_awards_count")
      .eq("is_active", true)
      .eq("source_type", "federal")
      .not("cfda_number", "is", null)
      .is("estimated_awards_count", null) // Not yet enriched
      .order("created_at", { ascending: false })
      .limit(50);

    if (!grants?.length) {
      const __summary = { success: true, message: "No grants to enrich", duration_ms: Date.now() - started };
      await recordHeartbeat({ cronName: "enrich-competitiveness", startedAt, outcome: "ok", summary: __summary });
      return NextResponse.json(__summary);
    }

    logger.info("Competitiveness enrichment started", { count: grants.length });

    for (const grant of grants) {
      try {
        const spending = await getSpendingByProgram(grant.cfda_number);

        if (spending) {
          const comp = computeCompetitivenessScore(
            spending.total_awards,
            spending.average_award,
            grant.amount_max
          );

          await supabase
            .from("grant_sources")
            .update({
              estimated_awards_count: spending.total_awards,
              estimated_funding: spending.total_obligation,
            })
            .eq("id", grant.id);

          enriched++;
        }
      } catch (err) {
        errors++;
        logger.error("Competitiveness enrichment error", { grantId: grant.id, err: String(err) });
      }

      // Polite delay — USAspending is a public API
      await new Promise((r) => setTimeout(r, 500));
    }

    const summary = {
      success: true,
      duration_ms: Date.now() - started,
      grants_enriched: enriched,
      errors,
    };

    logger.info("Competitiveness enrichment complete", summary);
    await recordHeartbeat({ cronName: "enrich-competitiveness", startedAt, outcome: "ok", summary });
    return NextResponse.json(summary);
  } catch (err) {
    logger.error("Competitiveness enrichment failed", { err: String(err) });
    const __errMessage = String(err);
    await recordHeartbeat({ cronName: "enrich-competitiveness", startedAt, outcome: "error", errorMessage: __errMessage });
    return NextResponse.json({ success: false, error: __errMessage }, { status: 500 });
  }
}
