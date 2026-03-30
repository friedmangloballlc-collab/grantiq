import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";
import type { Job } from "../queue";
import {
  buildEmbeddingText,
  batchGenerateEmbeddings,
  EMBEDDING_BATCH_SIZE,
} from "../../../src/lib/embeddings/generate-embeddings";

export interface EmbeddingResult {
  updated: number;
  failed: number;
  enqueued_next: boolean;
}

export async function handleGenerateEmbedding(
  job: Job,
  supabase: SupabaseClient,
  openai: OpenAI
): Promise<EmbeddingResult> {
  const batchSize: number =
    typeof job.payload.batch_size === "number"
      ? job.payload.batch_size
      : EMBEDDING_BATCH_SIZE;

  // Fetch grants with no embedding yet
  const { data: grants, error } = await supabase
    .from("grant_sources")
    .select("id, name, funder_name, description, category, eligibility_types, states")
    .is("description_embedding", null)
    .eq("status", "open")
    .limit(batchSize);

  if (error) {
    throw new Error(`Failed to fetch grants: ${error.message}`);
  }

  if (!grants || grants.length === 0) {
    return { updated: 0, failed: 0, enqueued_next: false };
  }

  const texts = grants.map((g) =>
    buildEmbeddingText({
      name: g.name ?? "",
      funder_name: g.funder_name ?? "",
      description: g.description ?? null,
      category: g.category ?? null,
      eligibility_types: Array.isArray(g.eligibility_types) ? g.eligibility_types : [],
      states: Array.isArray(g.states) ? g.states : [],
    })
  );

  const embeddings = await batchGenerateEmbeddings(texts, openai);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < grants.length; i++) {
    const embedding = embeddings[i];
    if (!embedding) {
      failed++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("grant_sources")
      .update({ description_embedding: embedding })
      .eq("id", grants[i].id);

    if (updateError) {
      console.error(`[embedding] Failed to update grant ${grants[i].id}:`, updateError.message);
      failed++;
    } else {
      updated++;
    }
  }

  // Self-enqueue if we filled the batch (more likely to remain)
  const enqueued_next = grants.length === batchSize;
  if (enqueued_next) {
    await supabase.from("job_queue").insert({
      job_type: "generate_embedding",
      payload: { batch_size: batchSize },
      status: "pending",
    });
  }

  console.log(
    `[embedding] updated=${updated} failed=${failed} enqueued_next=${enqueued_next}`
  );

  return { updated, failed, enqueued_next };
}
