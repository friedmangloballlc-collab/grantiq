// GET /api/newsletter/unsubscribe?token=...
// POST /api/newsletter/unsubscribe
//
// One-click unsubscribe. GET works via email footer link (RFC 8058
// requires GET support for List-Unsubscribe=One-Click). POST accepts
// { token } from the in-product unsubscribe page.
//
// Both flows are idempotent: re-hitting the same token just reaffirms
// the unsubscribed_at timestamp without errors.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

async function unsubscribeByToken(token: string) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return { ok: false, status: 400, error: "Invalid token" };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("confirmation_token", token);

  if (error) {
    logger.error("newsletter unsubscribe failed", { err: error.message });
    return { ok: false, status: 500, error: "Could not unsubscribe" };
  }
  return { ok: true, status: 200 };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = await unsubscribeByToken(token);
  // GET always redirects to the confirmation page so the browser
  // doesn't render raw JSON to the user.
  const url = new URL("/newsletter/unsubscribed", req.nextUrl.origin);
  if (!result.ok) url.searchParams.set("error", "1");
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = await unsubscribeByToken(body.token ?? "");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
