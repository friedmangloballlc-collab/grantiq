import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";

export default async function OrgSettingsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let org = null;
  if (user) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membership) {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", membership.org_id)
        .single();
      org = data ? { ...data, userRole: membership.role } : null;
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Organization Settings</h1>
        <p className="text-sm text-warm-500 mt-1">
          Update your organization profile. This information is used to find and match grants.
        </p>
      </div>
      <OrgSettingsForm org={org} />
    </div>
  );
}
