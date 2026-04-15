import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiCall } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/client";
import { buildReadinessDiagnosticPrompt } from "@/lib/ai/services/readiness-diagnostic-prompt";
import { logger } from "@/lib/logger";

export const maxDuration = 120; // 2 minutes — comprehensive diagnostic

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

    // Fetch full org profile data from all tables
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
        service_type: "readiness_diagnostic",
        status: "generating",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      logger.error("Failed to create diagnostic order", { error: orderError?.message, code: orderError?.code });
      return NextResponse.json({ error: `Failed to create order: ${orderError?.message ?? "unknown"}` }, { status: 500 });
    }

    // Build prompt and call AI — use GPT-4o for comprehensive output
    const { system, user: userPrompt } = buildReadinessDiagnosticPrompt(orgData);

    const tier = orgResult.data?.subscription_tier ?? "free";

    const result = await aiCall({
      model: MODELS.STRATEGY, // GPT-4o for quality on this comprehensive diagnostic
      systemPrompt: system,
      userInput: userPrompt,
      orgId,
      userId: user.id,
      tier,
      actionType: "readiness_diagnostic",
      maxTokens: 16384, // Large output for comprehensive report
      temperature: 0.1,
      skipUsageCheck: true,
    });

    // Parse the response
    let reportData;
    try {
      reportData = JSON.parse(result.content);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0]);
      } else {
        // If parsing fails entirely, store raw content
        reportData = {
          executive_summary: {
            verdict: "not_eligible",
            readiness_score: 0,
            competitive_score: 0,
            controls_score: 0,
            audit_readiness_score: 0,
            confidence: "low",
            addressable_universe: { low: 0, high: 0, program_count: 0 },
            summary: "Unable to parse diagnostic results. Please try again.",
          },
          full_report_markdown: result.content,
        };
      }
    }

    // Extract scores for the scores column
    const es = reportData.executive_summary ?? {};
    const scores = {
      readiness_score: es.readiness_score ?? 0,
      competitive_score: es.competitive_score ?? 0,
      controls_score: es.controls_score ?? 0,
      audit_readiness_score: es.audit_readiness_score ?? 0,
    };

    // Update order with results
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
    logger.error("Readiness diagnostic generation failed", { error: message });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
