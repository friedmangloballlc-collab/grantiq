import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "../queue.js";

export async function handleJob(job: Job, supabase: SupabaseClient): Promise<void> {
  switch (job.jobType) {
    case "match_grants":
      console.log(`[handler] match_grants for org ${job.payload.org_id} — TODO: Plan 3`);
      break;
    case "generate_roadmap":
      console.log(`[handler] generate_roadmap for org ${job.payload.org_id} — TODO: Plan 3`);
      break;
    case "score_readiness":
      console.log(`[handler] score_readiness for org ${job.payload.org_id} — TODO: Plan 3`);
      break;
    case "crawl_source":
      console.log(`[handler] crawl_source ${job.payload.source_id} — TODO: Plan 2`);
      break;
    case "generate_embedding":
      console.log(`[handler] generate_embedding for ${job.payload.entity_type}/${job.payload.entity_id} — TODO: Plan 2`);
      break;
    case "weekly_digest":
      console.log(`[handler] weekly_digest — TODO: Plan 6`);
      break;
    default:
      throw new Error(`Unknown job type: ${job.jobType}`);
  }
}
