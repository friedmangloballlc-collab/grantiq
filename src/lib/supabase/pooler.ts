// Use Supabase's PgBouncer pooler URL for server-side queries
// This prevents connection exhaustion at scale
export function getPoolerUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Supabase pooler is on port 6543 instead of 5432
  return url.replace(":5432/", ":6543/");
}
