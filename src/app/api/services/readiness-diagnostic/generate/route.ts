import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runParallelDiagnostic } from "@/lib/ai/services/diagnostic-parallel";
import { precomputeEligibilitySignals } from "@/lib/ai/services/precompute-eligibility";
import { getCachedReport } from "@/lib/ai/services/report-cache";
import { logger } from "@/lib/logger";

export const maxDuration = 120; // 2 minutes

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
    const cached = await getCachedReport(db, orgId, "readiness_diagnostic");
    if (cached) {
      return NextResponse.json({
        success: true,
        order_id: cached.id,
        report: cached.report_data,
        cached: true,
      });
    }

    // Fetch full org profile data from all tables
    const [orgResult, profileResult, capResult] = await Promise.all([
      db.from("organizations").select("*").eq("id", orgId).single(),
      db.from("org_profiles").select("*").eq("org_id", orgId).single(),
      db.from("org_capabilities").select("*").eq("org_id", orgId).single(),
    ]);

    const orgData: Record<string, unknown> = {
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
        service_type: "readiness_diagnostic",
        status: "generating",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      logger.error("Failed to create diagnostic order", { error: orderError?.message, code: orderError?.code });
      return NextResponse.json({ error: `Failed to create order: ${orderError?.message ?? "unknown"}` }, { status: 500 });
    }

    // Pre-compute deterministic eligibility signals
    const signals = precomputeEligibilitySignals(orgData);

    // Run parallel diagnostic (4 mini calls + 1 synthesis)
    const result = await runParallelDiagnostic(orgData, signals);

    logger.info("Diagnostic complete", {
      orderId: order.id,
      durationMs: result.durationMs,
      inputTokens: result.totalInputTokens,
      outputTokens: result.totalOutputTokens,
      costCents: result.totalCostCents,
    });

    // Extract scores
    const es = (result.reportData.executive_summary as Record<string, unknown>) ?? {};
    const scores = {
      readiness_score: (es.readiness_score as number) ?? 0,
      competitive_score: (es.competitive_score as number) ?? 0,
      controls_score: ((result.reportData.controls_score as number) ?? (es.controls_score as number)) ?? 0,
      audit_readiness_score: ((result.reportData.audit_readiness_score as number) ?? (es.audit_readiness_score as number)) ?? 0,
    };

    // Update order with results
    await db
      .from("service_orders")
      .update({
        status: "completed",
        report_data: result.reportData,
        scores,
        completed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      report: result.reportData,
      duration_ms: result.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Readiness diagnostic generation failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
