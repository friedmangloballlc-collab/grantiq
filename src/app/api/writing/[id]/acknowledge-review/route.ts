// POST /api/writing/[id]/acknowledge-review
//
// Logs that the user has acknowledged review of an AI-generated draft
// before exporting or copying it. Closes the P1-4 legal audit gap on
// AI output liability allocation.
//
// Called by the draft viewer when the user clicks through the "I have
// reviewed and take responsibility" modal before a Copy All / Download
// action. The acknowledgment is per-action so we can distinguish
// "user acknowledged before copy-all" vs "user acknowledged before
// downloading PDF" vs etc.
//
// Returns { ok: true } on success. Callers should fail-open if this
// endpoint errors — we want the acknowledgment logged but we don't
// want to block a paying customer from copying their own content.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const VALID_ACTIONS = new Set([
  "copy_all",
  "copy_section",
  "download_docx",
  "download_pdf",
  "mark_submitted",
]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await ctx.params;
  if (!draftId || !/^[0-9a-f-]{36}$/i.test(draftId)) {
    return NextResponse.json({ error: "Invalid draft id" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string; content_hash?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "copy_all";
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the user actually has access to this draft. A drive-by
  // acknowledgment for someone else's draft doesn't help us
  // legally — it's only valid evidence when tied to the actual
  // customer who exported the content.
  const { data: draft } = await admin
    .from("grant_drafts")
    .select("id, org_id")
    .eq("id", draftId)
    .single();

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Confirm user is a member of the draft's org.
  const { data: membership } = await admin
    .from("org_members")
    .select("org_id")
    .eq("org_id", draft.org_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this org" }, { status: 403 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await admin.from("draft_review_acknowledgments").insert({
    draft_id: draftId,
    user_id: user.id,
    org_id: draft.org_id,
    action,
    acknowledged_ip: ip,
    acknowledged_user_agent: ua,
    content_hash: body.content_hash ?? null,
  });

  if (error) {
    // Fail-open: log the DB error but return success so the user
    // can still copy. Lost acknowledgments are a tolerable risk
    // compared to blocking export.
    logger.error("acknowledge-review insert failed", {
      draftId,
      userId: user.id,
      err: error.message,
    });
    return NextResponse.json({ ok: true, logged: false });
  }

  return NextResponse.json({ ok: true, logged: true });
}
