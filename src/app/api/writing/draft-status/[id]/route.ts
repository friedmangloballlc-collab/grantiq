// grantaq/src/app/api/writing/draft-status/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin-client bypass for RLS chicken-and-egg (commit 28425fd pattern)
  const admin = createAdminClient();

  const { data: draft, error } = await admin
    .from("grant_drafts")
    .select("id, org_id, status, progress_pct, current_step, tier, grant_type, price_cents, is_full_confidence, error_message, started_at, completed_at")
    .eq("id", id)
    .single();

  if (error || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Get user's active org
  const { data: membership } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();

  // Verify draft belongs to user's org
  if (draft.org_id !== membership?.org_id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json(draft);
}
