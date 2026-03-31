import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklyDigest } from "@/lib/email/send-digest";

/**
 * POST /api/digest/send
 *
 * Admin-only endpoint to manually trigger digest emails.
 * Requires the X-Admin-Secret header to match ADMIN_SECRET env var.
 *
 * Body (JSON):
 *   { org_id?: string }   — trigger for one org only
 *   {}                    — trigger for all orgs with digest enabled
 *
 * Useful for testing and manual nudges.
 */
export async function POST(req: NextRequest) {
  // Guard: require admin secret header
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers.get("x-admin-secret");

  if (!adminSecret || providedSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { org_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — means "send to all"
  }

  const supabase = createAdminClient();

  // Build the query for notification_preferences
  let prefsQuery = supabase
    .from("notification_preferences")
    .select("user_id, digest_frequency")
    .neq("digest_frequency", "off");

  // If org_id supplied, filter to only members of that org
  if (body.org_id) {
    const { data: members } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", body.org_id)
      .eq("status", "active");

    const userIds = (members ?? []).map((m) => m.user_id);

    if (!userIds.length) {
      return NextResponse.json({
        sent: 0,
        skipped: 0,
        errors: 0,
        message: "No active members found for that org",
      });
    }

    prefsQuery = prefsQuery.in("user_id", userIds);
  }

  const { data: prefs, error: prefsError } = await prefsQuery;

  if (prefsError) {
    console.error("[digest/send] DB error:", prefsError.message);
    return NextResponse.json({ error: prefsError.message }, { status: 500 });
  }

  if (!prefs?.length) {
    return NextResponse.json({ sent: 0, skipped: 0, errors: 0, message: "No eligible users" });
  }

  const results = {
    sent: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<{ userId: string; status: string; error?: string }>,
  };

  for (const pref of prefs) {
    try {
      // Get active org membership
      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", pref.user_id)
        .eq("status", "active")
        .single();

      if (!membership) {
        results.skipped++;
        results.details.push({ userId: pref.user_id, status: "skipped: no active membership" });
        continue;
      }

      // Get user email
      const { data: userRecord } = await supabase.auth.admin.getUserById(pref.user_id);
      const userEmail = userRecord?.user?.email;
      const userName = userRecord?.user?.user_metadata?.full_name as string | undefined;

      if (!userEmail) {
        results.skipped++;
        results.details.push({ userId: pref.user_id, status: "skipped: no email" });
        continue;
      }

      await sendWeeklyDigest(membership.org_id, userEmail, pref.user_id, userName);

      // Log sent notification
      await supabase.from("notifications_log").insert({
        user_id: pref.user_id,
        org_id: membership.org_id,
        notification_type: "digest",
        channel: "email",
        content_snapshot: {
          triggered_manually: true,
          sent_at: new Date().toISOString(),
        },
      });

      results.sent++;
      results.details.push({ userId: pref.user_id, status: "sent" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.errors++;
      results.details.push({ userId: pref.user_id, status: "error", error: message });
      console.error(`[digest/send] Error for user ${pref.user_id}:`, message);
    }
  }

  console.log(
    `[digest/send] Manual trigger complete — sent: ${results.sent}, skipped: ${results.skipped}, errors: ${results.errors}`
  );

  return NextResponse.json(results);
}
