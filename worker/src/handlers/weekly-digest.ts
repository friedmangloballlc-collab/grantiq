import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWeeklyDigest } from "@/lib/email/send-digest";

interface DigestResult {
  userId: string;
  orgId: string;
  email: string;
  status: "sent" | "skipped" | "error";
  error?: string;
}

export async function handleWeeklyDigest(supabase: SupabaseClient): Promise<void> {
  console.log("[digest] Starting weekly digest job");

  // 1. Get all users with digest enabled (not 'off')
  const { data: prefs, error: prefsError } = await supabase
    .from("notification_preferences")
    .select("user_id, digest_frequency, alert_new_matches_above_score, alert_deadline_days_before")
    .neq("digest_frequency", "off");

  if (prefsError) {
    console.error("[digest] Failed to fetch notification_preferences:", prefsError.message);
    return;
  }

  if (!prefs?.length) {
    console.log("[digest] No users with digest enabled");
    return;
  }

  console.log(`[digest] Processing ${prefs.length} user(s)`);

  const results: DigestResult[] = [];

  for (const pref of prefs) {
    let orgId: string | null = null;

    try {
      // 2. Get user's active org membership
      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", pref.user_id)
        .eq("status", "active")
        .single();

      if (!membership) {
        results.push({ userId: pref.user_id, orgId: "", email: "", status: "skipped" });
        continue;
      }

      orgId = membership.org_id;

      // 3. Get user email from auth.users via admin RPC
      // Supabase admin client exposes auth.admin.getUserById
      // The worker uses createAdminClient() internally in sendWeeklyDigest,
      // so we use the passed supabase client here only for metadata lookups.
      const { data: userRecord } = await supabase.auth.admin.getUserById(pref.user_id);

      if (!userRecord?.user?.email) {
        console.warn(`[digest] No email found for user ${pref.user_id}, skipping`);
        results.push({ userId: pref.user_id, orgId, email: "", status: "skipped" });
        continue;
      }

      const userEmail = userRecord.user.email;
      const userName = userRecord.user.user_metadata?.full_name as string | undefined;

      // 4. Send digest (fetches data internally, skips if nothing to show)
      await sendWeeklyDigest(orgId, userEmail, pref.user_id, userName);

      results.push({ userId: pref.user_id, orgId, email: userEmail, status: "sent" });

      // 5. Log to notifications_log
      await supabase.from("notifications_log").insert({
        user_id: pref.user_id,
        org_id: orgId,
        notification_type: "digest",
        channel: "email",
        content_snapshot: {
          digest_frequency: pref.digest_frequency,
          sent_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[digest] Error for user ${pref.user_id}:`, message);
      results.push({
        userId: pref.user_id,
        orgId: orgId ?? "",
        email: "",
        status: "error",
        error: message,
      });

      // Log the failure too
      if (orgId) {
        await supabase.from("notifications_log").insert({
          user_id: pref.user_id,
          org_id: orgId,
          notification_type: "digest",
          channel: "email",
          content_snapshot: {
            error: message,
            failed_at: new Date().toISOString(),
          },
        });
      }
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  console.log(`[digest] Complete — sent: ${sent}, skipped: ${skipped}, errors: ${errors}`);
}
