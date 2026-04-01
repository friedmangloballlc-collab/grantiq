// scripts/enrich-grants.ts
// Enriches grant_sources rows that have missing descriptions/details
// Uses Claude to generate realistic grant details based on name, funder, type, category

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BATCH_SIZE = 10; // grants per AI call
const MAX_BATCHES = 250; // safety limit

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const anthropic = new Anthropic();

interface GrantRow {
  id: string;
  name: string;
  funder_name: string;
  source_type: string;
  category: string | null;
  description: string | null;
  amount_min: number | null;
  amount_max: number | null;
  eligibility_types: string[];
  states: string[];
  url: string | null;
}

interface EnrichedGrant {
  id: string;
  description: string;
  eligibility_types: string[];
  amount_min: number | null;
  amount_max: number | null;
}

async function enrichBatch(grants: GrantRow[]): Promise<EnrichedGrant[]> {
  const grantList = grants
    .map(
      (g, i) =>
        `${i + 1}. ID: ${g.id}
   Name: ${g.name}
   Funder: ${g.funder_name}
   Type: ${g.source_type}
   Category: ${g.category ?? "Unknown"}
   Current description: ${g.description ?? "NONE"}
   Current amount_min: ${g.amount_min ?? "NONE"}
   Current amount_max: ${g.amount_max ?? "NONE"}
   Current eligibility: ${g.eligibility_types.length > 0 ? g.eligibility_types.join(", ") : "NONE"}
   States: ${g.states.length > 0 ? g.states.join(", ") : "National"}
   URL: ${g.url ?? "NONE"}`
    )
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: 0.3,
    system: `You are a grant research expert. For each grant listed, generate realistic and accurate details based on the grant name, funder, type, and category. Use your knowledge of real grant programs to fill in missing information.

Return a JSON array with one object per grant. Each object must have:
- "id": the grant ID (copy exactly from input)
- "description": 2-3 sentence description of what the grant funds, who it serves, and its purpose (150-250 chars)
- "eligibility_types": array of eligible entity types from: ["nonprofit", "501c3", "small_business", "llc", "corporation", "tribal", "government", "education", "individual"]. Pick all that apply based on the grant type and funder.
- "amount_min": estimated minimum award in dollars (number or null if truly unknown)
- "amount_max": estimated maximum award in dollars (number or null if truly unknown)

If the grant already has good data for a field, keep the existing value. Only fill in what's missing or clearly wrong.

Return ONLY the JSON array, no markdown fences or explanation.`,
    messages: [
      {
        role: "user",
        content: `Enrich these ${grants.length} grants:\n\n${grantList}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || !("text" in text)) return [];

  try {
    const parsed = JSON.parse(text.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("  Failed to parse AI response");
    return [];
  }
}

async function main() {
  console.log("GrantAQ Grant Enrichment Script");
  console.log("================================");

  // Count grants needing enrichment
  const { count: totalCount } = await supabase
    .from("grant_sources")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: needsEnrichment } = await supabase
    .from("grant_sources")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .or("description.is.null,description.eq.");

  console.log(`Total active grants: ${totalCount}`);
  console.log(`Grants needing enrichment: ${needsEnrichment}`);
  console.log("");

  let processed = 0;
  let enriched = 0;
  let errors = 0;
  let batchNum = 0;

  while (batchNum < MAX_BATCHES) {
    // Fetch grants missing descriptions first, then those with short descriptions
    const { data: batch } = await supabase
      .from("grant_sources")
      .select("id, name, funder_name, source_type, category, description, amount_min, amount_max, eligibility_types, states, url")
      .eq("is_active", true)
      .or("description.is.null,description.eq.,eligibility_types.eq.{}")
      .order("created_at", { ascending: true })
      .range(processed, processed + BATCH_SIZE - 1);

    if (!batch || batch.length === 0) break;

    batchNum++;
    console.log(`Batch ${batchNum}: Processing ${batch.length} grants...`);

    try {
      const results = await enrichBatch(batch as GrantRow[]);

      for (const result of results) {
        const original = batch.find((g) => g.id === result.id);
        if (!original) continue;

        const updates: Record<string, unknown> = {};

        // Only update fields that were missing
        if (!original.description && result.description) {
          updates.description = result.description;
        }
        if ((!original.eligibility_types || original.eligibility_types.length === 0) && result.eligibility_types?.length > 0) {
          updates.eligibility_types = result.eligibility_types;
        }
        if (original.amount_min === null && result.amount_min !== null) {
          updates.amount_min = result.amount_min;
        }
        if (original.amount_max === null && result.amount_max !== null) {
          updates.amount_max = result.amount_max;
        }

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from("grant_sources")
            .update(updates)
            .eq("id", result.id);

          if (error) {
            console.error(`  Error updating ${result.id}: ${error.message}`);
            errors++;
          } else {
            enriched++;
          }
        }
      }

      processed += batch.length;
      console.log(`  Enriched ${results.length} grants (total: ${enriched})`);
    } catch (err) {
      console.error(`  Batch error:`, err);
      errors++;
      processed += batch.length; // skip this batch
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n================================");
  console.log(`Done. Processed: ${processed}, Enriched: ${enriched}, Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
