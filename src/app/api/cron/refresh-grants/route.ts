import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  searchGrantsGov,
  type GrantsGovOpportunity,
} from "@/lib/ingestion/grants-gov-client";

// ---------------------------------------------------------------------------
// POST /api/cron/refresh-grants  (Vercel Cron daily at 06:00 UTC)
// Pulls the latest 100 grants from Grants.gov, upserts new/updated records,
// and closes grants whose deadline has passed.
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  // Vercel Cron sends this header automatically in production
  const cronSecret = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true;

  // Manual / external scheduler auth via Bearer token
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.ADMIN_SECRET}`) return true;

  return false;
}

/** Convert a Grants.gov opportunity into a grant_sources row for upsert. */
function toGrantSourceRow(opp: GrantsGovOpportunity) {
  return {
    name: opp.title,
    funder_name: opp.agency_name || "Unknown Agency",
    source_type: "federal" as const,
    url: opp.url,
    amount_min: opp.amount_min,
    amount_max: opp.amount_max,
    deadline: opp.close_date, // already ISO from the client
    deadline_type: "full_application" as const,
    recurrence: "annual" as const,
    description: opp.description || null,
    cfda_number: opp.cfda_number,
    data_source: "api_crawl" as const,
    status: opp.status === "closed" ? "closed" : "open",
    is_active: opp.status !== "closed",
    external_id: opp.id, // Grants.gov opportunity ID for dedup
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const supabase = createAdminClient();
  let added = 0;
  let updated = 0;
  let expired = 0;

  try {
    // -----------------------------------------------------------------------
    // 1. Fetch latest 100 posted opportunities from Grants.gov
    // -----------------------------------------------------------------------
    const result = await searchGrantsGov({
      oppStatus: "posted",
      rows: 100,
      startRecordNum: 0,
    });

    logger.info("Grants.gov fetch complete", {
      hitCount: result.total,
      fetched: result.opportunities.length,
    });

    // -----------------------------------------------------------------------
    // 2. Upsert into grant_sources (deduplicate on external_id)
    // -----------------------------------------------------------------------
    if (result.opportunities.length > 0) {
      const rows = result.opportunities.map(toGrantSourceRow);

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

      // Update existing grants (refresh deadline, amounts, status)
      for (const row of updateRows) {
        const { error: updateError } = await supabase
          .from("grant_sources")
          .update({
            deadline: row.deadline,
            amount_min: row.amount_min,
            amount_max: row.amount_max,
            status: row.status,
            is_active: row.is_active,
            description: row.description,
            url: row.url,
          })
          .eq("external_id", row.external_id);

        if (!updateError) updated++;
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
      grants_fetched: result.opportunities.length,
      grants_added: added,
      grants_updated: updated,
      grants_expired: expired,
    };

    logger.info("Grant refresh complete", summary);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Grant refresh failed", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
