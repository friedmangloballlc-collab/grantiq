import { SupabaseClient } from "@supabase/supabase-js";

const MAX_CONSECUTIVE_FAILURES = 5;

export async function scheduleDueCrawls(supabase: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();

  const { data: sources, error } = await supabase
    .from("crawl_sources")
    .select("id, source_name, crawl_frequency_hours, last_crawled_at, consecutive_failures")
    .eq("is_active", true)
    .lt("consecutive_failures", MAX_CONSECUTIVE_FAILURES);

  if (error) {
    console.error("Scheduler: failed to fetch crawl sources:", error.message);
    return 0;
  }
  if (!sources || sources.length === 0) return 0;

  let enqueued = 0;

  for (const source of sources) {
    const freqHours = source.crawl_frequency_hours ?? 24;
    const lastCrawled = source.last_crawled_at
      ? new Date(source.last_crawled_at)
      : new Date(0);
    const nextCrawlDue = new Date(lastCrawled.getTime() + freqHours * 60 * 60 * 1000);

    if (new Date(now) >= nextCrawlDue) {
      const { data: existing } = await supabase
        .from("job_queue")
        .select("id")
        .eq("job_type", "crawl_source")
        .in("status", ["pending", "processing"])
        .contains("payload", { crawl_source_id: source.id })
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { error: insertError } = await supabase.from("job_queue").insert({
        job_type: "crawl_source",
        payload: { crawl_source_id: source.id },
        status: "pending",
        priority: 3,
        max_attempts: 3,
        scheduled_for: now,
      });

      if (insertError) {
        console.error(`Scheduler: failed to enqueue crawl for ${source.source_name}:`, insertError.message);
      } else {
        console.log(`Scheduler: enqueued crawl for ${source.source_name}`);
        enqueued++;
      }
    }
  }

  return enqueued;
}

/**
 * Schedules a daily `send_sequence_emails` job if one hasn't already run today.
 * Safe to call in the poll loop — only enqueues when the last job was >23 hours ago.
 */
export async function scheduleSequenceEmails(supabase: SupabaseClient): Promise<void> {
  const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

  // Check if a job was recently completed or is pending
  const { data: existing } = await supabase
    .from("job_queue")
    .select("id")
    .eq("job_type", "send_sequence_emails")
    .in("status", ["pending", "processing", "completed"])
    .gte("created_at", twentyThreeHoursAgo)
    .limit(1);

  if (existing && existing.length > 0) return;

  const { error } = await supabase.from("job_queue").insert({
    job_type: "send_sequence_emails",
    payload: {},
    status: "pending",
    priority: 5,
    max_attempts: 3,
    scheduled_for: new Date().toISOString(),
  });

  if (error) {
    console.error("Scheduler: failed to enqueue send_sequence_emails:", error.message);
  } else {
    console.log("Scheduler: enqueued send_sequence_emails");
  }
}

export async function seedCrawlSources(supabase: SupabaseClient): Promise<void> {
  const sources = [
    {
      source_name: "Grants.gov — Posted Opportunities",
      source_type: "api",
      base_url: "https://apply07.grants.gov/grantsws/rest/opportunities/search",
      config: { api: "grants_gov", status: "posted" },
      crawl_frequency_hours: 24,
      is_active: true,
      grants_discovered_total: 0,
      consecutive_failures: 0,
    },
    {
      source_name: "SAM.gov — Active Opportunities",
      source_type: "api",
      base_url: "https://api.sam.gov/opportunities/v2/search",
      config: { api: "sam_gov", ptype: "o" },
      crawl_frequency_hours: 24,
      is_active: true,
      grants_discovered_total: 0,
      consecutive_failures: 0,
    },
  ];

  const { error } = await supabase
    .from("crawl_sources")
    .upsert(sources, { onConflict: "source_name", ignoreDuplicates: false });

  if (error) {
    console.error("Failed to seed crawl_sources:", error.message);
  } else {
    console.log("Crawl sources seeded:", sources.map((s) => s.source_name).join(", "));
  }
}
