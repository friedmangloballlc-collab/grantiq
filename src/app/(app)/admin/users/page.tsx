import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TierSelect } from "@/components/admin/tier-select";

const ADMIN_EMAIL = "getreachmediallc@gmail.com";

interface UserRow {
  userId: string;
  email: string;
  orgName: string;
  orgId: string;
  tier: string;
  role: string;
  signupDate: string;
  lastSignIn: string | null;
}

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  // Fetch all org memberships with org + subscription info
  const { data: memberships } = await admin
    .from("org_members")
    .select(
      "user_id, role, created_at, organizations(id, name), subscriptions(tier, status)"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Collect unique user ids
  const userIds = [
    ...new Set((memberships ?? []).map((m) => (m as { user_id: string }).user_id)),
  ];

  // Batch-fetch auth user data (email, last_sign_in_at)
  const authMap: Record<
    string,
    { email?: string | null; last_sign_in_at?: string | null; created_at?: string | null }
  > = {};

  for (const uid of userIds) {
    const { data: userData } = await admin.auth.admin.getUserById(uid);
    if (userData?.user) {
      authMap[uid] = {
        email: userData.user.email,
        last_sign_in_at: userData.user.last_sign_in_at,
        created_at: userData.user.created_at,
      };
    }
  }

  const rows: UserRow[] = (memberships ?? []).map((m) => {
    const row = m as unknown as {
      user_id: string;
      role: string;
      created_at: string;
      organizations: { id: string; name: string } | null;
      subscriptions: Array<{ tier: string; status: string }> | { tier: string; status: string } | null;
    };

    // subscriptions can be array or single object depending on join
    let tier = "free";
    if (Array.isArray(row.subscriptions)) {
      tier = row.subscriptions[0]?.tier ?? "free";
    } else if (row.subscriptions) {
      tier = (row.subscriptions as { tier: string }).tier ?? "free";
    }

    const auth = authMap[row.user_id];

    return {
      userId: row.user_id,
      email: auth?.email ?? row.user_id,
      orgName: row.organizations?.name ?? "—",
      orgId: row.organizations?.id ?? "",
      tier,
      role: row.role,
      signupDate: auth?.created_at ?? row.created_at,
      lastSignIn: auth?.last_sign_in_at ?? null,
    };
  });

  function fmt(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6 max-w-6xl px-4 md:px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All active users with their org, subscription tier, and last login.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>{rows.length} active user{rows.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Org</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Tier</th>
                    <th className="pb-2 pr-4">Signed up</th>
                    <th className="pb-2">Last login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.userId} className="align-middle">
                      <td className="py-3 pr-4 font-medium text-warm-900 dark:text-warm-50 max-w-[200px] truncate">
                        {row.email}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground max-w-[160px] truncate">
                        {row.orgName}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                          {row.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <TierSelect userId={row.userId} currentTier={row.tier} />
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {fmt(row.signupDate)}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmt(row.lastSignIn)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
