import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";

const SETTINGS_NAV = [
  { href: "/settings", label: "Organization", description: "Profile, mission, location" },
  { href: "/settings/notifications", label: "Notifications", description: "Digest emails and alerts" },
  { href: "/settings/team", label: "Team", description: "Members and roles" },
  { href: "/settings/billing", label: "Billing", description: "Plan and usage" },
];

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
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Settings</h1>
        <p className="text-sm text-warm-500 mt-1">
          Manage your organization profile, notifications, team, and billing.
        </p>
      </div>

      {/* Settings navigation */}
      <div className="grid grid-cols-2 gap-2 mb-8 sm:grid-cols-4">
        {SETTINGS_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col gap-0.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-muted-foreground hover:bg-accent"
          >
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.description}</span>
          </Link>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50">Organization Settings</h2>
        <p className="text-sm text-warm-500 mt-1">
          This information is used to find and match grants.
        </p>
      </div>
      <OrgSettingsForm org={org} />
    </div>
  );
}
