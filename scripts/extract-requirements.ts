// scripts/extract-requirements.ts
// Scrapes grant URLs and extracts specific application requirements using Claude.
// Stores results in grant_requirements table.
// Usage: npx tsx scripts/extract-requirements.ts

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const anthropic = new Anthropic();

const MAX_GRANTS = 1000;
const FETCH_TIMEOUT_MS = 8000;
const DELAY_BETWEEN_FETCHES_MS = 1500;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<(br|hr|p|div|li|tr|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GrantAQ-Bot/1.0; +https://grantaq.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;

    const html = await res.text();
    const text = stripHtml(html);
    return text.length > 100 ? text.slice(0, 8000) : null;
  } catch {
    return null;
  }
}

interface ExtractedRequirements {
  documents_required: string[];
  eligibility_criteria: string[];
  application_forms: string[];
  submission_details: {
    method?: string;
    portal_url?: string;
    page_limits?: string;
    format?: string;
  };
  matching_funds?: string;
  budget_requirements?: string;
  deadline_details?: string;
  contact_info?: string;
  additional_notes?: string;
}

async function extractRequirements(
  pageText: string,
  grantName: string,
  funderName: string,
  sourceType: string
): Promise<ExtractedRequirements | null> {
  try {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      temperature: 0,
      system: `You are a grant requirements analyst. Extract SPECIFIC, REAL application requirements from the webpage content. Only include information that is explicitly stated on the page. Do NOT invent or assume requirements.

Return a JSON object with these fields:
- "documents_required": array of specific documents applicants must submit (e.g., "IRS 501(c)(3) determination letter", "Most recent audited financial statements", "Board of directors list with affiliations")
- "eligibility_criteria": array of specific eligibility requirements (e.g., "Must be a 501(c)(3) nonprofit", "Operating budget under $5M", "Must serve communities in the Pacific Northwest")
- "application_forms": array of specific forms needed (e.g., "SF-424 Application for Federal Assistance", "SF-424A Budget Information", "Online application via Fluxx")
- "submission_details": object with method (online/mail/email), portal_url, page_limits, format requirements
- "matching_funds": string describing any matching fund requirements, or null
- "budget_requirements": string describing budget format/limits, or null
- "deadline_details": string with specific deadline info found on page, or null
- "contact_info": string with program officer contact, or null
- "additional_notes": string with any other important application details, or null

If a field has no information on the page, use an empty array [] or null. Return ONLY raw JSON.`,
      messages: [
        {
          role: "user",
          content: `Extract the specific application requirements for this grant:

Grant: ${grantName}
Funder: ${funderName}
Type: ${sourceType}

Page content:
${pageText}`,
        },
      ],
    });

    const text = resp.content.find((b) => b.type === "text");
    if (!text || !("text" in text)) return null;

    const cleaned = text.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as ExtractedRequirements;
  } catch {
    return null;
  }
}

async function storeRequirements(grantId: string, extracted: ExtractedRequirements) {
  const rows: {
    grant_source_id: string;
    requirement_type: string;
    requirement_value: Record<string, unknown>;
    is_hard_requirement: boolean;
  }[] = [];

  // Documents required
  for (const doc of extracted.documents_required) {
    rows.push({
      grant_source_id: grantId,
      requirement_type: doc.toLowerCase().includes("501") ? "501c3"
        : doc.toLowerCase().includes("audit") ? "audit_required"
        : doc.toLowerCase().includes("sam") ? "sam_registration"
        : doc.toLowerCase().includes("budget") ? "budget_threshold"
        : "501c3", // fallback type
      requirement_value: { description: doc, category: "document" },
      is_hard_requirement: true,
    });
  }

  // Eligibility criteria
  for (const criteria of extracted.eligibility_criteria) {
    const type = criteria.toLowerCase().includes("geographic") || criteria.toLowerCase().includes("state") || criteria.toLowerCase().includes("region")
      ? "geographic"
      : criteria.toLowerCase().includes("year") || criteria.toLowerCase().includes("operating")
      ? "years_operating"
      : criteria.toLowerCase().includes("budget") || criteria.toLowerCase().includes("revenue")
      ? "budget_threshold"
      : criteria.toLowerCase().includes("501") || criteria.toLowerCase().includes("nonprofit")
      ? "501c3"
      : criteria.toLowerCase().includes("match")
      ? "matching_funds"
      : "501c3";

    rows.push({
      grant_source_id: grantId,
      requirement_type: type,
      requirement_value: { description: criteria, category: "eligibility" },
      is_hard_requirement: true,
    });
  }

  // Application forms
  for (const form of extracted.application_forms) {
    rows.push({
      grant_source_id: grantId,
      requirement_type: "501c3", // generic type — the description has the detail
      requirement_value: { description: form, category: "form" },
      is_hard_requirement: false,
    });
  }

  // Submission details
  if (extracted.submission_details?.method || extracted.submission_details?.portal_url) {
    rows.push({
      grant_source_id: grantId,
      requirement_type: "501c3",
      requirement_value: {
        description: `Submit via: ${extracted.submission_details.method || "online"}${extracted.submission_details.portal_url ? ` at ${extracted.submission_details.portal_url}` : ""}${extracted.submission_details.page_limits ? `. Page limit: ${extracted.submission_details.page_limits}` : ""}${extracted.submission_details.format ? `. Format: ${extracted.submission_details.format}` : ""}`,
        category: "submission",
      },
      is_hard_requirement: false,
    });
  }

  // Matching funds
  if (extracted.matching_funds) {
    rows.push({
      grant_source_id: grantId,
      requirement_type: "matching_funds",
      requirement_value: { description: extracted.matching_funds, category: "financial" },
      is_hard_requirement: true,
    });
  }

  // Budget requirements
  if (extracted.budget_requirements) {
    rows.push({
      grant_source_id: grantId,
      requirement_type: "budget_threshold",
      requirement_value: { description: extracted.budget_requirements, category: "financial" },
      is_hard_requirement: false,
    });
  }

  if (rows.length === 0) return 0;

  // Delete existing requirements for this grant (replace with fresh data)
  await supabase.from("grant_requirements").delete().eq("grant_source_id", grantId);

  const { error } = await supabase.from("grant_requirements").insert(rows);
  if (error) {
    console.error(`    DB error for ${grantId}: ${error.message}`);
    return 0;
  }
  return rows.length;
}

