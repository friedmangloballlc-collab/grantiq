import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const VALID_ACTIONS = ["saved", "dismissed", "evaluated", "applied", "won", "lost"] as const;
type UserAction = (typeof VALID_ACTIONS)[number];

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
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    const body = await req.json();
    const { grant_source_id, user_action, match_score, relevance_rating, scorecard_overrides } = body;

    if (!grant_source_id) {
      return NextResponse.json({ error: "grant_source_id is required" }, { status: 400 });
    }

    if (!user_action || !VALID_ACTIONS.includes(user_action as UserAction)) {
      return NextResponse.json(
        { error: `user_action must be one of: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (relevance_rating !== undefined && (relevance_rating < 1 || relevance_rating > 5)) {
      return NextResponse.json({ error: "relevance_rating must be between 1 and 5" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("match_feedback")
      .insert({
        org_id: membership.org_id,
        grant_source_id,
        user_action,
        match_score: match_score ?? null,
        user_relevance_rating: relevance_rating ?? null,
        scorecard_overrides: scorecard_overrides ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feedback: data }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/feedback error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
