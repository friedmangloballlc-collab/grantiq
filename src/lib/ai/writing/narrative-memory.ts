// grantiq/src/lib/ai/writing/narrative-memory.ts

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  NarrativeExtractionOutputSchema,
  type NarrativeExtractionOutput,
  type DraftSectionOutput,
} from "./schemas";
import { NARRATIVE_EXTRACTOR_SYSTEM_PROMPT } from "./prompts";
import { createAdminClient } from "@/lib/supabase/admin";

const anthropic = new Anthropic();
const openai = new OpenAI();

/**
 * After a grant is submitted, extract reusable narrative segments,
 * embed them, and store in narrative_segments for future retrieval.
 */
export async function extractAndStoreSegments(
  orgId: string,
  sections: DraftSectionOutput[],
  grantSourceId: string | null,
  outcome: "pending" | "won" | "lost" | null
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Extract segments via Claude
  const applicationText = sections.map(s => `## ${s.section_name}\n${s.content}`).join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: NARRATIVE_EXTRACTOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Extract reusable narrative segments from this grant application:\n\n${applicationText}` }],
  });

  const content = response.content[0];
  if (content.type !== "text") return;

  let extraction: NarrativeExtractionOutput;
  try {
    const parsed = JSON.parse(content.text);
    extraction = NarrativeExtractionOutputSchema.parse(parsed);
  } catch {
    // Silently fail — narrative memory is an enhancement, not critical path
    return;
  }

  // 2. Apply win boost: segments from winning applications get +1 quality
  const qualityBoost = outcome === "won" ? 1 : 0;

  // 3. Generate embeddings for each segment
  const textsToEmbed = extraction.segments.map(s => s.text);
  if (textsToEmbed.length === 0) return;

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: textsToEmbed,
  });

  // 4. Store segments with embeddings
  const inserts = extraction.segments.map((segment, i) => ({
    org_id: orgId,
    segment_type: segment.segment_type,
    text: segment.text,
    embedding: JSON.stringify(embeddingResponse.data[i].embedding),
    quality_score: Math.min(10, segment.quality_score + qualityBoost),
    source_grant_id: grantSourceId,
  }));

  await supabase.from("narrative_segments").insert(inserts);
}

/**
 * Retrieve top-scoring narrative segments by type for use as few-shot
 * examples in new applications. Uses pgvector similarity + quality ranking.
 *
 * Strategy: combine semantic similarity (mission/topic match) with quality
 * score to find the best examples the org has produced.
 */
export async function retrieveNarrativeExamples(
  orgId: string,
  missionEmbedding: number[],
  segmentTypes: string[],
  maxPerType: number = 3
): Promise<Array<{ segment_type: string; text: string; quality_score: number }>> {
  const supabase = createAdminClient();
  const results: Array<{ segment_type: string; text: string; quality_score: number }> = [];

  for (const segmentType of segmentTypes) {
    // Query: org-scoped, filtered by type, ordered by quality_score DESC
    // then by vector similarity to the org's mission
    const { data, error } = await supabase.rpc("match_narrative_segments", {
      query_embedding: JSON.stringify(missionEmbedding),
      match_org_id: orgId,
      match_segment_type: segmentType,
      match_threshold: 0.3,
      match_count: maxPerType,
    });

    if (!error && data) {
      for (const row of data) {
        results.push({
          segment_type: row.segment_type,
          text: row.text,
          quality_score: row.quality_score,
        });
      }
    }
  }

  return results;
}

/**
 * Update quality scores after learning grant outcome.
 * Won = boost all segments from this grant by +1.
 * Lost = no penalty (we don't know which segments were weak).
 */
export async function updateSegmentScoresOnOutcome(
  grantSourceId: string,
  outcome: "won" | "lost"
): Promise<void> {
  if (outcome !== "won") return; // Only boost winners

  const supabase = createAdminClient();
  const { data: segments } = await supabase
    .from("narrative_segments")
    .select("id, quality_score")
    .eq("source_grant_id", grantSourceId);

  if (!segments || segments.length === 0) return;

  // Boost each segment by 1 (capped at 10)
  for (const seg of segments) {
    await supabase
      .from("narrative_segments")
      .update({ quality_score: Math.min(10, seg.quality_score + 1) })
      .eq("id", seg.id);
  }
}
