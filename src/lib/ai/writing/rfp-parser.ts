// grantaq/src/lib/ai/writing/rfp-parser.ts
//
// Migrated from direct Anthropic SDK calls to aiCall (service-audit pass,
// 2026-04-19). Same pattern as funder-analyzer + draft-generator.
//
// actionType='draft' was chosen because RFP parsing is a prerequisite
// step of the drafting pipeline; it counts toward the org's ai_drafts
// quota rather than inventing a new 'rfp_parse' feature that would
// require new tier_limits rows.

// Dynamic import to avoid build-time DOM polyfill issues
async function loadPdfParse(): Promise<(buf: Buffer) => Promise<{ text: string }>> {
  const mod = await import("pdf-parse");
  // Dynamic import shape is unpredictable — cast through unknown
  return (mod as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? (mod as unknown as (buf: Buffer) => Promise<{ text: string }>);
}
import { RfpParseOutputSchema, type RfpParseOutput } from "./schemas";
import { RFP_PARSER_SYSTEM_PROMPT } from "./prompts";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiCall } from "@/lib/ai/call";
import { ANTHROPIC_MODELS } from "@/lib/ai/client";

interface ParseRfpInput {
  org_id: string;
  user_id: string;
  subscription_tier: string;
  source_type: "pdf_upload" | "text_paste" | "url";
  pdf_buffer?: Buffer;        // For PDF uploads
  raw_text?: string;          // For text paste
  file_url?: string;          // Supabase Storage path (stored after upload)
  grant_source_id?: string;
  pipeline_id?: string;
}

interface ParseRfpResult {
  rfp_analysis_id: string;
  parsed_data: RfpParseOutput;
}

/**
 * Extracts text from a PDF buffer using pdf-parse.
 * Handles common PDF issues: OCR-only PDFs return minimal text.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = await loadPdfParse();
  const result = await pdfParse(buffer);
  if (!result.text || result.text.trim().length < 100) {
    throw new Error(
      "PDF appears to be image-only or heavily formatted. " +
      "Please paste the text directly or upload a text-based PDF."
    );
  }
  return result.text;
}

interface ClaudeParserContext {
  org_id: string;
  user_id: string;
  subscription_tier: string;
}

/**
 * Calls Claude Sonnet to parse an RFP/NOFO document into structured data.
 * Validates output with Zod. Retries once on validation failure with error
 * feedback. Routes through aiCall for prompt caching + usage tracking.
 */
export async function callClaudeParser(
  text: string,
  ctx: ClaudeParserContext
): Promise<RfpParseOutput> {
  const truncatedText = text.slice(0, 120_000); // ~30K tokens, Sonnet context safety

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const userMessage = attempt === 0
      ? `Analyze this RFP/NOFO document and extract structured data:\n\n${truncatedText}`
      : `Your previous response failed validation with this error: ${lastError}\n\nPlease fix the output and try again. Here is the document:\n\n${truncatedText}`;

    const response = await aiCall({
      provider: "anthropic",
      model: ANTHROPIC_MODELS.SCORING,
      systemPrompt: RFP_PARSER_SYSTEM_PROMPT,
      userInput: userMessage,
      promptId: "writing.rfp_parse.v1",
      orgId: ctx.org_id,
      userId: ctx.user_id,
      tier: ctx.subscription_tier,
      actionType: "draft",
      maxTokens: 8192,
      temperature: 0,
    });

    try {
      const parsed = JSON.parse(response.content);
      const validated = RfpParseOutputSchema.parse(parsed);
      return validated;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        throw new Error(`RFP parse validation failed after retry: ${lastError}`);
      }
    }
  }

  throw new Error("RFP parse failed unexpectedly");
}

/**
 * Main entry point: parse an RFP, validate output, store in database.
 * Returns the rfp_analysis_id for use in the draft pipeline.
 */
export async function parseRfp(input: ParseRfpInput): Promise<ParseRfpResult> {
  // 1. Extract text from source
  let rawText: string;
  if (input.source_type === "pdf_upload" && input.pdf_buffer) {
    rawText = await extractPdfText(input.pdf_buffer);
  } else if (input.source_type === "text_paste" && input.raw_text) {
    rawText = input.raw_text;
  } else {
    throw new Error("Invalid source: provide pdf_buffer for PDF or raw_text for text paste");
  }

  if (rawText.trim().length < 200) {
    throw new Error("Document is too short to be a valid RFP. Please provide the full document.");
  }

  // 2. Parse with Claude
  const parsed = await callClaudeParser(rawText, {
    org_id: input.org_id,
    user_id: input.user_id,
    subscription_tier: input.subscription_tier,
  });

  // 3. Store in database
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("grant_rfp_analyses")
    .insert({
      org_id: input.org_id,
      grant_source_id: input.grant_source_id || null,
      pipeline_id: input.pipeline_id || null,
      source_type: input.source_type,
      source_file_url: input.file_url || null,
      source_text: rawText.slice(0, 500_000), // Cap storage at 500K chars
      parsed_data: parsed,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to store RFP analysis: ${error?.message}`);
  }

  return {
    rfp_analysis_id: data.id,
    parsed_data: parsed,
  };
}
