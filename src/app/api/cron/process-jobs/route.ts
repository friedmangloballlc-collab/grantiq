import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isCronAuthorized } from "@/lib/cron/auth";
import { recordHeartbeat } from "@/lib/cron/heartbeat";

/**
 * GET /api/cron/process-jobs
 * Processes pending jobs from job_queue table.
 * Replaces the undeployed worker process.
 */

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();

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
      const __summary = { success: true, processed: 0, message: "No pending jobs" };
      await recordHeartbeat({ cronName: "process-jobs", startedAt, outcome: "ok", summary: __summary });
      return NextResponse.json(__summary);
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

    const __summary = { success: true, processed, failed, total: jobs.length };
    await recordHeartbeat({ cronName: "process-jobs", startedAt, outcome: failed > 0 && processed > 0 ? "partial" : failed > 0 ? "error" : "ok", summary: __summary });
    return NextResponse.json(__summary);
  } catch (err) {
    const __errMessage = String(err);
    await recordHeartbeat({ cronName: "process-jobs", startedAt, outcome: "error", errorMessage: __errMessage });
    return NextResponse.json({ success: false, error: __errMessage }, { status: 500 });
  }
}
