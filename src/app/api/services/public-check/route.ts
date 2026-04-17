import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient, MODELS, estimateCostCents } from "@/lib/ai/client";
import { buildEligibilityStatusPrompt } from "@/lib/ai/services/eligibility-status-prompt";
import { precomputeEligibilitySignals, formatSignalsForPrompt } from "@/lib/ai/services/precompute-eligibility";
import { sendLeadReportEmail, sendHotLeadAlert } from "@/lib/email/send-lead-report";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

/**
 * POST /api/services/public-check
 * Public endpoint — no auth required. Runs a free eligibility check
 * from intake form data. Saves lead to leads table for follow-up.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 checks per hour per IP to prevent abuse
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed } = checkRateLimit(`public-check:${ip}`, 3, 3600000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!body.email || !emailRegex.test(body.email) || !body.company_name) {
      return NextResponse.json({ error: "Email and company name are required" }, { status: 400 });
    }

    const db = createAdminClient();

    // Save lead for follow-up
    await db.from("leads").upsert(
      {
        email: body.email,
        full_name: body.full_name ?? null,
        phone: body.phone ?? null,
        company_name: body.company_name,
        entity_type: body.entity_type ?? null,
        state: body.state_of_formation ?? null,
        industry: body.industry ?? null,
        annual_revenue: body.annual_revenue ?? null,
        employee_count: body.employee_count ?? null,
        intake_data: body,
        source: "public_eligibility_check",
        created_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    // Build org-like data for the prompt
    const orgData: Record<string, unknown> = {
      name: body.company_name,
      entity_type: body.entity_type ?? "other",
      state: body.state_of_formation ?? null,
      industry: body.industry ?? null,
      annual_budget: revenueToNumber(body.annual_revenue),
      employee_count: employeeToNumber(body.employee_count),
      years_operating: body.year_formed ? new Date().getFullYear() - parseInt(body.year_formed, 10) : null,
      mission_statement: body.mission_statement ?? null,
      project_description: body.project_description ?? null,
      ownership_demographics: body.owner_demographics ?? [],
      funding_use: body.target_grant_types ?? [],
      sam_registration_status: body.sam_registered === "yes" ? "registered" : body.sam_registered === "unsure" ? "unknown" : "not_registered",
      federal_certifications: body.current_certifications ?? [],
      has_ein: body.ein_obtained === "yes",
      has_501c3: body.entity_type === "nonprofit_501c3",
      has_sam_registration: body.sam_registered === "yes",
      has_dedicated_bank_account: body.dedicated_bank_account === "yes",
      grant_history_level: body.won_before === "yes" ? "won" : body.applied_before === "yes" ? "applied" : "none",
      insurance_held: body.insurance_held ?? [],
      // Risk screen
      has_federal_debt: body.federal_debt === "yes",
      has_government_litigation: body.government_litigation === "yes",
      has_bankruptcy: body.bankruptcy_7yr === "yes",
      has_irs_issues: body.irs_issues === "yes",
      finances_comingled: body.finances_comingled === "yes",
    };

    // Pre-compute signals
    const signals = precomputeEligibilitySignals(orgData);
    const signalsText = formatSignalsForPrompt(signals);

    // Build prompt
    const { system, user } = buildEligibilityStatusPrompt({
      ...orgData,
      _precomputed_signals: signalsText,
    });

    // Call OpenAI directly (no usage tracking for public endpoint)
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: MODELS.SCORING,
      max_tokens: 4096,
      temperature: 0.1,
      response_format: { type: "json_object" as const },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const reportData = JSON.parse(content);

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const costCents = estimateCostCents(MODELS.SCORING, inputTokens, outputTokens);

    logger.info("Public eligibility check completed", {
      email: body.email,
      company: body.company_name,
      verdict: reportData.verdict,
      costCents,
    });

    // Fire-and-forget: send report email + hot lead alert
    sendLeadReportEmail(
      body.email,
      body.full_name ?? "",
      body.company_name,
      reportData
    ).catch(() => {});

    sendHotLeadAlert(
      body.email,
      body.company_name,
      reportData.verdict ?? "unknown",
      reportData.readiness_score ?? 0,
      body.annual_revenue ?? null
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      report: reportData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Public eligibility check failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function revenueToNumber(range: string | undefined): number | null {
  if (!range) return null;
  const map: Record<string, number> = {
    pre_revenue: 0, under_100k: 50000, "100k_500k": 300000,
    "500k_2m": 1000000, "2m_10m": 5000000, "10m_plus": 15000000,
  };
  return map[range] ?? null;
}

function employeeToNumber(range: string | undefined): number | null {
  if (!range) return null;
  const map: Record<string, number> = { "0": 0, "1-5": 3, "6-25": 15, "26-100": 60, "100+": 150 };
  return map[range] ?? null;
}
