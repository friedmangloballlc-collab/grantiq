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
