import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const getOrgContext = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("org_members")
    .select("org_id, role, organizations(id, name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();

  if (!membership) return null;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("tier")
    .eq("org_id", membership.org_id)
    .single();

  return {
    userId: user.id,
    orgId: membership.org_id,
    orgName: (membership.organizations as any)?.name ?? "My Organization",
    role: membership.role,
    tier: sub?.tier ?? "free",
  };
});
