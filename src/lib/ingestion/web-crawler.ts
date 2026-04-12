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

  const prompt = `You are extracting grant opportunity data from a webpage. Extract ALL distinct grant programs/opportunities mentioned.

SOURCE: ${sourceName}
URL: ${sourceUrl}
TYPE: ${sourceType}

For each grant found, extract:
- name: exact grant program name
- funder_name: organization offering the grant
- description: 1-3 sentence description of what the grant funds
- amount_min: minimum award in dollars (null if not stated)
- amount_max: maximum award in dollars (null if not stated)
- deadline: deadline date in YYYY-MM-DD format (null if rolling/not stated)
- eligibility_types: array of eligible org types (e.g., ["nonprofit_501c3", "government", "tribal"])
- states: array of 2-letter state codes if geographically limited, empty if national
- category: grant category (e.g., "health", "education", "environment")
- cfda_number: CFDA/ALN number if mentioned (null otherwise)
- requires_sam: true if SAM.gov registration mentioned as required
- cost_sharing_required: true if matching funds/cost sharing mentioned

Return ONLY a JSON array of grants. If no grants found, return [].
Do NOT invent or guess data — only extract what's explicitly stated on the page.

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
    })).filter((g: CrawledGrant) => g.name.length > 3);
  } catch (err) {
    logger.error("Grant extraction failed", { sourceUrl, err: String(err) });
    return [];
  }
}
