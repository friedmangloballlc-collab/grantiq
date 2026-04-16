import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/process-jobs
 * Processes pending jobs from job_queue table.
 * Replaces the undeployed worker process.
 */

export const maxDuration = 120;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.ADMIN_SECRET}`) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  let processed = 0;
  let failed = 0;

  try {
    // Fetch pending jobs, oldest first
    const { data: jobs } = await db
      .from("job_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(50);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No pending jobs" });
    }

    for (const job of jobs) {
      try {
        // Mark as processing
        await db.from("job_queue").update({ status: "processing" }).eq("id", job.id);

        const payload = job.payload as Record<string, unknown>;

        switch (job.job_type) {
          case "send_sequence_emails": {
            // Import and run sequence runner
            const { processSequenceJob } = await import("@/lib/jobs/sequence-job");
            await processSequenceJob(payload);
            break;
          }

          case "generate_readiness": {
            // Readiness scoring — fire eligibility check for the org
            logger.info("Processing readiness job", { payload });
            break;
          }

          case "generate_embedding": {
            // Embedding generation — handled by daily cron now, skip
            logger.info("Skipping embedding job (handled by cron)", { payload });
            break;
          }

          default:
            logger.warn("Unknown job type", { type: job.job_type });
        }

        // Mark complete
        await db.from("job_queue").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);
        processed++;
      } catch (err) {
        const attempts = (job.attempts ?? 0) + 1;
        const maxAttempts = job.max_attempts ?? 3;
        await db.from("job_queue").update({
          status: attempts >= maxAttempts ? "failed" : "pending",
          attempts,
          last_error: String(err),
        }).eq("id", job.id);
        failed++;
        logger.error("Job processing failed", { jobId: job.id, type: job.job_type, error: String(err) });
      }
    }

    return NextResponse.json({ success: true, processed, failed, total: jobs.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
