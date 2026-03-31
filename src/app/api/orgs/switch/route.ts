import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { switchOrg } from "@/lib/auth/switch-org";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await req.json();
    if (!orgId || typeof orgId !== "string") {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const success = await switchOrg(user.id, orgId);
    if (!success) {
      return NextResponse.json({ error: "Not a member of that organization" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("POST /api/orgs/switch error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
