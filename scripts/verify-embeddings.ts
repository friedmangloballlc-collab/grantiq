// Quick manual verification script — run via tsx
// Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/verify-embeddings.ts
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { generateMissingGrantEmbeddings } from "../src/lib/embeddings/generate-embeddings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const result = await generateMissingGrantEmbeddings(supabase, openai, { limit: 10, dryRun: false });
console.log("Embedding result (first 10):", result);
