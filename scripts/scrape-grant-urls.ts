// grantiq/scripts/scrape-grant-urls.ts
// Usage: npx tsx scripts/scrape-grant-urls.ts
//
// Reads grant_sources rows that have a URL but no description,
// scrapes the page, uses Claude to extract structured grant data,
// and updates the row.

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const anthropic = new Anthropic();

const MAX_GRANTS = 500;
const BATCH_SIZE = 10;
const FETCH_TIMEOUT_MS = 5_000;
const FETCH_DELAY_MS = 2_000;
const MAX_TEXT_CHARS = 5_000;

const VALID_ELIGIBILITY_TYPES = [
  "nonprofit",
  "501c3",
  "small_business",
  "llc",
  "corporation",
  "tribal",
  "government",
  "education",
  "individual",
] as const;

const USER_AGENT =
  "Mozilla/5.0 (compatible; GrantIQ/1.0; +https://grantiq.ai) AppleWebKit/537.36";

// ---------------------------------------------------------------------------
// HTML stripping
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  let text = html;
  // Remove script and style blocks entirely
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  // Replace <br>, <p>, <div>, <li>, <h*> tags with newlines for readability
  text = text.replace(/<\s*(?:br|p|div|li|h[1-6]|tr)[^>]*>/gi, "\n");
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&#\d+;/g, "");
  text = text.replace(/&\w+;/g, "");
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

