/**
 * Simple report caching — checks if a completed report exists for this org
 * that was generated recently. Returns cached report or null.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const CACHE_TTL_HOURS = 24;

export async function getCachedReport(
  db: SupabaseClient,
  orgId: string,
  serviceType: "eligibility_status" | "readiness_diagnostic"
): Promise<{ id: string; report_data: Record<string, unknown>; scores: Record<string, number> } | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from("service_orders")
    .select("id, report_data, scores")
    .eq("org_id", orgId)
    .eq("service_type", serviceType)
    .eq("status", "completed")
    .gte("completed_at", cutoff)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (data?.report_data) {
    return data as { id: string; report_data: Record<string, unknown>; scores: Record<string, number> };
  }

  return null;
}
