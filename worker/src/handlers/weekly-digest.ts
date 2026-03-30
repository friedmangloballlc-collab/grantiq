import type { SupabaseClient } from "@supabase/supabase-js";

export async function handleWeeklyDigest(supabase: SupabaseClient): Promise<void> {
  // 1. Get all users with digest enabled
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, alert_new_matches_above_score, alert_deadline_days_before")
    .neq("digest_frequency", "off");

  if (!prefs?.length) return;

  for (const pref of prefs) {
    // 2. Get user's org membership
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id, organizations(name)")
      .eq("user_id", pref.user_id)
      .eq("status", "active")
      .single();

    if (!membership) continue;

    // 3. Get new matches above threshold (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: matches } = await supabase
      .from("grant_matches")
      .select("match_score, grant_sources(name, funder_name, amount_max)")
      .eq("org_id", membership.org_id)
      .gte("match_score", pref.alert_new_matches_above_score ?? 80)
      .gte("last_computed", weekAgo)
      .order("match_score", { ascending: false })
      .limit(5);

    // 4. Get upcoming deadlines
    const deadlineCutoff = new Date(
      Date.now() + (pref.alert_deadline_days_before ?? 14) * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: deadlines } = await supabase
      .from("grant_pipeline")
      .select("deadline, grant_sources(name)")
      .eq("org_id", membership.org_id)
      .lte("deadline", deadlineCutoff)
      .gte("deadline", new Date().toISOString())
      .order("deadline")
      .limit(5);

    // 5. Skip if nothing to report
    if (!matches?.length && !deadlines?.length) continue;

    // 6. Send email via Resend
    // TODO: render WeeklyDigest React Email template and send via Resend
    console.log(
      `[digest] Would send to user ${pref.user_id}: ${matches?.length ?? 0} matches, ${deadlines?.length ?? 0} deadlines`
    );

    // 7. Log to notifications_log
    await supabase.from("notifications_log").insert({
      user_id: pref.user_id,
      org_id: membership.org_id,
      notification_type: "digest",
      channel: "email",
      content_snapshot: {
        matches_count: matches?.length ?? 0,
        deadlines_count: deadlines?.length ?? 0,
      },
    });
  }
}
