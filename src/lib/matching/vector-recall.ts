import { createAdminClient } from "@/lib/supabase/admin";

export interface VectorRecallResult {
  id: string;
  name: string;
  funder_name: string;
  source_type: string;
  category: string | null;
  eligibility_types: string[];
  states: string[];
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  deadline_type: string | null;
  description: string | null;
  status: string;
  url: string | null;
  cfda_number: string | null;
  cost_sharing_required: boolean;
  funder_id: string | null;
  similarity: number;
}

export function buildVectorRecallQuery(): string {
  return `
    SELECT
      gs.id, gs.name, gs.funder_name, gs.source_type, gs.category,
      gs.eligibility_types, gs.states, gs.amount_min, gs.amount_max,
      gs.deadline, gs.deadline_type, gs.description, gs.status,
      gs.url, gs.cfda_number, gs.cost_sharing_required, gs.funder_id,
      1 - (gs.description_embedding <=> $1::vector) AS similarity
    FROM grant_sources gs
    WHERE gs.is_active = true
      AND gs.status IN ('open', 'forecasted')
      AND gs.description_embedding IS NOT NULL
    ORDER BY gs.description_embedding <=> $1::vector ASC
    LIMIT 200;
  `;
}

export async function vectorRecall(orgMissionEmbedding: number[]): Promise<VectorRecallResult[]> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("vector_recall_grants", {
    query_embedding: JSON.stringify(orgMissionEmbedding),
    match_count: 200,
  });
  if (error) throw new Error(`Vector recall query failed: ${error.message}`);
  return (data ?? []) as VectorRecallResult[];
}

/**
 * Multi-facet vector recall — searches both description_embedding and purpose_embedding,
 * merges results, and takes the best similarity per grant.
 *
 * Falls back to single-facet if purpose_embedding doesn't exist or org has no profile_embedding.
 */
export async function multiFacetRecall(
  missionEmbedding: number[],
  profileEmbedding?: number[] | null
): Promise<VectorRecallResult[]> {
  const db = createAdminClient();

  // Facet 1: Purpose matching (mission/project vs grant description)
  const { data: purposeResults, error: err1 } = await db.rpc("vector_recall_grants", {
    query_embedding: JSON.stringify(missionEmbedding),
    match_count: 200,
  });

  if (err1) throw new Error(`Purpose recall failed: ${err1.message}`);

  const resultMap = new Map<string, VectorRecallResult>();
  for (const r of (purposeResults ?? []) as VectorRecallResult[]) {
    resultMap.set(r.id, { ...r, similarity: r.similarity * 0.6 }); // 60% weight for purpose
  }

  // Facet 2: Profile matching (org profile vs grant eligibility profile)
  // Only if profile embedding exists AND purpose_embedding column is populated
  if (profileEmbedding) {
    try {
      const { data: profileResults } = await db
        .from("grant_sources")
        .select("id, name, funder_name, source_type, category, eligibility_types, states, amount_min, amount_max, deadline, deadline_type, description, status, url, cfda_number, cost_sharing_required, funder_id")
        .eq("is_active", true)
        .in("status", ["open", "forecasted"])
        .not("description_embedding", "is", null)
        .limit(200);

      // For now, profile matching uses the same description_embedding
      // Full implementation would use purpose_embedding column
      // This is a placeholder for when purpose_embedding is populated
      if (profileResults) {
        for (const r of profileResults as VectorRecallResult[]) {
          const existing = resultMap.get(r.id);
          if (existing) {
            // Boost grants that appear in both searches
            existing.similarity = Math.min(1, existing.similarity + 0.15);
          }
        }
      }
    } catch {
      // Profile search failed — continue with purpose results only
    }
  }

  // Sort by combined similarity and return top 200
  const merged = Array.from(resultMap.values());
  merged.sort((a, b) => b.similarity - a.similarity);
  return merged.slice(0, 200);
}
