import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import type { OrgContext } from "@/hooks/use-org";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  // Verify user — redirect to login if unauthenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

  // Fetch the user's org membership using admin client to bypass RLS
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("org_members")
    .select("org_id, role, organizations(id, name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .single();

  // If no org yet, redirect to onboarding
  if (!membership) {
    redirect("/onboarding");
  }

  const orgId = membership.org_id;

  // Supabase returns joined rows as an array; grab the first element
  const orgRecord = Array.isArray(membership.organizations)
    ? (membership.organizations[0] as { id: string; name: string } | undefined)
    : (membership.organizations as unknown as { id: string; name: string } | null);
  const orgName = orgRecord?.name ?? "My Organization";

  const role = membership.role as OrgContext["role"];

  // Fetch subscription tier
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("tier")
    .eq("org_id", orgId)
    .single();

  const tier = (subscription?.tier ?? "free") as OrgContext["tier"];

  const orgContext: OrgContext = { orgId, orgName, role, tier, userId };

  return <AppShell orgContext={orgContext}>{children}</AppShell>;
}
