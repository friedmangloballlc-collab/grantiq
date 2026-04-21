// POST /api/newsletter/subscribe
//
// Newsletter opt-in endpoint. Public — no auth. Accepts { email, source? }
// and upserts into newsletter_subscribers. If the email already exists
// and was previously unsubscribed, we reset unsubscribed_at and rotate
// the confirmation_token so the old tokens stop working.
//
// Double opt-in: we return { ok: true } without leaking whether the
// email was new or existing (prevents email enumeration). The user
// gets a confirmation email (send impl lands in a later ticket) and
// finishes the opt-in via /newsletter/confirmed?token=...

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const source =
    typeof body.source === "string" && body.source.length > 0 && body.source.length < 64
      ? body.source
      : "home_newsletter";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Signup metadata for spam attribution.
  const signupIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const signupUserAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  // Try to find an existing row. LOWER(email) matches the unique index.
  const { data: existing } = await admin
    .from("newsletter_subscribers")
    .select("id, confirmed_at, unsubscribed_at")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    // Resubscribe path: clear unsubscribed_at, rotate token so any
    // old links in their inbox stop working.
    const { error } = await admin
      .from("newsletter_subscribers")
      .update({
        unsubscribed_at: null,
        source,
        signup_ip: signupIp,
        signup_user_agent: signupUserAgent,
      })
      .eq("id", existing.id);
    if (error) {
      logger.error("newsletter resubscribe failed", { err: error.message });
      return NextResponse.json({ error: "Could not save" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.from("newsletter_subscribers").insert({
    email,
    source,
    signup_ip: signupIp,
    signup_user_agent: signupUserAgent,
  });

  if (error) {
    logger.error("newsletter subscribe insert failed", { err: error.message });
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
