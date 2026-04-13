import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/library/count
 * Returns the total count of active grants. Public endpoint (no auth required)
 * so it can be used on the marketing homepage too.
 */
export async function GET() {
  const db = createAdminClient();
  const { count, error } = await db
    .from("grant_sources")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
