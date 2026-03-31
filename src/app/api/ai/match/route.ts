import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUsageLimit } from "@/lib/ai/usage";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed: rateLimitAllowed } = checkRateLimit(`match:${user.id}`, 5, 60000);
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return NextResponse.json({ error: "org_id is required" }, { status: 400 });
    }

    // Verify user belongs to this org
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get org's subscription tier
    const db = createAdminClient();
    const { data: sub } = await db
      .from("subscriptions")
      .select("tier")
      .eq("org_id", org_id)
      .eq("status", "active")
      .single();

    const tier = sub?.tier ?? "free";

    // Check usage before creating job
    const usage = await checkUsageLimit(org_id, "match", tier);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: "Usage limit reached",
          used: usage.used,
          limit: usage.limit,
          upgrade_message: `You've used all ${usage.limit} matching runs this month. Upgrade for more.`,
        },
        { status: 429 }
      );
    }

    // Create job in queue
    const { data: job, error: jobError } = await db
      .from("job_queue")
      .insert({
        job_type: "match_grants",
        payload: { org_id, user_id: user.id, tier },
        priority: 10,
      })
      .select("id")
      .single();

    if (jobError) {
      return NextResponse.json({ error: "Failed to queue job" }, { status: 500 });
    }

    return NextResponse.json({ job_id: job.id, status: "queued" }, { status: 202 });
  } catch (err) {
    logger.error("POST /api/ai/match error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
