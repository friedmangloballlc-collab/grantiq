// grantiq/src/app/api/writing/review-simulation/[id]/route.ts

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
    .select("id, tier, status, review_simulation")
    .eq("id", id)
    .single();

  if (error || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Review simulation is only available for Tier 2+ and Full Confidence
  if (draft.tier === "tier1_ai_only") {
    return NextResponse.json(
      { error: "Review simulation is not available for Tier 1 drafts. Upgrade to Tier 2 or higher." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    id: draft.id,
    tier: draft.tier,
    status: draft.status,
    review_simulation: draft.review_simulation,
  });
}
