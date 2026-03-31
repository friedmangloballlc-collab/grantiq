import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const ACTIVE_ORG_COOKIE = "grantaq_active_org";

export async function switchOrg(userId: string, orgId: string): Promise<boolean> {
  const admin = createAdminClient();

  // Verify the user is actually a member of this org
  const { data: membership } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .eq("status", "active")
    .single();

  if (!membership) return false;

  // Persist the active org choice in a cookie
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return true;
}

export async function getActiveOrgCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
}

export async function clearActiveOrgCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE);
}
