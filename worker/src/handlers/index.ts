import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "../queue";
import { handleCrawlSource } from "./crawl-source";
import { handleGenerateEmbedding } from "./generate-embedding";
import { handleMatchGrants } from "./match-grants";
import { handleScoreReadiness } from "./score-readiness";
import { handleGenerateRoadmap } from "./generate-roadmap";
import { handleWritingJob } from "./writing";
import { handleWeeklyDigest } from "./weekly-digest";

let _openai: OpenAI | null = null;
function getOpenAI() { return _openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

export async function handleJob(job: Job, supabase: SupabaseClient): Promise<void> {
  switch (job.jobType) {
    case "match_grants":
      await handleMatchGrants(
        { org_id: job.payload.org_id as string, user_id: job.payload.user_id as string, tier: (job.payload.tier as string) ?? "free" },
        supabase,
        getOpenAI()
      );
      break;
    case "score_readiness":
      await handleScoreReadiness(job, supabase);
      break;
    case "generate_roadmap":
      await handleGenerateRoadmap(job, supabase);
      break;
    case "crawl_source":
      await handleCrawlSource(job, supabase);
      break;
    case "generate_embedding":
      await handleGenerateEmbedding(job, supabase, getOpenAI());
      break;
    case "writing_pipeline":
      await handleWritingJob(job, supabase);
      break;
    case "weekly_digest":
      await handleWeeklyDigest(supabase);
      break;
    default:
      console.warn(`Unknown job type: ${job.jobType}`);
  }
}
