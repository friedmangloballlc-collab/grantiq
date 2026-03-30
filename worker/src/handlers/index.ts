import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "../queue.js";
import { handleCrawlSource } from "./crawl-source.js";
import { handleGenerateEmbedding } from "./generate-embedding.js";
import { handleMatchGrants } from "./match-grants.js";
import { handleScoreReadiness } from "./score-readiness.js";
import { handleGenerateRoadmap } from "./generate-roadmap.js";
import { handleWritingJob } from "./writing.js";
import { handleWeeklyDigest } from "./weekly-digest.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handleJob(job: Job, supabase: SupabaseClient): Promise<void> {
  switch (job.jobType) {
    case "match_grants":
      await handleMatchGrants({
        org_id: job.payload.org_id as string,
        user_id: job.payload.user_id as string,
        tier: (job.payload.tier as string) ?? "free",
      });
      break;
    case "generate_roadmap":
      await handleGenerateRoadmap({
        org_id: job.payload.org_id as string,
        user_id: job.payload.user_id as string,
        tier: (job.payload.tier as string) ?? "free",
      });
      break;
    case "score_readiness":
      await handleScoreReadiness({
        org_id: job.payload.org_id as string,
        user_id: job.payload.user_id as string,
        tier: (job.payload.tier as string) ?? "free",
      });
      break;
    case "crawl_source":
      await handleCrawlSource(job, supabase);
      break;
    case "generate_embedding":
      await handleGenerateEmbedding(job, supabase, openai);
      break;
    case "writing_pipeline":
      await handleWritingJob(job.payload as Parameters<typeof handleWritingJob>[0]);
      break;
    case "weekly_digest":
      await handleWeeklyDigest(supabase);
      break;
    default:
      throw new Error(`Unknown job type: ${job.jobType}`);
  }
}
