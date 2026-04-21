// GET /api/newsletter/confirm?token=...
//
// Double opt-in confirmation. User clicks the link in their inbox;
// we set confirmed_at = now() for the matching row and redirect to
// /newsletter/confirmed. Idempotent — re-clicking the link leaves
// confirmed_at alone.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const destination = new URL("/newsletter/confirmed", req.nextUrl.origin);

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    destination.searchParams.set("error", "invalid");
    return NextResponse.redirect(destination);
  }

  const admin = createAdminClient();
  const { data: row, error: lookupErr } = await admin
    .from("newsletter_subscribers")
    .select("id, confirmed_at")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (lookupErr) {
    logger.error("newsletter confirm lookup failed", { err: lookupErr.message });
    destination.searchParams.set("error", "lookup");
    return NextResponse.redirect(destination);
  }

  if (!row) {
    destination.searchParams.set("error", "not_found");
    return NextResponse.redirect(destination);
  }

  if (!row.confirmed_at) {
    const { error: updateErr } = await admin
      .from("newsletter_subscribers")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (updateErr) {
      logger.error("newsletter confirm update failed", { err: updateErr.message });
      destination.searchParams.set("error", "update");
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(destination);
}
