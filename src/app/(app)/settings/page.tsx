import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { EnrichProfileButton } from "@/components/settings/enrich-profile-button";
import { ExportDataButton } from "@/components/settings/export-data-button";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

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
      const db = createAdminClient();
      const [{ data: orgData }, { data: profileData }] = await Promise.all([
        db.from("organizations").select("*").eq("id", membership.org_id).single(),
        db.from("org_profiles").select("*").eq("org_id", membership.org_id).single(),
      ]);
      org = orgData ? { ...orgData, ...profileData, userRole: membership.role } : null;
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

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50">Organization Settings</h2>
          <p className="text-sm text-warm-500 mt-1">
            This information is used to find and match grants.
          </p>
        </div>
        <EnrichProfileButton />
      </div>
      <OrgSettingsForm org={org} />

      {/* ── Data portability ── */}
      <div className="mt-10 rounded-lg border border-border bg-background p-5">
        <h2 className="text-base font-semibold text-foreground">Export my data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download a copy of all data associated with your account in JSON
          format. You can request one export per day.
        </p>
        <div className="mt-4">
          <ExportDataButton />
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action
          cannot be undone and there is no recovery path.
        </p>
        <div className="mt-4">
          <DeleteAccountDialog />
        </div>
      </div>
    </div>
  );
}
