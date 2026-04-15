import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiCall } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/client";
import { buildEligibilityStatusPrompt } from "@/lib/ai/services/eligibility-status-prompt";
import { precomputeEligibilitySignals, formatSignalsForPrompt } from "@/lib/ai/services/precompute-eligibility";
import { getCachedReport } from "@/lib/ai/services/report-cache";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    const { data: membership } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }
    const orgId = membership.org_id;

    // Check cache first — return existing report if generated in last 24h
    const cached = await getCachedReport(db, orgId, "eligibility_status");
    if (cached) {
      return NextResponse.json({
        success: true,
        order_id: cached.id,
        report: cached.report_data,
        cached: true,
      });
    }

    // Fetch full org profile data
    const [orgResult, profileResult, capResult] = await Promise.all([
      db.from("organizations").select("*").eq("id", orgId).single(),
      db.from("org_profiles").select("*").eq("org_id", orgId).single(),
      db.from("org_capabilities").select("*").eq("org_id", orgId).single(),
    ]);

    const orgData = {
      ...(orgResult.data ?? {}),
      ...(profileResult.data ?? {}),
      ...(capResult.data ?? {}),
    };

    // Remove internal fields
    delete orgData.id;
    delete orgData.org_id;
    delete orgData.created_at;
    delete orgData.updated_at;
    delete orgData.stripe_customer_id;
    delete orgData.stripe_subscription_id;

    // Create order record
    const { data: order, error: orderError } = await db
      .from("service_orders")
      .insert({
        org_id: orgId,
        user_id: user.id,
        service_type: "eligibility_status",
        status: "generating",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      logger.error("Failed to create service order", { error: orderError?.message, code: orderError?.code });
      return NextResponse.json({ error: `Failed to create order: ${orderError?.message ?? "unknown"}` }, { status: 500 });
    }

    // Pre-compute deterministic eligibility signals
    const signals = precomputeEligibilitySignals(orgData);
    const signalsText = formatSignalsForPrompt(signals);

    // Build prompt with pre-computed signals injected
    const { system, user: userPrompt } = buildEligibilityStatusPrompt({
      ...orgData,
      _precomputed_signals: signalsText,
    });

    const tier = orgResult.data?.subscription_tier ?? "free";

    const result = await aiCall({
      model: MODELS.SCORING, // GPT-4o-mini — fast + cheap for structured categorization
      systemPrompt: system,
      userInput: userPrompt,
      orgId,
      userId: user.id,
      tier,
      actionType: "eligibility_status",
      maxTokens: 4096,
      temperature: 0.1,
      skipUsageCheck: true,
      responseFormat: { type: "json_object" },
    });

    const reportData = JSON.parse(result.content);

    // Update order with results
    const scores = {
      readiness_score: reportData.readiness_score ?? 0,
    };

    await db
      .from("service_orders")
      .update({
        status: "completed",
        report_data: reportData,
        scores,
        completed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      report: reportData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Eligibility status generation failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
