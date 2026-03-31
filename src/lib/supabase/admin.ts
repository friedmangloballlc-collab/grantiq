import { createClient } from "@supabase/supabase-js";
import { getPoolerUrl } from "./pooler";

// Bypasses RLS — use ONLY in background jobs and admin operations.
// Uses PgBouncer pooler URL (port 6543) when available to prevent connection
// exhaustion under load. Falls back to direct URL if pooler URL is unchanged.
export function createAdminClient() {
  const poolerUrl = getPoolerUrl();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Only use pooler if the URL actually changed (i.e. contained :5432/)
  const url = poolerUrl !== supabaseUrl ? poolerUrl : supabaseUrl;
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
