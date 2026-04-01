import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const VALID_FIELDS = [
  "description",
  "eligibility",
  "amount",
  "deadline",
  "url",
  "requirements",
  "other",
] as const;

type ValidField = (typeof VALID_FIELDS)[number];

interface ReportBody {
  field: ValidField;
  currentValue: string;
  suggestedValue: string;
  notes?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: grantId } = await params;

    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 reports per user per day (86_400_000 ms)
    const rateLimitKey = `grant_report:${user.id}`;
    const { allowed } = checkRateLimit(rateLimitKey, 10, 86_400_000);

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. You may submit up to 10 corrections per day." },
        { status: 429 }
      );
    }

    // Parse and validate body
    let body: ReportBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { field, currentValue, suggestedValue, notes } = body;

    if (!field || !(VALID_FIELDS as readonly string[]).includes(field)) {
      return NextResponse.json(
        {
          error: `Invalid field. Must be one of: ${VALID_FIELDS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!suggestedValue || typeof suggestedValue !== "string" || suggestedValue.trim() === "") {
      return NextResponse.json(
        { error: "suggestedValue is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Insert via admin client to bypass RLS (user_id is set explicitly)
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("grant_corrections").insert({
      grant_source_id: grantId,
      user_id: user.id,
      field,
      current_value: currentValue ?? null,
      suggested_value: suggestedValue.trim(),
      notes: notes?.trim() ?? null,
    });

    if (insertError) {
      logger.error("Failed to insert grant correction", {
        grantId,
        userId: user.id,
        field,
        error: insertError.message,
      });
      return NextResponse.json({ error: "Failed to save correction" }, { status: 500 });
    }

    logger.info("Grant correction submitted", {
      grantId,
      userId: user.id,
      field,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("POST /api/grants/[id]/report error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
