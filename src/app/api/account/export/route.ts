import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate-limit: 1 export per day per user
    const { allowed } = checkRateLimit(`account-export:${user.id}`, 1, 24 * 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "You have already exported your data today. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const admin = createAdminClient();
    const userId = user.id;

    // Resolve the user's active org membership
    const { data: membership } = await admin
      .from("org_members")
      .select("org_id, role, status, joined_at, terms_accepted_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single();

    const orgId = membership?.org_id ?? null;

    // Fetch all data in parallel
    const [
      orgResult,
      matchesResult,
      pipelineResult,
      vaultResult,
      aiUsageResult,
      scorecardsResult,
    ] = await Promise.all([
      orgId
        ? admin
            .from("organizations")
            .select("*")
            .eq("id", orgId)
            .single()
        : Promise.resolve({ data: null }),

      orgId
        ? admin
            .from("grant_matches")
            .select("id, match_score, last_computed, grant_sources(name, funder_name, deadline)")
            .eq("org_id", orgId)
            .order("match_score", { ascending: false })
            .limit(10000)
        : Promise.resolve({ data: [] }),

      orgId
        ? admin
            .from("grant_pipeline")
            .select("id, stage, notes, created_at, grant_sources(name, funder_name, deadline)")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(10000)
        : Promise.resolve({ data: [] }),

      // Vault metadata only — we do not expose stored document content
      orgId
        ? admin
            .from("vault_documents")
            .select("id, file_name, file_type, created_at")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(10000)
        : Promise.resolve({ data: [] }),

      admin
        .from("ai_usage")
        .select("id, feature, tokens_used, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10000),

      orgId
        ? admin
            .from("grant_scorecards")
            .select("id, total_score, priority, auto_disqualified, disqualify_reason, created_at, grant_sources(name, funder_name)")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(10000)
        : Promise.resolve({ data: [] }),
    ]);

    const exportPayload = {
      exported_at: new Date().toISOString(),
      user: {
        id: userId,
        email: user.email,
        created_at: user.created_at,
      },
      membership: membership ?? null,
      organization: orgResult.data ?? null,
      grant_matches: matchesResult.data ?? [],
      pipeline: pipelineResult.data ?? [],
      vault_documents_metadata: vaultResult.data ?? [],
      ai_usage: aiUsageResult.data ?? [],
      scorecards: scorecardsResult.data ?? [],
    };

    const filename = `grantiq-data-export-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("GET /api/account/export error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
