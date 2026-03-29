import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "../queue.js";
import { fetchAllGrantsGov } from "../../../src/lib/ingestion/grants-gov-client.js";
import { fetchAllSamGov } from "../../../src/lib/ingestion/sam-gov-client.js";

export interface CrawlResult {
  crawl_source_id: string;
  grants_discovered: number;
  status: "success" | "partial" | "failed";
  error?: string;
}

export async function handleCrawlSource(
  job: Job,
  supabase: SupabaseClient
): Promise<CrawlResult> {
  const { crawl_source_id } = job.payload as { crawl_source_id?: string };

  if (!crawl_source_id) {
    throw new Error("crawl_source_id is required in job payload");
  }

  const { data: source, error: sourceError } = await supabase
    .from("crawl_sources")
    .select("*")
    .eq("id", crawl_source_id)
    .single();

  if (sourceError || !source) {
    throw new Error(sourceError?.message ?? `Crawl source ${crawl_source_id} not found`);
  }

  const config: { api?: string; api_key?: string } = source.config ?? {};
  const startTime = Date.now();
  let grantsDiscovered = 0;
  let status: "success" | "partial" | "failed" = "success";
  let errorMessage: string | null = null;

  try {
    if (config.api === "grants_gov") {
      for await (const page of fetchAllGrantsGov("posted", 100)) {
        const rows = page.map((opp) => ({
          external_id: opp.id,
          source: "grants_gov",
          name: opp.title,
          funder_name: opp.agency_name,
          description: opp.description,
          open_date: opp.open_date,
          close_date: opp.close_date,
          amount_min: opp.amount_min,
          amount_max: opp.amount_max,
          status: opp.status,
          url: opp.url,
          raw_data: opp,
        }));

        const { error: upsertError } = await supabase
          .from("grant_sources")
          .upsert(rows, { onConflict: "external_id,source" });

        if (upsertError) {
          console.error("[crawl] Upsert error:", upsertError.message);
          status = "partial";
        }

        grantsDiscovered += page.length;
      }
    } else if (config.api === "sam_gov") {
      const apiKey = config.api_key ?? process.env.SAM_GOV_API_KEY ?? "";
      for await (const page of fetchAllSamGov(apiKey, 100)) {
        const rows = page.map((opp) => ({
          external_id: opp.id,
          source: "sam_gov",
          name: opp.title,
          funder_name: opp.agency_name,
          description: opp.description,
          open_date: opp.posted_date ?? null,
          close_date: opp.close_date,
          amount_min: null,
          amount_max: opp.amount_max,
          status: opp.status,
          url: opp.url,
          raw_data: opp,
        }));

        const { error: upsertError } = await supabase
          .from("grant_sources")
          .upsert(rows, { onConflict: "external_id,source" });

        if (upsertError) {
          console.error("[crawl] Upsert error:", upsertError.message);
          status = "partial";
        }

        grantsDiscovered += page.length;
      }
    } else {
      console.log(`[crawl] Unknown api type in config: ${config.api}`);
    }
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[crawl] Error:", errorMessage);
  }

  // Log crawl result
  await supabase.from("crawl_logs").insert({
    crawl_source_id,
    status,
    grants_discovered: grantsDiscovered,
    duration_ms: Date.now() - startTime,
    error_message: errorMessage,
  });

  // Update crawl_sources metadata
  const now = new Date().toISOString();
  await supabase
    .from("crawl_sources")
    .update({
      last_crawled_at: now,
      ...(status !== "failed"
        ? {
            consecutive_failures: 0,
            grants_discovered_total:
              (source.grants_discovered_total ?? 0) + grantsDiscovered,
          }
        : {
            consecutive_failures: (source.consecutive_failures ?? 0) + 1,
          }),
    })
    .eq("id", crawl_source_id);

  return { crawl_source_id, grants_discovered: grantsDiscovered, status, ...(errorMessage ? { error: errorMessage } : {}) };
}
