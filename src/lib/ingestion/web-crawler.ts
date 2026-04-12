import * as cheerio from "cheerio";
import OpenAI from "openai";
import { logger } from "@/lib/logger";

export interface CrawledGrant {
  name: string;
  funder_name: string;
  description: string | null;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  eligibility_types: string[];
  states: string[];
  url: string | null;
  category: string | null;
  cfda_number: string | null;
  requires_sam: boolean;
  cost_sharing_required: boolean;
  source_type: "federal" | "state" | "foundation" | "corporate";
  eligible_naics: string[];
  application_process: string | null;
}

/**
 * Fetch a URL and extract clean text content from HTML.
 * Strips nav, footer, scripts, styles — keeps main content.
 */
export async function fetchAndClean(url: string): Promise<{ text: string; title: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GrantAQ-Bot/1.0 (grant-matching-service; contact@grantaq.com)",
        "Accept": "text/html",
      },
    });

    if (!res.ok) {
      logger.error("Crawl fetch failed", { url, status: res.status });
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, nav, footer, header, iframe, noscript, .cookie-banner, #cookie-consent").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim();

    // Get main content area if identifiable
    const mainContent = $("main, article, [role='main'], .content, #content, .main-content").first();
    const textSource = mainContent.length > 0 ? mainContent : $("body");

    // Extract text, collapse whitespace
    const text = textSource.text().replace(/\s+/g, " ").trim().slice(0, 15000);

    return { text, title };
  } catch (err) {
    logger.error("Crawl fetch error", { url, err: String(err) });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Use GPT-4o-mini to extract structured grant data from crawled page text.
 */
export async function extractGrantsFromText(
  text: string,
  sourceUrl: string,
  sourceName: string,
  sourceType: "federal" | "state" | "foundation" | "corporate"
): Promise<CrawledGrant[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You are a grant data extraction specialist. Extract EVERY distinct grant program, funding opportunity, or award mentioned on this page.

SOURCE ORGANIZATION: ${sourceName}
SOURCE URL: ${sourceUrl}
GRANT TYPE: ${sourceType}

EXTRACTION RULES:
1. Extract ONLY facts explicitly stated on the page — NEVER invent, guess, or infer
2. If a field is not mentioned, use null — do NOT fill in typical values
3. Each grant program should be a separate entry (don't merge different programs)
4. Dollar amounts: extract exact numbers. "$50K" = 50000, "$1.5M" = 1500000
5. Dates: convert to YYYY-MM-DD format. "March 15, 2026" = "2026-03-15"
6. If the page lists application requirements, note them in the description

For EACH grant, extract these fields:
- name: the exact grant/program name as written on the page
- funder_name: the organization offering the grant (use "${sourceName}" if not separately stated)
- description: 2-4 sentences describing what the grant funds, who it helps, and what outcomes are expected. Be specific — include the funded activities, not just the topic area
- amount_min: minimum award amount in whole dollars (null if not stated)
- amount_max: maximum award amount in whole dollars (null if not stated)
- deadline: application deadline in YYYY-MM-DD (null if rolling, continuous, or not stated)
- eligibility_types: who can apply — use these exact values: "nonprofit_501c3", "nonprofit_other", "government", "tribal", "llc", "corporation", "sole_prop", "partnership", "higher_education", "k12", "individual", "any"
- states: 2-letter state codes if geographically limited (e.g., ["CA", "NY"]), empty array [] if national or not specified
- category: primary focus area (e.g., "health", "education", "environment", "workforce", "technology", "arts", "agriculture", "housing", "justice", "economic development")
- cfda_number: CFDA or ALN number if mentioned (e.g., "93.778"), null otherwise
- requires_sam: true ONLY if the page explicitly says SAM.gov registration is required
- cost_sharing_required: true ONLY if matching funds or cost sharing is explicitly mentioned
- naics_codes: array of NAICS codes if mentioned (e.g., ["541511"]), empty array if not
- application_url: direct link to the application page if provided, null otherwise
- funding_cycle: "annual", "quarterly", "rolling", "one-time", or null

Return ONLY a valid JSON array. If no grants are found on this page, return [].

PAGE TEXT:
${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 4096,
      temperature: 0,
      messages: [
        { role: "system", content: "You extract structured grant data from webpage text. Return valid JSON arrays only. Never invent data." },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "[]";

    // Parse JSON — handle markdown code fences
    const cleaned = content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
    const grants = JSON.parse(cleaned);

    if (!Array.isArray(grants)) return [];

    return grants.map((g: Record<string, unknown>) => ({
      name: String(g.name ?? ""),
      funder_name: String(g.funder_name ?? sourceName),
      description: g.description ? String(g.description) : null,
      amount_min: typeof g.amount_min === "number" ? g.amount_min : null,
      amount_max: typeof g.amount_max === "number" ? g.amount_max : null,
      deadline: typeof g.deadline === "string" ? g.deadline : null,
      eligibility_types: Array.isArray(g.eligibility_types) ? g.eligibility_types.map(String) : [],
      states: Array.isArray(g.states) ? g.states.map(String) : [],
      url: sourceUrl,
      category: typeof g.category === "string" ? g.category : null,
      cfda_number: typeof g.cfda_number === "string" ? g.cfda_number : null,
      requires_sam: g.requires_sam === true,
      cost_sharing_required: g.cost_sharing_required === true,
      source_type: sourceType,
      eligible_naics: Array.isArray(g.naics_codes) ? g.naics_codes.map(String) : [],
      application_process: typeof g.application_url === "string" ? g.application_url : null,
    })).filter((g: CrawledGrant) => g.name.length > 3);
  } catch (err) {
    logger.error("Grant extraction failed", { sourceUrl, err: String(err) });
    return [];
  }
}