// Also update grant_sources with extracted details
async function updateGrantDetails(grantId: string, extracted: ExtractedRequirements) {
  const updates: Record<string, unknown> = {};

  if (extracted.deadline_details) {
    // Store in raw_text field for reference
    const { data: existing } = await supabase
      .from("grant_sources")
      .select("raw_text")
      .eq("id", grantId)
      .single();

    const currentRaw = (existing?.raw_text || "") as string;
    if (!currentRaw.includes("DEADLINE:")) {
      updates.raw_text = `${currentRaw}\n\nDEADLINE: ${extracted.deadline_details}`.trim();
    }
  }

  if (extracted.contact_info) {
    const { data: existing } = await supabase
      .from("grant_sources")
      .select("raw_text")
      .eq("id", grantId)
      .single();

    const currentRaw = ((existing?.raw_text || "") as string) + (updates.raw_text ? "" : "");
    if (!currentRaw.includes("CONTACT:")) {
      updates.raw_text = `${updates.raw_text || currentRaw}\n\nCONTACT: ${extracted.contact_info}`.trim();
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("grant_sources").update(updates).eq("id", grantId);
  }
}

async function main() {
  console.log("GrantAQ Requirements Extraction");
  console.log("================================");

  // Get grants with URLs that don't yet have requirements
  const { data: grantsWithReqs } = await supabase
    .from("grant_requirements")
    .select("grant_source_id");

  const hasReqs = new Set((grantsWithReqs ?? []).map((r) => r.grant_source_id));

  const { data: grants } = await supabase
    .from("grant_sources")
    .select("id, name, funder_name, source_type, url")
    .eq("is_active", true)
    .not("url", "is", null)
    .order("source_type", { ascending: true })
    .limit(MAX_GRANTS);

  const toProcess = (grants ?? []).filter((g) => !hasReqs.has(g.id) && g.url);
  console.log(`Grants with URLs: ${grants?.length ?? 0}`);
  console.log(`Already have requirements: ${hasReqs.size}`);
  console.log(`To process: ${toProcess.length}`);
  console.log("");

  let processed = 0;
  let extracted = 0;
  let fetchFailed = 0;
  let extractFailed = 0;
  let totalReqs = 0;

  for (const grant of toProcess) {
    processed++;
    const pct = Math.round((processed / toProcess.length) * 100);
    process.stdout.write(`[${processed}/${toProcess.length} ${pct}%] ${grant.name?.substring(0, 50)}... `);

    // Fetch page
    const pageText = await fetchPageText(grant.url!);
    if (!pageText) {
      console.log("SKIP (fetch failed)");
      fetchFailed++;
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }

    // Extract requirements with Claude
    const reqs = await extractRequirements(pageText, grant.name, grant.funder_name, grant.source_type);
    if (!reqs) {
      console.log("SKIP (extraction failed)");
      extractFailed++;
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_FETCHES_MS));
      continue;
    }

    const totalDocs = reqs.documents_required.length;
    const totalElig = reqs.eligibility_criteria.length;
    const totalForms = reqs.application_forms.length;

    if (totalDocs === 0 && totalElig === 0 && totalForms === 0) {
      console.log("SKIP (no requirements found on page)");
      extractFailed++;
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_FETCHES_MS));
      continue;
    }

    // Store requirements
    const count = await storeRequirements(grant.id, reqs);
    await updateGrantDetails(grant.id, reqs);

    totalReqs += count;
    extracted++;
    console.log(`OK (${totalDocs} docs, ${totalElig} eligibility, ${totalForms} forms)`);

    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_FETCHES_MS));
  }

  console.log("\n================================");
  console.log(`Done.`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Extracted: ${extracted}`);
  console.log(`  Fetch failed: ${fetchFailed}`);
  console.log(`  Extract failed: ${extractFailed}`);
  console.log(`  Total requirements stored: ${totalReqs}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
