import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("organizations").select("id").limit(1);
    checks.database = error ? "disconnected" : "connected";
  } catch {
    checks.database = "disconnected";
  }

  const healthy = checks.database === "connected";

  return NextResponse.json(
    { status: healthy ? "healthy" : "unhealthy", checks },
    { status: healthy ? 200 : 503 }
  );
}
