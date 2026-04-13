import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// GET /api/cron/enrich-grants
// Enriches existing grants with AI-classified eligibility, sector, and
// metadata. Processes grants that have descriptions but missing eligibility.
// Cost: ~$0.01 per 20 grants (~$2 for full 4,304 backfill)
// ---------------------------------------------------------------------------

export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.ADMIN_SECRET}`) return true;
  return false;
}

const ENRICHMENT_PROMPT = `You are classifying grant opportunities. For each grant, determine:

1. eligible_org_types: WHO can apply. Use ONLY these values:
   - "nonprofit_501c3" (requires 501c3 status)
   - "nonprofit_other" (any nonprofit)
   - "for_profit" (businesses, LLCs, corps)
   - "government" (state/local/tribal government)
   - "higher_education" (universities, colleges)
   - "k12" (K-12 schools/districts)
   - "tribal" (tribal organizations)
   - "individual" (individual people)
   - "any" (open to all org types)

   Rules:
   - If the funder is a federal agency and it says "eligible applicants" include businesses → include "for_profit"
   - If the grant name contains "SBIR" or "STTR" → ["for_profit"] (SBIR is for-profit only)
   - If funder is a private/community foundation and doesn't specify → ["nonprofit_501c3", "nonprofit_other"]
   - If unclear → ["any"]

2. sector: Primary sector this grant funds. Use ONE of:
   health, education, environment, technology, agriculture, housing,
   workforce, arts_culture, justice, economic_development, energy,
   transportation, science_research, social_services, disaster_relief,
   community_development, international, veterans, food_nutrition, general

3. for_profit_eligible: true/false — can a for-profit business apply?

4. nonprofit_only: true/false — is this ONLY for nonprofits?

5. target_beneficiaries: Who does this grant aim to help? Array of:
   "children_youth", "veterans", "low_income", "minorities", "women_girls",
   "rural", "immigrants", "disabilities", "seniors", "small_businesses",
   "students", "general_public"
   Empty array if not population-specific.

6. project_keywords: 3-5 keywords describing what activities this grant funds.
   Examples: ["workforce training", "equipment purchase", "research", "construction"]
   Extract from the description — these should be specific funded activities, not generic topics.

Return a JSON array: { id, eligible_org_types, sector, for_profit_eligible, nonprofit_only, target_beneficiaries, project_keywords }`;

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = createAdminClient();
  const started = Date.now();
  const BATCH_SIZE = 20;
  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    // Count how many need enrichment
    const { count } = await supabase
      .from("grant_sources")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .or("eligibility_types.eq.{},eligibility_types.is.null,target_beneficiaries.eq.[],target_beneficiaries.is.null");

    logger.info("Grant enrichment started", { pendingCount: count });

    while (totalProcessed < 100) { // Cap at 100 per run (fits in 5min timeout)
      // Fetch batch needing enrichment
      const { data: grants, error: fetchError } = await supabase
        .from("grant_sources")
        .select("id, name, funder_name, source_type, description, category, states")
        .eq("is_active", true)
        .or("eligibility_types.eq.{},eligibility_types.is.null,target_beneficiaries.eq.[],target_beneficiaries.is.null")
        .order("created_at", { ascending: false })
        .range(0, BATCH_SIZE - 1);

      if (fetchError || !grants?.length) break;

      // Build prompt with batch of grants
      const grantList = grants.map((g, i) =>
        `Grant ${i + 1} (id: ${g.id}):
  Name: ${g.name}
  Funder: ${g.funder_name}
  Type: ${g.source_type}
  Category: ${g.category ?? "unknown"}
  Description: ${(g.description ?? "No description").slice(0, 500)}`
      ).join("\n\n");

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 4096,
          temperature: 0,
          messages: [
            { role: "system", content: ENRICHMENT_PROMPT },
            { role: "user", content: `Classify these ${grants.length} grants:\n\n${grantList}` },
          ],
        });

        const content = response.choices[0]?.message?.content ?? "[]";
        const cleaned = content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
        const results = JSON.parse(cleaned);

        if (!Array.isArray(results)) continue;

        // Update each grant with enrichment data
        for (const result of results) {
          if (!result.id) continue;

          const updateData: Record<string, unknown> = {};

          if (Array.isArray(result.eligible_org_types) && result.eligible_org_types.length > 0) {
            updateData.eligibility_types = result.eligible_org_types;
          }

          if (result.sector) {
            updateData.category = result.sector;
          }

          if (Array.isArray(result.target_beneficiaries) && result.target_beneficiaries.length > 0) {
            updateData.target_beneficiaries = result.target_beneficiaries;
          }

          if (Array.isArray(result.project_keywords) && result.project_keywords.length > 0) {
            updateData.project_keywords = result.project_keywords;
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from("grant_sources")
              .update(updateData)
              .eq("id", result.id);

            if (updateError) {
              totalErrors++;
            } else {
              totalProcessed++;
            }
          }
        }
      } catch (aiError) {
        logger.error("Enrichment AI call failed", { err: String(aiError) });
        totalErrors++;
      }

      // Polite delay
      await new Promise((r) => setTimeout(r, 500));
    }

    const summary = {
      success: true,
      duration_ms: Date.now() - started,
      grants_enriched: totalProcessed,
      errors: totalErrors,
      pending_before: count ?? 0,
      remaining: Math.max(0, (count ?? 0) - totalProcessed),
    };

    logger.info("Grant enrichment complete", summary);
    return NextResponse.json(summary);
  } catch (err) {
    logger.error("Grant enrichment failed", { err: String(err) });
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
