import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TeamManagement } from "@/components/settings/team-management";

export default async function TeamPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let orgId: string | null = null;
  let userRole: string | null = null;
  let members: Array<{
    id: string;
    user_id: string;
    role: string;
    status: string;
    created_at: string;
    email?: string;
    name?: string;
  }> = [];

  if (user) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membership) {
      orgId = membership.org_id;
      userRole = membership.role;

      const { data } = await supabase
        .from("org_members")
        .select("id, user_id, role, status, created_at, profiles(email, full_name)")
        .eq("org_id", membership.org_id)
        .order("created_at", { ascending: true });

      if (data) {
        interface MemberRow {
          id: string;
          user_id: string;
          role: string;
          status: string;
          created_at: string;
          profiles?: { email?: string; full_name?: string } | null;
        }

        members = (data as MemberRow[]).map((m) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          status: m.status,
          created_at: m.created_at,
          email: m.profiles?.email ?? undefined,
          name: m.profiles?.full_name ?? undefined,
        }));
      }
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Team</h1>
        <p className="text-sm text-warm-500 mt-1">
          Manage team members and invitations for your organization.
        </p>
      </div>
      <TeamManagement
        orgId={orgId}
        currentUserId={user?.id ?? null}
        userRole={userRole}
        members={members}
      />
    </div>
  );
}
