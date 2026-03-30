// grantiq/worker/src/handlers/writing.ts

import { runWritingPipeline } from "../../../src/lib/ai/writing/pipeline.js";

interface WritingJobPayload {
  draft_id: string;
  tier: "tier1_ai_only" | "tier2_ai_audit" | "tier3_expert" | "full_confidence";
  rfp_analysis_id: string;
  org_id: string;
  user_id: string;
  grant_source_id?: string;
}

/**
 * Background worker handler for writing_pipeline jobs.
 * Called by the job queue polling loop in worker/src/index.ts.
 */
export async function handleWritingJob(payload: WritingJobPayload): Promise<void> {
  console.log(`[Writing Worker] Starting pipeline for draft ${payload.draft_id} (tier: ${payload.tier})`);

  await runWritingPipeline({
    draft_id: payload.draft_id,
    tier: payload.tier,
    rfp_analysis_id: payload.rfp_analysis_id,
    org_id: payload.org_id,
    user_id: payload.user_id,
    grant_source_id: payload.grant_source_id,
  });

  console.log(`[Writing Worker] Pipeline completed for draft ${payload.draft_id}`);
}
