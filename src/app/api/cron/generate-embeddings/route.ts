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
    // Count how many need embeddings (either description or purpose)
    const { count: pendingDescCount } = await supabase
      .from("grant_sources")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .is("description_embedding", null)
      .not("description", "is", null)
      .gt("description", "");

    const { count: pendingPurposeCount } = await supabase
      .from("grant_sources")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .is("purpose_embedding", null)
      .not("description", "is", null)
      .gt("description", "");

    const pendingCount = (pendingDescCount ?? 0) + (pendingPurposeCount ?? 0);
    logger.info("Embedding generation started", { pendingDescCount, pendingPurposeCount });

    // Phase 1: Grants missing description_embedding (also generates purpose_embedding)
    let offset = 0;
    while (true) {
      const { data: grants, error: fetchError } = await supabase
        .from("grant_sources")
        .select("id, name, description, funder_name, category, eligibility_types, states, eligible_naics, requires_sam")
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

      // Build TWO texts per grant — description (purpose) + profile (eligibility)
      const descTexts = grants.map((g) => {
        const parts = [g.name, g.description];
        if (g.funder_name) parts.push(`Funder: ${g.funder_name}`);
        if (g.category) parts.push(`Category: ${g.category}`);
        return parts.filter(Boolean).join(". ").slice(0, 8000);
      });

      const profileTexts = grants.map((g) => {
        const parts = [
          `Funder: ${g.funder_name ?? "Unknown"}`,
          g.category ? `Sector: ${g.category}` : "",
          (g as Record<string, unknown>).eligibility_types
            ? `Eligible: ${((g as Record<string, unknown>).eligibility_types as string[]).join(", ")}`
            : "",
          (g as Record<string, unknown>).states
            ? `Geography: ${((g as Record<string, unknown>).states as string[]).join(", ") || "National"}`
            : "National",
          (g as Record<string, unknown>).requires_sam ? "Requires SAM.gov" : "",
          (g as Record<string, unknown>).eligible_naics
            ? `NAICS: ${((g as Record<string, unknown>).eligible_naics as string[]).join(", ")}`
            : "",
        ];
        return parts.filter(Boolean).join(". ").slice(0, 4000);
      });

      try {
        // Batch both description + profile embeddings in one call
        const allTexts = [...descTexts, ...profileTexts];
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: allTexts,
        });

        // Update each grant with both embeddings
        for (let i = 0; i < grants.length; i++) {
          const descEmb = embeddingResponse.data[i]?.embedding;
          const profileEmb = embeddingResponse.data[i + grants.length]?.embedding;
          if (!descEmb) continue;

          const updateData: Record<string, unknown> = { description_embedding: descEmb };
          if (profileEmb) updateData.purpose_embedding = profileEmb;

          const { error: updateError } = await supabase
            .from("grant_sources")
            .update(updateData)
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

    // Phase 2: Grants that have description_embedding but missing purpose_embedding
    let offset2 = 0;
    while (true) {
      const { data: grants2, error: fetchError2 } = await supabase
        .from("grant_sources")
        .select("id, name, description, funder_name, category, eligibility_types, states, eligible_naics, requires_sam")
        .eq("is_active", true)
        .not("description_embedding", "is", null)
        .is("purpose_embedding", null)
        .not("description", "is", null)
        .order("created_at", { ascending: false })
        .range(offset2, offset2 + BATCH_SIZE - 1);

      if (fetchError2) {
        logger.error("Failed to fetch grants for purpose embedding backfill", { error: fetchError2.message });
        break;
      }

      if (!grants2 || grants2.length === 0) break;

      const profileTexts = grants2.map((g) => {
        const parts = [
          `Funder: ${g.funder_name ?? "Unknown"}`,
          g.category ? `Sector: ${g.category}` : "",
          (g as Record<string, unknown>).eligibility_types
            ? `Eligible: ${((g as Record<string, unknown>).eligibility_types as string[]).join(", ")}`
            : "",
          (g as Record<string, unknown>).states
            ? `Geography: ${((g as Record<string, unknown>).states as string[]).join(", ") || "National"}`
            : "National",
          (g as Record<string, unknown>).requires_sam ? "Requires SAM.gov" : "",
          (g as Record<string, unknown>).eligible_naics
            ? `NAICS: ${((g as Record<string, unknown>).eligible_naics as string[]).join(", ")}`
            : "",
        ];
        return parts.filter(Boolean).join(". ").slice(0, 4000);
      });

      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: profileTexts,
        });

        for (let i = 0; i < grants2.length; i++) {
          const profileEmb = embeddingResponse.data[i]?.embedding;
          if (!profileEmb) continue;

          const { error: updateError } = await supabase
            .from("grant_sources")
            .update({ purpose_embedding: profileEmb })
            .eq("id", grants2[i].id);

          if (updateError) {
            logger.error("Failed to update purpose embedding", { grantId: grants2[i].id, error: updateError.message });
            totalErrors++;
          } else {
            totalProcessed++;
          }
        }
      } catch (embeddingErr) {
        logger.error("OpenAI purpose embedding batch failed", { err: String(embeddingErr), offset: offset2 });
        totalErrors += grants2.length;
      }

      if (grants2.length < BATCH_SIZE) break;
      offset2 += BATCH_SIZE;

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
