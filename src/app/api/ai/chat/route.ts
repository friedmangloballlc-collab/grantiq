import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatWithGrantie } from "@/lib/ai/engines/grantie";
import { checkUsageLimit } from "@/lib/ai/usage";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed: rateLimitAllowed } = checkRateLimit(`chat:${user.id}`, 30, 60000);
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { org_id, message, context, conversation_history } = await req.json();

    if (!org_id || !message) {
      return NextResponse.json(
        { error: "org_id and message are required" },
        { status: 400 }
      );
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const db = createAdminClient();
    const { data: sub } = await db
      .from("subscriptions")
      .select("tier")
      .eq("org_id", org_id)
      .eq("status", "active")
      .single();

    const tier = sub?.tier ?? "free";

    // Check chat usage limit
    const usage = await checkUsageLimit(org_id, "chat", tier);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: "Chat limit reached",
          used: usage.used,
          limit: usage.limit,
          upgrade_message: `You've used all ${usage.limit} Grantie messages this month.`,
        },
        { status: 429 }
      );
    }

    // Build context from org data if not provided by frontend
    let grantieContext = context;
    if (!grantieContext) {
      const { data: org } = await db
        .from("organizations")
        .select("name")
        .eq("id", org_id)
        .single();

      const { data: readiness } = await db
        .from("readiness_scores")
        .select("overall_score")
        .eq("org_id", org_id)
        .order("scored_at", { ascending: false })
        .limit(1)
        .single();

      const { data: pipelineCount } = await db
        .from("grant_pipeline")
        .select("id", { count: "exact" })
        .eq("org_id", org_id);

      const { data: topMatch } = await db
        .from("grant_matches")
        .select("match_score")
        .eq("org_id", org_id)
        .order("match_score", { ascending: false })
        .limit(1)
        .single();

      const { data: recentMatches } = await db
        .from("grant_matches")
        .select("match_score, grant_sources(name, funder_name)")
        .eq("org_id", org_id)
        .order("match_score", { ascending: false })
        .limit(5);

      const { data: pipelineItems } = await db
        .from("grant_pipeline")
        .select("stage, deadline, grant_sources(name)")
        .eq("org_id", org_id)
        .limit(10);

      grantieContext = {
        currentPage: "unknown",
        pageData: {},
        orgSummary: {
          name: org?.name ?? "Your Organization",
          readiness_score: readiness?.overall_score ?? null,
          pipeline_count: pipelineCount?.length ?? 0,
          top_match_score: topMatch?.match_score ?? null,
        },
        recentMatches: ((recentMatches ?? []) as { match_score: number; grant_sources?: { name?: string; funder_name?: string } | null }[]).map((m) => ({
          grant_name: m.grant_sources?.name ?? "Unknown",
          match_score: m.match_score,
          funder_name: m.grant_sources?.funder_name ?? "Unknown",
        })),
        pipelineSummary: ((pipelineItems ?? []) as { stage?: string; deadline?: string; grant_sources?: { name?: string } | null }[]).map((p) => ({
          grant_name: p.grant_sources?.name ?? "Unknown",
          stage: p.stage,
          deadline: p.deadline,
        })),
      };
    }

    // Chat is synchronous (not a background job) since users expect immediate responses
    const result = await chatWithGrantie(
      { orgId: org_id, userId: user.id, tier },
      message,
      grantieContext,
      conversation_history ?? []
    );

    return NextResponse.json(result);
  } catch (err) {
    logger.error("POST /api/ai/chat error", { err: String(err) });
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
