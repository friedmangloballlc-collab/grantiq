import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";

export default async function NotificationsSettingsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaultPrefs = {
    digest_frequency: "weekly" as const,
    alert_new_matches_above_score: 80,
    alert_deadline_days_before: 14,
    alert_pipeline_stale_days: 7,
  };

  let prefs = defaultPrefs;

  if (user) {
    const { data } = await supabase
      .from("notification_preferences")
      .select(
        "digest_frequency, alert_new_matches_above_score, alert_deadline_days_before, alert_pipeline_stale_days"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      prefs = {
        digest_frequency: (data.digest_frequency ?? "weekly") as typeof defaultPrefs.digest_frequency,
        alert_new_matches_above_score: data.alert_new_matches_above_score ?? 80,
        alert_deadline_days_before: data.alert_deadline_days_before ?? 14,
        alert_pipeline_stale_days: data.alert_pipeline_stale_days ?? 7,
      };
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Notification Preferences
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Control your weekly digest and grant alert settings.
        </p>
      </div>
      <NotificationPreferencesForm initialPrefs={prefs} />
    </div>
  );
}
