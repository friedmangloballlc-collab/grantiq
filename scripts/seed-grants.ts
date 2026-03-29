// grantiq/scripts/seed-grants.ts
import { createClient } from "@supabase/supabase-js";
import { parseGrantsXlsx } from "../src/lib/ingestion/xlsx-parser";
import { ParsedGrant } from "../src/lib/ingestion/grant-schema";

const XLSX_PATH =
  process.env.XLSX_PATH ??
  "/Users/poweredbyexcellence/grants-saas-analysis/Grants Folder/Grant_Sources_ULTIMATE.xlsx";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const BATCH_SIZE = 200;

async function upsertBatch(batch: ParsedGrant[]): Promise<{ inserted: number; errors: number }> {
  const rows = batch.map((g) => ({
    name: g.name,
    funder_name: g.funder_name,
    source_type: g.source_type,
    url: g.url,
    amount_min: g.amount_min,
    amount_max: g.amount_max,
    deadline: g.deadline?.toISOString() ?? null,
    deadline_type: g.deadline_type,
    recurrence: g.recurrence,
    eligibility_types: g.eligibility_types,
    states: g.states,
    description: g.description,
    cfda_number: g.cfda_number,
    category: g.category,
    raw_text: g.raw_text,
    data_source: "seed",
    status: "open",
    is_active: true,
    last_verified: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("grant_sources")
    .upsert(rows, {
      onConflict: "name,funder_name",
      ignoreDuplicates: false,
    })
    .select("id");

  if (error) {
    console.error("  Batch upsert error:", error.message);
    return { inserted: 0, errors: batch.length };
  }
  return { inserted: data?.length ?? 0, errors: 0 };
}

async function main() {
  console.log("GrantIQ Seed Script — Grant Sources");
  console.log("=====================================");
  console.log(`XLSX file: ${XLSX_PATH}`);
  console.log(`Supabase:  ${SUPABASE_URL}`);
  console.log("");

  console.log("Parsing XLSX...");
  const { grants, stats } = parseGrantsXlsx(XLSX_PATH);

  console.log(`\nSheet summary:`);
  let totalParsed = 0;
  let totalSkipped = 0;
  for (const s of stats) {
    if (s.parsed > 0 || s.skipped > 0) {
      console.log(`  ${s.sheet.padEnd(35)} parsed=${s.parsed}  skipped=${s.skipped}`);
    }
    totalParsed += s.parsed;
    totalSkipped += s.skipped;
  }
  console.log(`\nTotal parsed: ${totalParsed}  Total skipped: ${totalSkipped}`);

  if (grants.length === 0) {
    console.error("ERROR: No grants parsed. Check the XLSX path and sheet structure.");
    process.exit(1);
  }

  console.log(`\nUpserting ${grants.length} grants in batches of ${BATCH_SIZE}...`);
  let totalInserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < grants.length; i += BATCH_SIZE) {
    const batch = grants.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(grants.length / BATCH_SIZE);
    process.stdout.write(`  Batch ${batchNum}/${totalBatches}... `);

    const { inserted, errors } = await upsertBatch(batch);
    totalInserted += inserted;
    totalErrors += errors;
    console.log(`inserted=${inserted} errors=${errors}`);
  }

  console.log("\n=====================================");
  console.log(`Seed complete.`);
  console.log(`  Total inserted/updated: ${totalInserted}`);
  console.log(`  Total errors:           ${totalErrors}`);

  // Enqueue background embedding job
  console.log("\nEnqueueing background embedding job...");
  const { error: jobError } = await supabase.from("job_queue").insert({
    job_type: "generate_embedding",
    payload: { entity_type: "grant", batch_size: 100 },
    status: "pending",
    priority: 5,
    max_attempts: 3,
  });
  if (jobError) {
    console.warn("Warning: Could not enqueue embedding job:", jobError.message);
  } else {
    console.log("Embedding job enqueued. Worker will process embeddings in background.");
  }

  if (totalErrors > 0) {
    console.warn("\nWARNING: Some rows had errors. Check output above for details.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
