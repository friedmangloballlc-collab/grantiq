import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// POST /api/cron/generate-embeddings
// Batch-generates description_embedding for grants that have descriptions
// but no embeddings yet. Processes in batches of 50 to stay within limits.
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.ADMIN_SECRET}`) return true;
  return false;
}

export const maxDuration = 300; // 5 minutes — embedding ~4000 grants takes time

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey });
  const supabase = createAdminClient();
  const started = Date.now();
  let totalProcessed = 0;
  let totalErrors = 0;
  const BATCH_SIZE = 50;

  try {
    // Count how many need embeddings
    const { count: pendingCount } = await supabase
      .from("grant_sources")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .is("description_embedding", null)
      .not("description", "is", null)
      .gt("description", "");

    logger.info("Embedding generation started", { pendingCount });

    let offset = 0;
    while (true) {
      // Fetch batch of grants without embeddings
      const { data: grants, error: fetchError } = await supabase
        .from("grant_sources")
        .select("id, name, description, funder_name, category")
        .eq("is_active", true)
        .is("description_embedding", null)
        .not("description", "is", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        logger.error("Failed to fetch grants for embedding", { error: fetchError.message });
        break;
      }

      if (!grants || grants.length === 0) break;

      // Build text for each grant — combine name + description + funder for richer embedding
      const texts = grants.map((g) => {
        const parts = [g.name, g.description];
        if (g.funder_name) parts.push(`Funder: ${g.funder_name}`);
        if (g.category) parts.push(`Category: ${g.category}`);
        return parts.filter(Boolean).join(". ").slice(0, 8000); // Cap at ~8K chars
      });

      try {
        // Batch embedding call — OpenAI supports up to 2048 inputs at once
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: texts,
        });

        // Update each grant with its embedding
        for (let i = 0; i < grants.length; i++) {
          const embedding = embeddingResponse.data[i]?.embedding;
          if (!embedding) continue;

          const { error: updateError } = await supabase
            .from("grant_sources")
            .update({ description_embedding: embedding })
            .eq("id", grants[i].id);

          if (updateError) {
            logger.error("Failed to update embedding", { grantId: grants[i].id, error: updateError.message });
            totalErrors++;
          } else {
            totalProcessed++;
          }
        }
      } catch (embeddingErr) {
        logger.error("OpenAI embedding batch failed", { err: String(embeddingErr), offset });
        totalErrors += grants.length;
      }

      // If we got fewer than BATCH_SIZE, we're done
      if (grants.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;

      // Small delay between batches to be polite to OpenAI
      await new Promise((r) => setTimeout(r, 200));
    }

    const summary = {
      success: true,
      duration_ms: Date.now() - started,
      total_processed: totalProcessed,
      total_errors: totalErrors,
      pending_before: pendingCount ?? 0,
      remaining: (pendingCount ?? 0) - totalProcessed,
    };

    logger.info("Embedding generation complete", summary);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Embedding generation failed", { error: message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
