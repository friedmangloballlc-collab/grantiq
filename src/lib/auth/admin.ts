// grantiq/src/lib/auth/admin.ts
//
// Centralized admin bypass for usage limits, payment gates, and tier
// restrictions. An "admin" is any user whose email is in the comma-separated
// ADMIN_EMAILS env var (or the legacy single ADMIN_EMAIL var for backwards
// compatibility). Admins:
//   - Skip ai_usage row counts (checkUsageLimit)
//   - Skip token ceiling enforcement (checkTokenCeiling)
//   - Skip Stripe payment requirement on writing pipeline starts
//   - Skip per-day search rate limits on /api/library/search
//   - See unlimited matches regardless of subscription tier
//
// The check is intentionally email-based, not role-table-based, so
// configuration is environment-controlled and can't be modified by anyone
// without env access. This is the right tradeoff at this scale; promote to
// a database role table once admin count grows past ~5.
//
// Caching: per-org admin status is cached in-process for 5 minutes via the
// resolveOrgAdminStatus helper. Cache invalidates on process restart, so
// granting/revoking admin via env change requires a redeploy.

import { createAdminClient } from "@/lib/supabase/admin";

/** Returns the configured admin email allow-list (lowercased). */
function getAdminEmails(): string[] {
  const multi = process.env.ADMIN_EMAILS;
  const single = process.env.ADMIN_EMAIL;
  const raw = multi ?? single ?? "getreachmediallc@gmail.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/** Synchronous check against the configured admin allow-list. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

// Per-org admin cache. Key = org_id. Value = { isAdmin, expiresAt }.
// 5-minute TTL — long enough to skip the auth.users join on hot paths,
// short enough that env-var changes propagate within a few minutes
// after redeploy without explicit invalidation.
const orgAdminCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();
const ORG_ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Returns true if any active member of the org has an admin email.
 *
 * Why "any active member" not "owner only": the smallest GrantIQ orgs are
 * single-user. Restricting bypass to org owners would force an owner-role
 * lookup that's not always populated. The "is anyone here an admin?" check
 * is sufficient since the admin allow-list is itself tightly controlled.
 *
 * Fail-open on database errors (return false): worst case, a real admin
 * gets gated and re-tries. Better than failing closed and breaking
 * the whole page when auth.users is briefly unreachable.
 */
export async function isAdminOrg(orgId: string): Promise<boolean> {
  if (!orgId) return false;

  const cached = orgAdminCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) return cached.isAdmin;

  try {
    const admin = createAdminClient();
    const { data: members } = await admin
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("status", "active");

    if (!members || members.length === 0) {
      orgAdminCache.set(orgId, { isAdmin: false, expiresAt: Date.now() + ORG_ADMIN_CACHE_TTL_MS });
      return false;
    }

    const allowed = getAdminEmails();
    if (allowed.length === 0) {
      orgAdminCache.set(orgId, { isAdmin: false, expiresAt: Date.now() + ORG_ADMIN_CACHE_TTL_MS });
      return false;
    }

    // auth.users is in the auth schema; admin client has access via service role.
    const userIds = members.map((m: { user_id: string }) => m.user_id);
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (!users) {
      // Treat list failure as non-admin for this lookup; do not cache so we
      // retry on the next request when transient issues clear.
      return false;
    }

    const orgEmails = users.users
      .filter((u) => userIds.includes(u.id))
      .map((u) => u.email?.toLowerCase() ?? "");
    const isAdmin = orgEmails.some((e) => allowed.includes(e));

    orgAdminCache.set(orgId, { isAdmin, expiresAt: Date.now() + ORG_ADMIN_CACHE_TTL_MS });
    return isAdmin;
  } catch {
    return false;
  }
}

/** Test/admin-tooling escape hatch — clears the in-process cache. */
export function clearOrgAdminCache(): void {
  orgAdminCache.clear();
}
