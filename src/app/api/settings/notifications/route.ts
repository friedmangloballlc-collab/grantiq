import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/settings/notifications
 * Returns the current user's notification preferences.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: prefs, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return defaults if no row yet
    const defaults = {
      digest_frequency: "weekly",
      alert_new_matches_above_score: 80,
      alert_deadline_days_before: 14,
      alert_pipeline_stale_days: 7,
      preferred_channels: ["email"],
    };

    return NextResponse.json({ prefs: prefs ?? defaults });
  } catch (err) {
    logger.error("GET /api/settings/notifications error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/notifications
 * Upserts the current user's notification preferences.
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      digest_frequency?: "daily" | "weekly" | "biweekly" | "off";
      alert_new_matches_above_score?: number;
      alert_deadline_days_before?: number;
      alert_pipeline_stale_days?: number;
    };

    // Validate digest_frequency
    const validFrequencies = ["daily", "weekly", "biweekly", "off"] as const;
    if (body.digest_frequency && !validFrequencies.includes(body.digest_frequency)) {
      return NextResponse.json({ error: "Invalid digest_frequency" }, { status: 400 });
    }

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          ...body,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("PATCH /api/settings/notifications error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
