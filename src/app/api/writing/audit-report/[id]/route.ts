// grantaq/src/app/api/writing/audit-report/[id]/route.ts

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
    .select("id, org_id, tier, status, sections, rewritten_sections, coherence_report, audit_report, review_simulation, compliance_report")
    .eq("id", id)
    .single();

  if (error || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Get user's active org
  const { data: membership } = await supabase
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

  // Tier 1 users cannot see audit/review data
  if (draft.tier === "tier1_ai_only") {
    return NextResponse.json({
      id: draft.id,
      tier: draft.tier,
      status: draft.status,
      sections: draft.sections,
      coherence_report: draft.coherence_report,
      compliance_report: draft.compliance_report,
      audit_report: null,
      review_simulation: null,
      rewritten_sections: null,
    });
  }

  return NextResponse.json(draft);
}
