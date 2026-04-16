import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const db = createAdminClient();
  await db.from("leads").update({ nurture_status: "unsubscribed" }).eq("email", email);

  return NextResponse.json({ success: true });
}
