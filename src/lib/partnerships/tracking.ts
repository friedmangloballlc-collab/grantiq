/**
 * Partner referral tracking.
 *
 * Partners embed the GrantIQ widget on their websites using a `data-partner`
 * attribute (e.g. `data-partner="SCORE"`). The embed script forwards this as a
 * `?partner=` query param to the widget page, which in turn appends it to the
 * /signup URL as `?ref=<partner>`.
 *
 * This module records a referral row when a new user signs up via a partner link
 * and provides helpers for reading partner performance data.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface PartnerReferral {
  id: string;
  partner_slug: string;
  user_id: string | null;
  org_id: string | null;
  referred_by_partner: string;
  signup_completed: boolean;
  created_at: string;
  converted_at: string | null;
}

export interface PartnerStats {
  partner_slug: string;
  total_referrals: number;
  completed_signups: number;
  conversion_rate: number;
}

/**
 * Record a partner referral when a user arrives from a partner embed.
 * Call this from the signup API after a user is created.
 */
export async function recordPartnerReferral({
  partnerSlug,
  userId,
  orgId,
}: {
  partnerSlug: string;
  userId: string;
  orgId: string;
}): Promise<void> {
  if (!partnerSlug || partnerSlug === "direct") return;

  const supabase = createAdminClient();

  const { error } = await supabase.from("partner_referrals").insert({
    partner_slug: partnerSlug,
    user_id: userId,
    org_id: orgId,
    referred_by_partner: partnerSlug,
    signup_completed: true,
    converted_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[partnerships] Failed to record referral:", error.message);
  }
}

/**
 * Record a widget impression (user arrived at embed, before signup).
 * Call this from the embed page via an API route if desired.
 */
export async function recordPartnerImpression(partnerSlug: string): Promise<void> {
  if (!partnerSlug || partnerSlug === "direct") return;

  const supabase = createAdminClient();

  const { error } = await supabase.from("partner_referrals").insert({
    partner_slug: partnerSlug,
    referred_by_partner: partnerSlug,
    signup_completed: false,
  });

  if (error) {
    console.error("[partnerships] Failed to record impression:", error.message);
  }
}

/**
 * Get performance stats for all partners, or a specific one.
 * Used in the admin dashboard.
 */
export async function getPartnerStats(partnerSlug?: string): Promise<PartnerStats[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("partner_referrals")
    .select("partner_slug, signup_completed");

  if (partnerSlug) {
    query = query.eq("partner_slug", partnerSlug);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const map: Record<string, { total: number; completed: number }> = {};
  for (const row of data) {
    const slug = row.partner_slug as string;
    if (!map[slug]) map[slug] = { total: 0, completed: 0 };
    map[slug].total++;
    if (row.signup_completed) map[slug].completed++;
  }

  return Object.entries(map).map(([slug, counts]) => ({
    partner_slug: slug,
    total_referrals: counts.total,
    completed_signups: counts.completed,
    conversion_rate: counts.total > 0 ? counts.completed / counts.total : 0,
  }));
}

/**
 * Normalize a partner slug from a URL query param.
 * Returns "direct" if missing or invalid.
 */
export function normalizePartnerSlug(raw: string | null | undefined): string {
  if (!raw) return "direct";
  // Allow alphanumeric + hyphens + underscores, max 64 chars
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned || "direct";
}
