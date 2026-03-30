import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_BATCH_SIZE = 100;
export const MAX_TEXT_LENGTH = 8000;

export interface GrantEmbeddingInput {
  name: string;
  funder_name: string;
  description: string | null;
  category: string | null;
  eligibility_types: string[];
  states: string[];
}

export function buildEmbeddingText(grant: GrantEmbeddingInput): string {
  const parts: string[] = [];

  parts.push(`Grant: ${grant.name}`);
  parts.push(`Funder: ${grant.funder_name}`);

  if (grant.description) {
    parts.push(`Description: ${grant.description}`);
  }

  if (grant.category) {
    parts.push(`Category: ${grant.category}`);
  }

  if (grant.eligibility_types.length > 0) {
    parts.push(`Eligibility: ${grant.eligibility_types.join(", ")}`);
  }

  if (grant.states.length > 0) {
    parts.push(`States: ${grant.states.join(", ")}`);
  }

  const text = parts.join(". ");
  return text.slice(0, MAX_TEXT_LENGTH);
}

export async function batchGenerateEmbeddings(
  texts: string[],
  client: OpenAI
): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];

  const results: (number[] | null)[] = new Array(texts.length).fill(null);

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);

    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });

      for (const item of response.data) {
        results[i + item.index] = item.embedding;
      }
    } catch (err) {
      console.error(
        `Embedding batch ${i}-${i + EMBEDDING_BATCH_SIZE} failed:`,
        err
      );
      // Indices in this batch remain null
    }
  }

  return results;
}

export async function generateMissingGrantEmbeddings(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        is: (col: string, val: null) => {
          limit: (n: number) => Promise<{ data: Array<{ id: string } & GrantEmbeddingInput> | null; error: unknown }>;
        };
      };
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    };
  },
  openai: OpenAI,
  options?: { batchSize?: number; limit?: number }
): Promise<{ processed: number; updated: number; failed: number }> {
  const limit = options?.limit ?? 500;

  const { data: grants, error } = await supabase
    .from("grant_sources")
    .select("id, name, funder_name, description, category, eligibility_types, states")
    .is("description_embedding", null)
    .limit(limit);

  if (error || !grants) {
    console.error("Failed to fetch grants without embeddings:", error);
    return { processed: 0, updated: 0, failed: 0 };
  }

  const processed = grants.length;
  let updated = 0;
  let failed = 0;

  const texts = grants.map((g) => buildEmbeddingText(g));
  const embeddings = await batchGenerateEmbeddings(texts, openai);

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
      console.error(`Failed to update embedding for grant ${grants[i].id}:`, updateError);
      failed++;
    } else {
      updated++;
    }
  }

  return { processed, updated, failed };
}
