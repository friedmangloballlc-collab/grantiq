// POST /api/leads/home-capture
//
// Lightweight lead capture from the home-page "Find My Funders" block.
// Accepts website + email, upserts into `leads` (unique by email), and
// returns { ok }. No auth required — this is a public marketing surface.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return trimmed;
}

export async function POST(req: NextRequest) {
  let body: { website?: string; email?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const website = typeof body.website === "string" ? normalizeWebsite(body.website) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert on email — a visitor might fill the form twice.
  const { error } = await admin
    .from("leads")
    .upsert(
      {
        email,
        company_name: website || null,
        intake_data: { website, submitted_at: new Date().toISOString() },
        source: "home_find_my_funders",
      },
      { onConflict: "email" }
    );

  if (error) {
    logger.error("home-capture lead insert failed", { err: error.message });
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
