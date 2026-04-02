import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrgCookie } from "./switch-org";

export const getOrgContext = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  // Check for an "active org" preference (set by org switcher)
  const activeOrgId = await getActiveOrgCookie();

  let membership = null;

  if (activeOrgId) {
    // Try to load the preferred org first
    const { data } = await admin
      .from("org_members")
      .select("org_id, role, organizations(id, name)")
      .eq("user_id", user.id)
      .eq("org_id", activeOrgId)
      .eq("status", "active")
      .single();
    membership = data;
  }

  // Fall back to the first active membership (existing behavior)
  if (!membership) {
    const { data } = await admin
      .from("org_members")
      .select("org_id, role, organizations(id, name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();
    membership = data;
  }

  if (!membership) return null;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("tier")
    .eq("org_id", membership.org_id)
    .single();

  return {
    userId: user.id,
    email: user.email ?? undefined,
    orgId: membership.org_id,
    orgName: (membership.organizations as any)?.name ?? "My Organization",
    role: membership.role,
    tier: sub?.tier ?? "free",
  };
});
