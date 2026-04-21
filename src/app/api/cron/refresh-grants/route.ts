import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  searchGrantsGov,
  type GrantsGovOpportunity,
} from "@/lib/ingestion/grants-gov-client";
import { recordHeartbeat } from "@/lib/cron/heartbeat";
import { isCronAuthorized } from "@/lib/cron/auth";

// Cron ceiling on Vercel Pro. Default would be 10-15s which is too
// short for 750 updates even when chunked. 300 is the Vercel Pro max.
export const maxDuration = 300;

// Parallel write chunk size. Supabase PgBouncer pool handles ~20
// concurrent writes comfortably; higher risks pool exhaustion under
// load from other routes running simultaneously.
const UPDATE_CHUNK_SIZE = 20;

// ---------------------------------------------------------------------------
// POST /api/cron/refresh-grants  (Vercel Cron daily at 06:00 UTC)
// Pulls the latest 100 grants from Grants.gov, upserts new/updated records,
// and closes grants whose deadline has passed.
// ---------------------------------------------------------------------------

/** Convert a Grants.gov opportunity into a grant_sources row for upsert. */
function toGrantSourceRow(opp: GrantsGovOpportunity) {
  return {
    name: opp.title,
    funder_name: opp.agency_name || "Unknown Agency",
    source_type: "federal" as const,
    url: opp.url,
    amount_min: opp.amount_min,
    amount_max: opp.amount_max,
    award_ceiling: opp.award_ceiling,
    award_floor: opp.award_floor,
    deadline: opp.close_date,
    deadline_type: "full_application" as const,
    recurrence: "annual" as const,
    description: opp.description || null,
    cfda_number: opp.cfda_number,
    cfda_numbers: opp.cfda_numbers,
    data_source: "api_crawl" as const,
    status: opp.status === "closed" ? "closed" : "open",
    is_active: opp.status !== "closed",
    external_id: opp.id,
    opportunity_number: opp.number || null,
    open_date: opp.open_date,
    archive_date: opp.archive_date,
    estimated_funding: opp.estimated_funding,
    estimated_awards_count: opp.estimated_awards_count,
    cost_sharing_required: opp.cost_sharing_required,
    applicant_eligibility_types: opp.applicant_eligibility_types,
    funding_activity_category: opp.funding_activity_category,
    competition_id: opp.competition_id,
    raw_text: opp.raw_json,
  };
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const startedAt = new Date(started);
  const supabase = createAdminClient();
  let added = 0;
  let updated = 0;
  let expired = 0;

  try {
    // -----------------------------------------------------------------------
    // 1. Fetch latest posted + forecasted opportunities from Grants.gov
    //
    // Ceiling math: Grants.gov allows up to 1000 rows per request; at 500
    // posted + 250 forecasted we cover roughly the newest ~3 weeks of
    // federal postings, which is more than enough to catch everything the
    // ingest crons would otherwise miss between runs. The upsert step
    // below dedupes on external_id, so re-fetching grants we already
    // have is cheap — it just refreshes deadline/amount/status fields.
    //
    // Cost profile: one Grants.gov API call (free), ~750 Supabase
    // selects, ~750 updates or inserts. Runs in 30-60s on Vercel Pro.
    // Stays well under the 5-minute cron timeout and doesn't touch
    // the user-facing request path.
    // -----------------------------------------------------------------------
    const [postedResult, forecastedResult] = await Promise.all([
      searchGrantsGov({ oppStatus: "posted", rows: 500, startRecordNum: 0 }),
      searchGrantsGov({ oppStatus: "forecasted", rows: 250, startRecordNum: 0 }),
    ]);

    const allOpportunities = [
      ...postedResult.opportunities,
      ...forecastedResult.opportunities,
    ];

    logger.info("Grants.gov fetch complete", {
      posted: postedResult.opportunities.length,
      forecasted: forecastedResult.opportunities.length,
      total: allOpportunities.length,
    });

    // -----------------------------------------------------------------------
    // 2. Upsert into grant_sources (deduplicate on external_id)
    // -----------------------------------------------------------------------
    if (allOpportunities.length > 0) {
      const rows = allOpportunities.map(toGrantSourceRow);

      // Check which external_ids already exist
      const externalIds = rows.map((r) => r.external_id);
      const { data: existing } = await supabase
        .from("grant_sources")
        .select("external_id")
        .in("external_id", externalIds);

      const existingSet = new Set(
        (existing ?? []).map((e: { external_id: string }) => e.external_id)
      );

      const newRows = rows.filter((r) => !existingSet.has(r.external_id));
      const updateRows = rows.filter((r) => existingSet.has(r.external_id));

      // Insert new grants
      if (newRows.length > 0) {
        const { error: insertError } = await supabase
          .from("grant_sources")
          .insert(newRows);

        if (insertError) {
          logger.error("Failed to insert new grants", {
            error: insertError.message,
          });
        } else {
          added = newRows.length;
        }
      }

      // Update existing grants (refresh deadline, amounts, status) in
      // parallel chunks. Sequential loop would take ~75s for 750 rows;
      // chunked Promise.all brings that to ~4-6s while staying under
      // the PgBouncer pool limit.
      for (let i = 0; i < updateRows.length; i += UPDATE_CHUNK_SIZE) {
        const chunk = updateRows.slice(i, i + UPDATE_CHUNK_SIZE);
        const results = await Promise.all(
          chunk.map((row) =>
            supabase
              .from("grant_sources")
              .update({
                deadline: row.deadline,
                amount_min: row.amount_min,
                amount_max: row.amount_max,
                award_ceiling: row.award_ceiling,
                award_floor: row.award_floor,
                status: row.status,
                is_active: row.is_active,
                description: row.description,
                url: row.url,
                opportunity_number: row.opportunity_number,
                open_date: row.open_date,
                archive_date: row.archive_date,
                estimated_funding: row.estimated_funding,
                estimated_awards_count: row.estimated_awards_count,
                cost_sharing_required: row.cost_sharing_required,
                applicant_eligibility_types: row.applicant_eligibility_types,
                funding_activity_category: row.funding_activity_category,
                cfda_numbers: row.cfda_numbers,
                raw_text: row.raw_text,
              })
              .eq("external_id", row.external_id)
          )
        );
        updated += results.filter((r) => !r.error).length;
      }
    }

    // -----------------------------------------------------------------------
    // 3. Mark grants past their deadline as closed / inactive
    // -----------------------------------------------------------------------
    const today = new Date().toISOString().split("T")[0];

    const { data: expiredGrants, error: expireError } = await supabase
      .from("grant_sources")
      .update({ is_active: false, status: "closed" })
      .eq("is_active", true)
      .lt("deadline", today)
      .not("deadline", "is", null)
      .select("id");

    if (expireError) {
      logger.error("Failed to expire grants", { error: expireError.message });
    } else {
      expired = expiredGrants?.length ?? 0;
    }

    // -----------------------------------------------------------------------
    // 4. Return summary
    // -----------------------------------------------------------------------
    const summary = {
      success: true,
      duration_ms: Date.now() - started,
      grants_fetched: allOpportunities.length,
      grants_added: added,
      grants_updated: updated,
      grants_expired: expired,
    };

    logger.info("Grant refresh complete", summary);
    await recordHeartbeat({
      cronName: "refresh-grants",
      startedAt,
      outcome: "ok",
      summary,
    });
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Grant refresh failed", { error: message });
    await recordHeartbeat({
      cronName: "refresh-grants",
      startedAt,
      outcome: "error",
      errorMessage: message,
    });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
