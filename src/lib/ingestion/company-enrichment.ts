/**
 * Enriches an org profile by scraping their website URL.
 * Extracts: mission, services, industries served, team size, locations,
 * certifications mentioned, technologies, target populations.
 *
 * Used to fill profile gaps when the user provides a website URL.
 */

import { fetchAndClean } from "./web-crawler";
import OpenAI from "openai";
import { logger } from "@/lib/logger";

export interface CompanyEnrichmentResult {
  mission_statement: string | null;
  industry_keywords: string[];
  services: string[];
  target_populations: string[];
  technologies: string[];
  certifications_mentioned: string[];
  locations_mentioned: string[];
  team_size_estimate: string | null;
  year_founded: number | null;
  social_links: string[];
}

const EXTRACTION_PROMPT = `You are extracting company/organization profile data from a website. Extract ONLY what is explicitly stated — never guess or infer.

Return a JSON object with:
- mission_statement: Their mission or about statement (2-4 sentences, exact from site)
- industry_keywords: Array of industry/sector keywords (e.g., ["healthcare", "telemedicine", "rural health"])
- services: Array of services/products offered (e.g., ["workforce training", "job placement", "career counseling"])
- target_populations: Who they serve, using these values where applicable: "children_youth", "veterans", "low_income", "minorities", "women_girls", "rural", "immigrants", "disabilities", "seniors", "small_businesses", "students", "general_public"
- technologies: Any technologies/platforms mentioned (e.g., ["AI", "machine learning", "mobile app"])
- certifications_mentioned: Any certifications/designations mentioned (e.g., ["WOSB", "8(a)", "ISO 9001", "B Corp"])
- locations_mentioned: Cities/states where they operate (e.g., ["Atlanta, GA", "Miami, FL"])
- team_size_estimate: Team size if mentioned (e.g., "50-100 employees"), null if not
- year_founded: Year founded if mentioned, null if not
- social_links: LinkedIn, Twitter, etc URLs if found

Return ONLY valid JSON. If a field isn't found on the page, use null or empty array.`;

export async function enrichFromWebsite(
  websiteUrl: string
): Promise<CompanyEnrichmentResult | null> {
  if (!websiteUrl) return null;

  const fullUrl = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;

  // Fetch and clean the website
  const page = await fetchAndClean(fullUrl);
  if (!page || page.text.length < 100) {
    logger.warn("Company enrichment: insufficient content", { url: fullUrl });
    return null;
  }

  // Also try to fetch /about page for richer content
  let aboutText = "";
  try {
    const aboutUrl = new URL("/about", fullUrl).href;
    const aboutPage = await fetchAndClean(aboutUrl);
    if (aboutPage && aboutPage.text.length > 100) {
      aboutText = aboutPage.text.slice(0, 5000);
    }
  } catch {
    // About page doesn't exist — that's fine
  }

  const combinedText = [page.text.slice(0, 8000), aboutText].filter(Boolean).join("\n\n---\n\n");

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2048,
      temperature: 0,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: `WEBSITE: ${fullUrl}\n\nCONTENT:\n${combinedText}` },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);

    return {
      mission_statement: typeof result.mission_statement === "string" ? result.mission_statement : null,
      industry_keywords: Array.isArray(result.industry_keywords) ? result.industry_keywords : [],
      services: Array.isArray(result.services) ? result.services : [],
      target_populations: Array.isArray(result.target_populations) ? result.target_populations : [],
      technologies: Array.isArray(result.technologies) ? result.technologies : [],
      certifications_mentioned: Array.isArray(result.certifications_mentioned) ? result.certifications_mentioned : [],
      locations_mentioned: Array.isArray(result.locations_mentioned) ? result.locations_mentioned : [],
      team_size_estimate: typeof result.team_size_estimate === "string" ? result.team_size_estimate : null,
      year_founded: typeof result.year_founded === "number" ? result.year_founded : null,
      social_links: Array.isArray(result.social_links) ? result.social_links : [],
    };
  } catch (err) {
    logger.error("Company enrichment AI extraction failed", { url: fullUrl, err: String(err) });
    return null;
  }
}
