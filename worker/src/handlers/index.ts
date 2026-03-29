import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "../queue.js";
import { handleCrawlSource } from "./crawl-source.js";
import { handleGenerateEmbedding } from "./generate-embedding.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      await handleCrawlSource(job, supabase);
      break;
    case "generate_embedding":
      await handleGenerateEmbedding(job, supabase, openai);
      break;
    case "weekly_digest":
      console.log(`[handler] weekly_digest — TODO: Plan 6`);
      break;
    default:
      throw new Error(`Unknown job type: ${job.jobType}`);
  }
}
