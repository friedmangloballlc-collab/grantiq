// grantiq/src/app/api/writing/draft-status/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: draft, error } = await supabase
    .from("grant_drafts")
    .select("id, status, progress_pct, current_step, tier, grant_type, price_cents, is_full_confidence, error_message, started_at, completed_at")
    .eq("id", id)
    .single();

  if (error || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  return NextResponse.json(draft);
}
