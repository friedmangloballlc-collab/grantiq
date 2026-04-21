import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  searchFoundations,
  getFoundationDetail,
  nteeToSector,
  inferEligibility,
  estimateAwardRange,
  isActiveFunder,
  US_STATES,
} from "@/lib/ingestion/propublica-990";
import { recordHeartbeat } from "@/lib/cron/heartbeat";

// ---------------------------------------------------------------------------
// GET /api/cron/ingest-990
// Batch ingests private foundation data from ProPublica Nonprofit Explorer API.
// Processes one state per run to stay within Vercel timeout.
// ---------------------------------------------------------------------------

export const maxDuration = 300; // 5 minutes

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.ADMIN_SECRET}`) return true;
  return false;
}

const BATCH_SIZE = 25; // ProPublica returns 25 per page
// Bumped 20 → 40 (2026-04-21). 1000 foundations/run × 1 state/day =
// full country coverage in ~50 days at current rate. Still fits in
// 5-min window because ProPublica detail fetches are fast (~50ms each).
const MAX_PAGES_PER_RUN = 40;
const DETAIL_BATCH = 5; // Fetch 5 foundation details at a time (be polite to API)
// Bumped 300 → 100ms. ProPublica API has no documented rate limit
// and returns cached JSON, so sub-100ms is safe. 3x throughput gain.
const DELAY_MS = 100;

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const started = Date.now();
  const startedAt = new Date(started);

  // Track progress: which state + page to process next
  const { data: progress } = await db
    .from("ingestion_progress")
    .select("*")
    .eq("source", "propublica_990")
    .single();

  let stateIndex = progress?.state_index ?? 0;
  let pageIndex = progress?.page_index ?? 0;

  if (stateIndex >= US_STATES.length) {
    // All states processed — reset for next cycle
    stateIndex = 0;
    pageIndex = 0;
  }

  const state = US_STATES[stateIndex];
  let fundersCreated = 0;
  let grantsCreated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    logger.info("990-PF ingestion started", { state, stateIndex, pageIndex });

    let currentPage = pageIndex;

    for (let batch = 0; batch < MAX_PAGES_PER_RUN; batch++) {
      // Search for foundations in this state
      const { foundations, numPages } = await searchFoundations(state, currentPage);

      if (foundations.length === 0 || currentPage >= numPages) {
        // Done with this state — move to next
        stateIndex++;
        currentPage = 0;
        break;
      }

      // For each foundation, get details and upsert
      for (let i = 0; i < foundations.length; i += DETAIL_BATCH) {
        const batch = foundations.slice(i, i + DETAIL_BATCH);

        const details = await Promise.all(
          batch.map((f) => getFoundationDetail(f.ein).catch(() => null))
        );

        for (const detail of details) {
          if (!detail) { skipped++; continue; }
          if (!isActiveFunder(detail)) { skipped++; continue; }

          try {
            // Upsert funder profile
            const sector = nteeToSector(detail.ntee_code);
            const awards = estimateAwardRange(detail.latest_filing!.contributions_paid);
            const eligTypes = inferEligibility(detail);

            const { data: funder } = await db
              .from("funder_profiles")
              .upsert(
                {
                  ein: String(detail.ein),
                  funder_name: detail.name,
                  funder_type: "foundation" as const,
                  focus_areas: [sector],
                  avg_award_size: Math.round((awards.min + awards.max) / 2),
                  typical_award_range_min: awards.min,
                  typical_award_range_max: awards.max,
                  total_annual_giving: detail.latest_filing!.contributions_paid,
                  geographic_preference: { states: [detail.state], city: detail.city },
                  new_applicant_friendly: detail.latest_filing!.contributions_paid < 500000, // Smaller foundations tend to be more accessible
                  last_updated: new Date().toISOString(),
                },
                { onConflict: "ein" }
              )
              .select("id")
              .single();

            // Check if grant_source already exists for this funder
            const { data: existing } = await db
              .from("grant_sources")
              .select("id")
              .eq("funder_name", detail.name)
              .eq("source_type", "foundation")
              .eq("data_source", "api_crawl")
              .limit(1)
              .single();

            if (existing) {
              skipped++;
              continue;
            }

            // Create grant_source entry
            const description = buildDescription(detail);

            const { error: insertError } = await db
              .from("grant_sources")
              .insert({
                name: `${detail.name} — Grants Program`,
                funder_name: detail.name,
                funder_id: funder?.id ?? null,
                source_type: "foundation",
                category: sector,
                amount_min: awards.min,
                amount_max: awards.max,
                deadline_type: "rolling",
                recurrence: "annual",
                eligibility_types: eligTypes,
                states: detail.state ? [detail.state, "national"] : ["national"],
                description,
                status: "open",
                data_source: "api_crawl",
                is_active: true,
              });

            if (insertError) {
              errors++;
              logger.error("Failed to insert grant_source from 990", { ein: detail.ein, error: insertError.message });
            } else {
              grantsCreated++;
              if (funder) fundersCreated++;
            }
          } catch (err) {
            errors++;
            logger.error("990 processing error", { ein: detail.ein, error: String(err) });
          }
        }

        // Be polite to ProPublica
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }

      currentPage++;
      pageIndex = currentPage;

      // Check if we're running out of time (4 min safety margin)
      if (Date.now() - started > 240000) {
        logger.info("990 ingestion stopping early (time limit)", { state, currentPage });
        break;
      }
    }

    // Save progress
    await db
      .from("ingestion_progress")
      .upsert(
        {
          source: "propublica_990",
          state_index: stateIndex,
          page_index: pageIndex,
          last_run: new Date().toISOString(),
        },
        { onConflict: "source" }
      );

    const summary = {
      success: true,
      state,
      duration_ms: Date.now() - started,
      funders_created: fundersCreated,
      grants_created: grantsCreated,
      skipped,
      errors,
      next_state: US_STATES[stateIndex] ?? "COMPLETE",
      next_page: pageIndex,
    };

    logger.info("990-PF ingestion complete", summary);
    await recordHeartbeat({
      cronName: "ingest-990",
      startedAt,
      outcome: errors > 0 && fundersCreated > 0 ? "partial" : errors > 0 ? "error" : "ok",
      summary,
      errorMessage: errors > 0 ? `${errors} per-foundation errors` : null,
    });
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("990-PF ingestion failed", { error: message });
    await recordHeartbeat({
      cronName: "ingest-990",
      startedAt,
      outcome: "error",
      errorMessage: message,
    });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function buildDescription(detail: import("@/lib/ingestion/propublica-990").FoundationDetail): string {
  const parts: string[] = [];

  parts.push(`${detail.name} is a private foundation based in ${detail.city}, ${detail.state}.`);

  if (detail.latest_filing) {
    const giving = detail.latest_filing.contributions_paid;
    if (giving > 0) {
      parts.push(`In ${detail.latest_filing.tax_year}, the foundation distributed $${giving.toLocaleString()} in grants.`);
    }

    const assets = detail.latest_filing.total_assets;
    if (assets > 0) {
      parts.push(`Total assets: $${assets.toLocaleString()}.`);
    }
  }

  const sector = nteeToSector(detail.ntee_code);
  if (sector !== "general") {
    parts.push(`Primary focus area: ${sector.replace(/_/g, " ")}.`);
  }

  if (detail.latest_filing?.grants_to_individuals) {
    parts.push("This foundation makes grants to individuals as well as organizations.");
  }

  parts.push("Contact the foundation directly for application guidelines and deadlines.");

  return parts.join(" ");
}
