import { config } from "dotenv";
config({ path: ".env.local" });

// Register @/ path alias for module resolution
import { resolve } from "path";
import { register } from "tsconfig-paths";
register({
  baseUrl: resolve(import.meta.dirname ?? __dirname, "../.."),
  paths: { "@/*": ["src/*"] },
});
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { parseJob } from "./queue";
import { handleJob } from "./handlers/index";
import { scheduleDueCrawls, seedCrawlSources, scheduleSequenceEmails, scheduleGrantVerification, scheduleCostWatchdog } from "./scheduler";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WORKER_ID = `worker-${process.pid}`;
const MAX_CONCURRENT = 3;
let activeJobs = 0;

async function pollNextJob() {
  const { data, error } = await supabase.rpc("poll_next_job", {
    p_worker_id: WORKER_ID,
  });
  if (error || !data?.length) return null;
  return parseJob(data[0]);
}

async function markComplete(jobId: string) {
  await supabase
    .from("job_queue")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", jobId);
  console.log(`[${WORKER_ID}] Completed ${jobId}`);
}

async function markFailed(jobId: string, err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  // Re-fetch current attempts to determine terminal status
  const { data } = await supabase
    .from("job_queue")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();
  const newStatus =
    data && data.attempts >= data.max_attempts ? "dead" : "failed";
  await supabase
    .from("job_queue")
    .update({ status: newStatus, error_message: message, locked_by: null })
    .eq("id", jobId);
  console.error(`[${WORKER_ID}] Failed ${jobId}: ${message}`);
}

/**
 * Attempt to pick up a single job if under concurrency limit.
 * Returns true if a job was claimed (caller can immediately try again).
 */
async function pollAndProcess(): Promise<boolean> {
  if (activeJobs >= MAX_CONCURRENT) return false;

  const job = await pollNextJob();
  if (!job) return false;

  console.log(
    `[${WORKER_ID}] Processing ${job.jobType} (${job.id}) — active: ${activeJobs + 1}/${MAX_CONCURRENT}`
  );
  activeJobs++;
  handleJob(job, supabase)
    .then(() => markComplete(job.id))
    .catch((err) => markFailed(job.id, err))
    .finally(() => activeJobs--);
  return true;
}

async function setupPgListen() {
  // LISTEN/NOTIFY for instant job pickup (Supabase Pro/Team only).
  // On free tier the connection may fail — we catch and fall back to polling.
  try {
    const pgClient = new pg.Client(process.env.DATABASE_URL);
    await pgClient.connect();
    await pgClient.query("LISTEN new_job");
    pgClient.on("notification", () => {
      // Trigger immediate poll on new job insertion
      pollAndProcess().catch(console.error);
    });
    pgClient.on("error", (err) => {
      console.warn(
        `[${WORKER_ID}] pg LISTEN error (non-fatal, falling back to polling):`,
        err.message
      );
    });
    console.log(`[${WORKER_ID}] LISTEN/NOTIFY active on 'new_job' channel`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[${WORKER_ID}] Could not set up LISTEN/NOTIFY (${message}). Polling only.`
    );
  }
}

async function main() {
  console.log(
    `[${WORKER_ID}] Starting GrantIQ worker (MAX_CONCURRENT=${MAX_CONCURRENT})...`
  );
  await seedCrawlSources(supabase);

  // Best-effort LISTEN/NOTIFY — polling loop below ensures correctness regardless
  if (process.env.DATABASE_URL) {
    await setupPgListen();
  } else {
    console.warn(
      `[${WORKER_ID}] DATABASE_URL not set — skipping LISTEN/NOTIFY, polling only`
    );
  }

  // Main loop: run schedulers then drain available job slots, then wait
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await scheduleDueCrawls(supabase);
    await scheduleSequenceEmails(supabase);
    await scheduleGrantVerification(supabase);
    await scheduleCostWatchdog(supabase);

    // Greedily claim up to MAX_CONCURRENT jobs before sleeping
    // eslint-disable-next-line no-await-in-loop
    while (await pollAndProcess()) {
      // keep claiming until no jobs remain or concurrency limit reached
    }

    // Short wait when jobs are running; longer when fully idle
    await new Promise((r) => setTimeout(r, activeJobs > 0 ? 500 : 2000));
  }
}

main().catch(console.error);
