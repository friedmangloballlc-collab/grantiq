/**
 * Backfill script: re-run matching for all orgs that have existing matches.
 * Run after deploying new filter logic to refresh match results.
 *
 * Usage: npx tsx scripts/backfill-rematch.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ADMIN_SECRET = process.env.ADMIN_SECRET!;
const BATCH_SIZE = 20;
const DELAY_MS = 10_000;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Find all orgs with existing matches
  const { data: orgs, error } = await supabase
    .from("grant_matches")
    .select("org_id")
    .limit(1000);

  if (error) {
    console.error("Failed to fetch orgs:", error.message);
    process.exit(1);
  }

  const uniqueOrgIds = [...new Set((orgs ?? []).map((r) => r.org_id))];
  console.log(`Found ${uniqueOrgIds.length} orgs with matches to re-process`);

  let processed = 0;
  for (let i = 0; i < uniqueOrgIds.length; i += BATCH_SIZE) {
    const batch = uniqueOrgIds.slice(i, i + BATCH_SIZE);

    for (const orgId of batch) {
      // Enqueue match_grants job
      const { error: jobError } = await supabase.from("job_queue").insert({
        job_type: "match_grants",
        payload: { org_id: orgId, triggered_by: "backfill_rematch" },
        status: "pending",
        priority: 5,
        max_attempts: 3,
      });

      if (jobError) {
        console.error(`Failed to queue job for ${orgId}:`, jobError.message);
      } else {
        processed++;
      }
    }

    console.log(`Queued ${processed}/${uniqueOrgIds.length} orgs (batch ${Math.floor(i / BATCH_SIZE) + 1})`);

    if (i + BATCH_SIZE < uniqueOrgIds.length) {
      console.log(`Waiting ${DELAY_MS / 1000}s before next batch...`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`Done. ${processed} orgs queued for re-matching.`);
  console.log("Note: Jobs will be processed when the worker runs or via inline matching.");
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
