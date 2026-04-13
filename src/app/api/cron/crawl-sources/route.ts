import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAndClean, extractGrantsFromText, type CrawledGrant } from "@/lib/ingestion/web-crawler";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// GET /api/cron/crawl-sources (Vercel Cron daily at 10:00 UTC)
// Picks the next batch of sources from grant_source_directory,
// crawls their websites, extracts grants via AI, and upserts into grant_sources.
// ---------------------------------------------------------------------------

export const maxDuration = 300; // 5 minutes

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.ADMIN_SECRET}`) return true;
  return false;
}

const CATEGORY_TO_SOURCE_TYPE: Record<string, "federal" | "state" | "foundation" | "corporate"> = {
  federal_agency: "federal",
  state_agency: "state",
  community_foundation: "foundation",
  national_foundation: "foundation",
  corporate_foundation: "corporate",
  faith_based: "foundation",
  disease_specific: "foundation",
  competition: "foundation",
  accelerator: "corporate",
  sbir_sttr: "federal",
  research: "federal",
  international: "foundation",
  other: "foundation",
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY required" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const started = Date.now();
  const BATCH_SIZE = 10;

  let crawled = 0;
  let grantsFound = 0;
  let grantsInserted = 0;
  let grantsSkipped = 0;
  let errors = 0;

  try {
    // ── Pick next sources to crawl ─────────────────────────────────────
    // Respect crawl_frequency: only pick sources that are due for a check
    const now = new Date();
    const FREQ_HOURS: Record<string, number> = {
      daily: 20,      // ~daily (allow some overlap)
      weekly: 144,     // ~6 days
      biweekly: 312,   // ~13 days
      monthly: 672,    // ~28 days
      quarterly: 2016, // ~84 days
    };

    // Get sources that are either never checked OR due for recrawl
    const { data: sources, error: fetchError } = await supabase
      .from("grant_source_directory")
      .select("id, name, organization, category, website, ingestion_status, crawl_frequency, last_checked")
      .not("website", "is", null)
      .neq("crawl_frequency", "manual")
      .not("ingestion_status", "eq", "not_applicable")
      .order("priority", { ascending: true })
      .order("last_checked", { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE * 3); // Fetch extra, then filter by frequency

    // Filter to only sources that are due for crawl
    const dueSources = (sources ?? []).filter((s) => {
      if (!s.last_checked) return true; // Never checked — always due
      const freqHours = FREQ_HOURS[s.crawl_frequency ?? "weekly"] ?? 144;
      const hoursSinceCheck = (now.getTime() - new Date(s.last_checked).getTime()) / (1000 * 60 * 60);
      return hoursSinceCheck >= freqHours;
    }).slice(0, BATCH_SIZE);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!dueSources.length) {
      return NextResponse.json({
        success: true,
        message: "No sources due for crawl",
        duration_ms: Date.now() - started,
      });
    }

    logger.info("Starting source crawl", { count: dueSources.length });

    for (const source of dueSources) {
      const url = source.website;
      if (!url) continue;

      // Ensure URL has protocol
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;

      try {
        // ── Fetch and clean the page ─────────────────────────────────
        const page = await fetchAndClean(fullUrl);

        if (!page || page.text.length < 100) {
          logger.warn("Crawl: insufficient content", { source: source.name, url: fullUrl });
          await supabase
            .from("grant_source_directory")
            .update({ last_checked: new Date().toISOString(), notes: "Insufficient content on crawl" })
            .eq("id", source.id);
          errors++;
          continue;
        }

        crawled++;

        // ── Extract grants via AI ────────────────────────────────────
        const sourceType = CATEGORY_TO_SOURCE_TYPE[source.category] ?? "foundation";
        const grants = await extractGrantsFromText(page.text, fullUrl, source.organization, sourceType);

        grantsFound += grants.length;

        if (grants.length === 0) {
          await supabase
            .from("grant_source_directory")
            .update({
              last_checked: new Date().toISOString(),
              notes: `Crawled ${new Date().toISOString().split("T")[0]} — 0 grants found`,
            })
            .eq("id", source.id);
          continue;
        }

        // ── Deduplicate against existing grants ──────────────────────
        // Check by name + funder_name AND by cfda_number if available
        const grantNames = grants.map((g) => g.name);
        const { data: existing } = await supabase
          .from("grant_sources")
          .select("name, funder_name, cfda_number, external_id")
          .in("name", grantNames);

        const existingByName = new Set(
          (existing ?? []).map((e: { name: string; funder_name: string }) =>
            `${e.name.toLowerCase().trim()}|||${e.funder_name.toLowerCase().trim()}`
          )
        );
        const existingByCfda = new Set(
          (existing ?? [])
            .filter((e: { cfda_number: string | null }) => e.cfda_number)
            .map((e: { cfda_number: string }) => e.cfda_number)
        );

        const newGrants = grants.filter((g) => {
          const nameKey = `${g.name.toLowerCase().trim()}|||${g.funder_name.toLowerCase().trim()}`;
          if (existingByName.has(nameKey)) return false;
          if (g.cfda_number && existingByCfda.has(g.cfda_number)) return false;
          return true;
        });

        grantsSkipped += grants.length - newGrants.length;

        // ── Insert new grants ────────────────────────────────────────
        if (newGrants.length > 0) {
          const rows = newGrants.map((g) => ({
            name: g.name,
            funder_name: g.funder_name,
            source_type: g.source_type,
            description: g.description,
            amount_min: g.amount_min,
            amount_max: g.amount_max,
            deadline: g.deadline,
            eligibility_types: g.eligibility_types,
            states: g.states,
            url: g.url,
            category: g.category,
            cfda_number: g.cfda_number,
            requires_sam: g.requires_sam,
            cost_sharing_required: g.cost_sharing_required,
            eligible_naics: g.eligible_naics,
            application_process: g.application_process,
            data_source: "api_crawl" as const,
            status: "open" as const,
            is_active: true,
          }));

          const { error: insertError } = await supabase
            .from("grant_sources")
            .insert(rows);

          if (insertError) {
            logger.error("Crawl insert failed", { source: source.name, error: insertError.message });
            errors++;
          } else {
            grantsInserted += newGrants.length;
          }
        }

        // ── Update directory entry ───────────────────────────────────
        await supabase
          .from("grant_source_directory")
          .update({
            last_checked: new Date().toISOString(),
            ingestion_status: "automated",
            notes: `Crawled ${new Date().toISOString().split("T")[0]} — ${grants.length} found, ${newGrants.length} new`,
          })
          .eq("id", source.id);

      } catch (err) {
        logger.error("Crawl source error", { source: source.name, err: String(err) });
        errors++;
        await supabase
          .from("grant_source_directory")
          .update({
            last_checked: new Date().toISOString(),
            notes: `Crawl error: ${String(err).slice(0, 200)}`,
          })
          .eq("id", source.id);
      }

      // Polite delay between sources
      await new Promise((r) => setTimeout(r, 2000));
    }

    // ── Generate embeddings for new grants ────────────────────────────
    if (grantsInserted > 0) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const { data: unembedded } = await supabase
          .from("grant_sources")
          .select("id, name, description, funder_name, category")
          .eq("data_source", "api_crawl")
          .is("description_embedding", null)
          .not("description", "is", null)
          .limit(50);

        if (unembedded?.length) {
          const texts = unembedded.map((g) =>
            [g.name, g.description, g.funder_name ? `Funder: ${g.funder_name}` : "", g.category ? `Category: ${g.category}` : ""]
              .filter(Boolean).join(". ").slice(0, 8000)
          );

          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: texts,
          });

          for (let i = 0; i < unembedded.length; i++) {
            const embedding = embeddingResponse.data[i]?.embedding;
            if (embedding) {
              await supabase
                .from("grant_sources")
                .update({ description_embedding: embedding })
                .eq("id", unembedded[i].id);
            }
          }
        }
      } catch (embErr) {
        logger.error("Post-crawl embedding failed", { err: String(embErr) });
      }
    }

    const summary = {
      success: true,
      duration_ms: Date.now() - started,
      sources_crawled: crawled,
      grants_found: grantsFound,
      grants_inserted: grantsInserted,
      grants_skipped_duplicate: grantsSkipped,
      errors,
    };

    logger.info("Source crawl complete", summary);
    return NextResponse.json(summary);
  } catch (err) {
    logger.error("Crawl-sources failed", { err: String(err) });
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