// ---------------------------------------------------------------------------
// Fetch page content
// ---------------------------------------------------------------------------

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const resp = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`    HTTP ${resp.status} for ${url}`);
      return null;
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      console.warn(`    Non-HTML content-type (${contentType}) for ${url}`);
      return null;
    }

    const html = await resp.text();
    const text = stripHtml(html);

    if (text.length < 50) {
      console.warn(`    Page text too short (${text.length} chars) for ${url}`);
      return null;
    }

    return text.slice(0, MAX_TEXT_CHARS);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort")) {
      console.warn(`    Timeout fetching ${url}`);
    } else {
      console.warn(`    Fetch error for ${url}: ${msg}`);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Claude extraction
// ---------------------------------------------------------------------------

interface ExtractedGrant {
  description: string | null;
  eligibility: string[];
  application_process: string | null;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
}

async function extractGrantData(
  grantName: string,
  pageText: string
): Promise<ExtractedGrant | null> {
  const prompt = `You are extracting structured grant information from a webpage. The grant is named "${grantName}".

Here is the text content of the grant webpage:
---
${pageText}
---

Extract the following fields. If a field is not mentioned or unclear, use null.

Return ONLY a valid JSON object with these fields:
{
  "description": "2-3 sentence factual description of the grant program. What does it fund and what is its purpose?",
  "eligibility": ["array of entity types that can apply"],
  "application_process": "Brief description of how to apply (1-2 sentences)",
  "amount_min": null or number (minimum award amount in USD, no commas),
  "amount_max": null or number (maximum award amount in USD, no commas),
  "deadline": null or "YYYY-MM-DD" (next deadline if mentioned)
}

For the "eligibility" array, ONLY use values from this list:
- "nonprofit" (general nonprofits)
- "501c3" (specifically 501(c)(3) organizations)
- "small_business" (small businesses, startups, entrepreneurs)
- "llc" (LLCs specifically)
- "corporation" (corporations, large businesses)
- "tribal" (tribal organizations, Native American entities)
- "government" (state, local, or municipal government entities)
- "education" (schools, universities, educational institutions)
- "individual" (individual people, researchers, students)

Map what you find on the page to the closest matching type(s). If the page mentions "universities", use "education". If it says "municipalities", use "government". Return an empty array if eligibility is completely unclear.

Return ONLY the JSON object, no markdown fences, no explanation.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : null;
    if (!text) return null;

    // Strip any accidental markdown fences
    const cleaned = text
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate and sanitize eligibility types
    const eligibility = Array.isArray(parsed.eligibility)
      ? parsed.eligibility.filter((e: string) =>
          VALID_ELIGIBILITY_TYPES.includes(e as (typeof VALID_ELIGIBILITY_TYPES)[number])
        )
      : [];

    return {
      description:
        typeof parsed.description === "string" && parsed.description.length > 0
          ? parsed.description
          : null,
      eligibility,
      application_process:
        typeof parsed.application_process === "string" &&
        parsed.application_process.length > 0
          ? parsed.application_process
          : null,
      amount_min:
        typeof parsed.amount_min === "number" && parsed.amount_min > 0
          ? parsed.amount_min
          : null,
      amount_max:
        typeof parsed.amount_max === "number" && parsed.amount_max > 0
          ? parsed.amount_max
          : null,
      deadline:
        typeof parsed.deadline === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.deadline)
          ? parsed.deadline
          : null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`    Claude extraction error: ${msg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("GrantIQ — Grant URL Scraper");
  console.log("===========================");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Max grants: ${MAX_GRANTS}`);
  console.log(`Fetch timeout: ${FETCH_TIMEOUT_MS}ms`);
  console.log(`Delay between fetches: ${FETCH_DELAY_MS}ms`);
  console.log("");

  // Query grants with URL but missing description, excluding federal grants
  console.log("Fetching grants with missing descriptions...");

  const { data: grants, error } = await supabase
    .from("grant_sources")
    .select("id, name, url, source_type, amount_min, amount_max")
    .not("url", "is", null)
    .neq("source_type", "federal")
    .or("description.is.null,description.eq.")
    .order("created_at", { ascending: true })
    .limit(MAX_GRANTS);

  if (error) {
    console.error("ERROR: Failed to query grant_sources:", error.message);
    process.exit(1);
  }

  if (!grants || grants.length === 0) {
    console.log("No grants found that need scraping. Done.");
    return;
  }

  console.log(`Found ${grants.length} grants to process.\n`);

  let processed = 0;
  let updated = 0;
  let fetchFailed = 0;
  let extractFailed = 0;

  for (let batchStart = 0; batchStart < grants.length; batchStart += BATCH_SIZE) {
    const batch = grants.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(grants.length / BATCH_SIZE);

    console.log(
      `--- Batch ${batchNum}/${totalBatches} (grants ${batchStart + 1}-${Math.min(batchStart + BATCH_SIZE, grants.length)}) ---`
    );

    for (const grant of batch) {
      processed++;
      const shortUrl =
        grant.url.length > 60 ? grant.url.slice(0, 57) + "..." : grant.url;
      console.log(`  [${processed}/${grants.length}] ${grant.name}`);
      console.log(`    URL: ${shortUrl}`);

      // Fetch page content
      const pageText = await fetchPageText(grant.url);
      if (!pageText) {
        fetchFailed++;
        console.log("    SKIP: Could not fetch page content.");
        await sleep(FETCH_DELAY_MS);
        continue;
      }

      console.log(`    Fetched ${pageText.length} chars. Extracting with Claude...`);

      // Extract grant data via Claude
      const extracted = await extractGrantData(grant.name, pageText);
      if (!extracted || !extracted.description) {
        extractFailed++;
        console.log("    SKIP: Claude could not extract a description.");
        await sleep(FETCH_DELAY_MS);
        continue;
      }

      // Build update payload — only set fields that Claude found
      const updatePayload: Record<string, unknown> = {
        description: extracted.description,
        last_verified: new Date().toISOString(),
      };

      if (extracted.eligibility.length > 0) {
        updatePayload.eligibility_types = extracted.eligibility;
      }

      if (extracted.application_process) {
        updatePayload.application_process = extracted.application_process;
      }

      // Only update amounts if the row does not already have them
      if (extracted.amount_min !== null && grant.amount_min === null) {
        updatePayload.amount_min = extracted.amount_min;
      }
      if (extracted.amount_max !== null && grant.amount_max === null) {
        updatePayload.amount_max = extracted.amount_max;
      }

      if (extracted.deadline) {
        updatePayload.deadline = extracted.deadline;
      }

      // Update the row
      const { error: updateError } = await supabase
        .from("grant_sources")
        .update(updatePayload)
        .eq("id", grant.id);

      if (updateError) {
        console.warn(`    UPDATE ERROR: ${updateError.message}`);
        extractFailed++;
      } else {
        updated++;
        console.log(`    UPDATED: "${extracted.description.slice(0, 80)}..."`);
        if (extracted.eligibility.length > 0) {
          console.log(`    Eligibility: ${extracted.eligibility.join(", ")}`);
        }
        if (extracted.amount_min || extracted.amount_max) {
          console.log(
            `    Amount: $${extracted.amount_min?.toLocaleString() ?? "?"} - $${extracted.amount_max?.toLocaleString() ?? "?"}`
          );
        }
      }

      // Polite delay between fetches
      await sleep(FETCH_DELAY_MS);
    }
  }

  console.log("\n===========================");
  console.log("Scrape complete.");
  console.log(`  Processed:      ${processed}`);
  console.log(`  Updated:        ${updated}`);
  console.log(`  Fetch failed:   ${fetchFailed}`);
  console.log(`  Extract failed: ${extractFailed}`);

  if (updated > 0) {
    // Enqueue embedding job so new descriptions get vectorized
    console.log("\nEnqueueing embedding job for updated grants...");
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
      console.log("Embedding job enqueued.");
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
