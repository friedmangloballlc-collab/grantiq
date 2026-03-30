import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { parseJob } from "./queue";
import { handleJob } from "./handlers/index";
import { scheduleDueCrawls, seedCrawlSources } from "./scheduler";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WORKER_ID = `worker-${process.pid}`;
const POLL_INTERVAL_MS = 2000;

async function pollAndProcess() {
  try {
    const { data, error } = await supabase.rpc("poll_next_job", {
      p_worker_id: WORKER_ID,
    });

    if (error || !data?.length) return;

    const job = parseJob(data[0]);
    console.log(`[${WORKER_ID}] Processing ${job.jobType} (${job.id})`);

    try {
      await handleJob(job, supabase);
      await supabase
        .from("job_queue")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job.id);
      console.log(`[${WORKER_ID}] Completed ${job.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const newStatus = job.attempts >= job.maxAttempts ? "dead" : "failed";
      await supabase
        .from("job_queue")
        .update({ status: newStatus, error_message: message, locked_by: null })
        .eq("id", job.id);
      console.error(`[${WORKER_ID}] Failed ${job.id}: ${message}`);
    }
  } catch (err) {
    console.error(`[${WORKER_ID}] Poll error:`, err);
  }
}

async function main() {
  console.log(`[${WORKER_ID}] Starting GrantIQ worker...`);
  await seedCrawlSources(supabase);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await scheduleDueCrawls(supabase);
    await pollAndProcess();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
