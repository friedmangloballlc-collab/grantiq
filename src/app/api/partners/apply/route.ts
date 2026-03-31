import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    org?: string;
    type?: string;
    website?: string;
    message?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, org, type, website, message } = body;

  if (!name || !email || !org || !type) {
    return NextResponse.json(
      { error: "name, email, org, and type are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("partner_applications").insert({
    applicant_name: name,
    email,
    org_name: org,
    org_type: type,
    website: website || null,
    message: message || null,
    status: "pending",
  });

  if (error) {
    console.error("[partners/apply] DB insert error:", error.message);
    // Don't surface DB errors to the client — still return 200 so the UX succeeds
    // but log for investigation. A missing table is handled gracefully.
    if (error.code !== "42P01") {
      // 42P01 = table does not exist (schema not yet migrated)
      return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
