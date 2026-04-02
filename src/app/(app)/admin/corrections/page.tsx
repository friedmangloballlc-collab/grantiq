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
import { CorrectionsTable, type Correction } from "@/components/admin/corrections-table";

const ADMIN_EMAIL = "getreachmediallc@gmail.com";

export default async function AdminCorrectionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  // Fetch all pending corrections joined with grant name and user email
  const { data: rawCorrections } = await admin
    .from("grant_corrections")
    .select(
      "id, grant_id, field_name, current_value, suggested_value, notes, status, created_at, user_id, grant_sources(name)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Collect user ids to resolve emails
  const userIds = [
    ...new Set((rawCorrections ?? []).map((r) => (r as { user_id: string }).user_id)),
  ];

  let emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    // auth.users is not queryable via the JS client directly — use admin RPC or
    // fall back to a profiles/org_members lookup if available.
    const { data: memberRows } = await admin
      .from("org_members")
      .select("user_id, organizations(name)")
      .in("user_id", userIds)
      .eq("status", "active");

    // We can't get email from org_members, so we use the Supabase Admin auth API
    // to batch-fetch users. The JS client exposes listUsers() on the admin auth namespace.
    const authAdminClient = createAdminClient();
    for (const uid of userIds) {
      const { data: userData } = await authAdminClient.auth.admin.getUserById(uid);
      if (userData?.user?.email) {
        emailMap[uid] = userData.user.email;
      }
    }

    void memberRows; // suppress unused warning
  }

  const corrections: Correction[] = (rawCorrections ?? []).map((r) => {
    const row = r as {
      id: string;
      grant_id: string;
      field_name: string;
      current_value: string | null;
      suggested_value: string | null;
      notes: string | null;
      status: string;
      created_at: string;
      user_id: string;
      grant_sources: { name?: string } | null;
    };
    return {
      id: row.id,
      grant_id: row.grant_id,
      grant_name: row.grant_sources?.name ?? null,
      field_name: row.field_name,
      current_value: row.current_value,
      suggested_value: row.suggested_value,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      user_id: row.user_id,
      user_email: emailMap[row.user_id] ?? null,
    };
  });

  return (
    <div className="space-y-6 max-w-6xl px-4 md:px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Grant Corrections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve or reject user-submitted corrections to grant data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Corrections</CardTitle>
          <CardDescription>
            {corrections.length} correction{corrections.length !== 1 ? "s" : ""} awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CorrectionsTable corrections={corrections} />
        </CardContent>
      </Card>
    </div>
  );
}
