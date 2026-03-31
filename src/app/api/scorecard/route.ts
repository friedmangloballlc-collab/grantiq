import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ─── GET: retrieve scorecard for a grant/org pair ─────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "No active org membership" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const grantSourceId = searchParams.get("grant_source_id");

    if (!grantSourceId) {
      return NextResponse.json(
        { error: "grant_source_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("grant_scorecards")
      .select("*")
      .eq("org_id", membership.org_id)
      .eq("grant_source_id", grantSourceId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scorecard: data ?? null });
  } catch (err) {
    console.error("GET /api/scorecard error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: save or update a scorecard ────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "No active org membership" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      grant_source_id,
      criteria,
      total_score,
      priority,
      auto_disqualified,
      disqualify_reason,
    } = body;

    if (!grant_source_id) {
      return NextResponse.json(
        { error: "grant_source_id is required" },
        { status: 400 }
      );
    }

    if (total_score === undefined || !priority) {
      return NextResponse.json(
        { error: "total_score and priority are required" },
        { status: 400 }
      );
    }

    const orgId = membership.org_id;

    // Upsert — if scorecard exists for this org+grant, update it
    const { data, error } = await supabase
      .from("grant_scorecards")
      .upsert(
        {
          org_id: orgId,
          grant_source_id,
          criteria: criteria ?? [],
          total_score: Math.round(total_score),
          priority,
          auto_disqualified: auto_disqualified ?? false,
          disqualify_reason: disqualify_reason ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,grant_source_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Fire-and-forget feedback: record "evaluated" with AI vs user score diff ──
    const aiScore = body.ai_score ?? null; // optional: caller may pass original AI score
    const scorecardOverrides =
      aiScore !== null && aiScore !== Math.round(total_score)
        ? { ai_score: aiScore, user_score: Math.round(total_score), delta: Math.round(total_score) - aiScore }
        : null;

    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_source_id,
        user_action: "evaluated",
        match_score: Math.round(total_score),
        scorecard_overrides: scorecardOverrides,
      }),
    }).catch(() => {
      // Feedback failures are non-critical — swallow silently.
    });

    return NextResponse.json({ scorecard: data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/scorecard error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
