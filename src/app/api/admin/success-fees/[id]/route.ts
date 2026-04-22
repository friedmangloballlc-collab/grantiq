// PATCH /api/admin/success-fees/[id]
//
// Update the lifecycle of an existing success fee invoice. Admin-only.
// Fields you can set:
//   - funds_received_at → locks the due_at (30 days later)
//   - status: 'invoiced' | 'paid' | 'waived'
//   - stripe_invoice_id (when status goes to 'invoiced' or 'paid')
//   - paid_at (when status goes to 'paid')
//   - notes (append-only, free text)

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import { computeDueDate } from "@/lib/billing/success-fee";

interface UpdateBody {
  status?: "pending" | "invoiced" | "paid" | "waived";
  funds_received_at?: string | null;
  stripe_invoice_id?: string | null;
  paid_at?: string | null;
  notes?: string;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status) patch.status = body.status;
  if (body.stripe_invoice_id !== undefined)
    patch.stripe_invoice_id = body.stripe_invoice_id;
  if (body.paid_at !== undefined) patch.paid_at = body.paid_at;

  if (body.funds_received_at !== undefined) {
    patch.funds_received_at = body.funds_received_at;
    // Recompute due_at when funds_received_at changes.
    const funds = body.funds_received_at ? new Date(body.funds_received_at) : null;
    patch.due_at = computeDueDate(funds)?.toISOString() ?? null;
  }

  if (body.notes) {
    // Append new notes with a timestamp + author. Don't clobber.
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("success_fee_invoices")
      .select("notes")
      .eq("id", id)
      .single();
    const prior = (existing?.notes as string | null) ?? "";
    const line = `[${new Date().toISOString()} ${user.email}] ${body.notes}`;
    patch.notes = prior ? `${prior}\n${line}` : line;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("success_fee_invoices")
    .update(patch)
    .eq("id", id);

  if (error) {
    logger.error("success-fee update failed", { id, err: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logger.info("success-fee updated", { id, patch, updated_by: user.email });
  return NextResponse.json({ ok: true });
}
