import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiCall } from "@/lib/ai/call";
import { MODELS } from "@/lib/ai/client";
import { buildEligibilityStatusPrompt } from "@/lib/ai/services/eligibility-status-prompt";
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

    // Build prompt and call AI
    const { system, user: userPrompt } = buildEligibilityStatusPrompt(orgData);

    const tier = orgResult.data?.subscription_tier ?? "free";

    const result = await aiCall({
      model: MODELS.STRATEGY, // Use GPT-4o for quality
      systemPrompt: system,
      userInput: userPrompt,
      orgId,
      userId: user.id,
      tier,
      actionType: "eligibility_status",
      maxTokens: 4096,
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
        throw new Error("Failed to parse AI response as JSON");
      }
    }

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
