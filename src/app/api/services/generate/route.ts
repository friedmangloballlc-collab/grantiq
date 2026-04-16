import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient, MODELS } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

export const maxDuration = 120;

const SERVICE_PROMPTS: Record<string, { system: string; maxTokens: number }> = {
  starter_grant_package: {
    system: `You are a senior grant writer preparing starter grant applications for first-time grant seekers. Based on the organization's profile, write 3-5 complete application responses for first-timer-friendly grants (Amber Grant, Hello Alice, Comcast RISE, FedEx Small Business Grant, local community foundations).

For each application, provide:
- grant_name: name of the grant
- funder: who offers it
- award_range: typical amount
- application_text: complete written response (500-1000 words)
- submission_url: where to apply (use "verify current URL" if unsure)
- deadline_note: when it's typically due
- tips: 2-3 specific tips for this application

Respond with valid JSON: { "applications": [...], "cover_letter_template": "...", "tracking_checklist": [...] }`,
    maxTokens: 8000,
  },

  nonprofit_formation: {
    system: `You are a nonprofit formation specialist. Generate a complete 501(c)(3) formation package based on the organization's mission, state, and details.

Include:
- formation_checklist: step-by-step checklist with timeline and costs
- articles_template: articles of incorporation template customized to their state
- bylaws_template: bylaws template with standard governance provisions
- form_1023_guide: detailed prep guide for IRS Form 1023 or 1023-EZ (recommend which)
- ein_guide: step-by-step EIN application instructions
- state_registration: state-specific registration requirements
- board_requirements: board composition and governance recommendations
- estimated_timeline: total timeline from start to IRS determination
- estimated_cost: itemized costs (filing fees, legal, etc.)

Respond with valid JSON. All templates should be complete, not placeholders.`,
    maxTokens: 12000,
  },

  sam_registration: {
    system: `You are a SAM.gov registration specialist. Generate a complete SAM.gov registration guide and preparation package.

Include:
- prerequisites: what they need before starting (EIN, DUNS/UEI, bank account, etc.)
- step_by_step: detailed registration steps with screenshots descriptions
- common_issues: top 10 issues that delay registration and how to avoid them
- irs_validation: how to handle IRS TIN validation issues (most common delay)
- timeline: realistic timeline with milestones
- annual_renewal: what's needed for annual renewal
- cage_code: CAGE code explanation and how it's assigned
- entity_types: how different entity types are handled
- tips: specific tips for their entity type

Respond with valid JSON.`,
    maxTokens: 6000,
  },

  policy_drafting: {
    system: `You are a grant compliance policy specialist. Generate complete, customized grant compliance policies for the organization.

Generate ALL of these policies, customized to their entity type, state, and size:
1. Conflict of Interest Policy
2. Whistleblower Policy
3. Document Retention & Destruction Policy
4. Drug-Free Workplace Policy
5. Procurement Policy (aligned to 2 CFR 200 for federal grants)
6. Code of Ethics
7. Travel & Expense Policy
8. Time & Effort Reporting Policy

For each policy:
- title: policy name
- purpose: why this policy is needed for grants
- full_text: complete policy text ready for board adoption (not a template — actual policy language)
- board_resolution: resolution text for board to adopt this policy
- annual_requirements: what needs to happen annually (signing, review, etc.)
- required_by: which grants/funders require this

Also include:
- signing_form_template: annual disclosure/signing form
- implementation_guide: how to roll out all 8 policies
- compliance_calendar: annual policy maintenance schedule

Respond with valid JSON: { "policies": [...], "signing_form_template": "...", "implementation_guide": "...", "compliance_calendar": [...] }`,
    maxTokens: 16000,
  },

  application_review: {
    system: `You are a senior grant reviewer evaluating a completed grant application. Provide a comprehensive review.

Score and assess:
- overall_score: 0-100 competitiveness rating
- compliance_check: list of compliance requirements met/missed
- narrative_assessment: strength of the narrative (compelling? clear? aligned with funder?)
- budget_review: budget strengths and weaknesses
- technical_merit: quality of methodology, logic model, evaluation plan
- competitive_positioning: how this compares to typical winning applications
- top_strengths: 3-5 things done well
- top_weaknesses: 3-5 things that need improvement (with specific fix suggestions)
- missing_elements: anything required but not included
- funder_alignment: how well it matches the funder's stated priorities
- recommendation: submit as-is / revise and submit / significant revision needed / do not submit
- revision_priority: ordered list of what to fix first

Respond with valid JSON.`,
    maxTokens: 6000,
  },

  logic_model: {
    system: `You are a program evaluation specialist. Build a complete logic model and theory of change for the organization's project/program.

Generate:
- theory_of_change: 2-3 paragraph narrative explaining how the program creates change
- logic_model:
  - inputs: resources needed (staff, funding, partnerships, facilities)
  - activities: what the program does (services, events, training, outreach)
  - outputs: direct products of activities (# served, sessions held, materials produced)
  - short_term_outcomes: changes in 0-12 months (knowledge, skills, attitudes)
  - medium_term_outcomes: changes in 1-3 years (behaviors, practices, conditions)
  - long_term_impact: ultimate change in 3-5+ years (community-level change)
  - assumptions: what must be true for this model to work
  - external_factors: what could affect outcomes outside your control
- smart_objectives: 5-7 SMART objectives (Specific, Measurable, Achievable, Relevant, Time-bound)
- kpi_framework: key performance indicators with targets and measurement methods
- evaluation_plan: how you'll measure and report on outcomes
- data_collection: what data to collect, how, and when

Respond with valid JSON.`,
    maxTokens: 8000,
  },

  audit_prep: {
    system: `You are a grant compliance auditor preparing an organization for a funder site visit or pre-award review.

Generate a complete audit preparation package:
- readiness_score: 0-100 based on their current state
- document_checklist: every document a funder might request, with status assessment
- mock_questions: 20 questions a funder would ask during a site visit, with suggested answers
- gap_analysis: gaps between what they have and what they need
- 30_day_plan: day-by-day action plan to get audit-ready
- red_flags: anything that would concern a funder
- strengths: what they have going for them
- room_setup: how to prepare the physical/virtual meeting space
- who_should_attend: recommended attendees and their roles
- follow_up_protocol: what to do after the visit

Respond with valid JSON.`,
    maxTokens: 8000,
  },
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();
    const { data: membership } = await db
      .from("org_members").select("org_id").eq("user_id", user.id).eq("status", "active").limit(1).single();
    if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

    const orgId = membership.org_id;
    const { service_type, additional_input } = await req.json();

    if (!service_type || !SERVICE_PROMPTS[service_type]) {
      return NextResponse.json({ error: `Invalid service_type. Valid: ${Object.keys(SERVICE_PROMPTS).join(", ")}` }, { status: 400 });
    }

    // Check cache
    const { data: cached } = await db
      .from("service_orders")
      .select("id, report_data")
      .eq("org_id", orgId)
      .eq("service_type", service_type)
      .eq("status", "completed")
      .gte("completed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (cached?.report_data) {
      return NextResponse.json({ success: true, order_id: cached.id, report: cached.report_data, cached: true });
    }

    // Fetch org data
    const [orgRes, profRes, capRes] = await Promise.all([
      db.from("organizations").select("*").eq("id", orgId).single(),
      db.from("org_profiles").select("*").eq("org_id", orgId).single(),
      db.from("org_capabilities").select("*").eq("org_id", orgId).single(),
    ]);

    const orgData: Record<string, unknown> = {
      ...(orgRes.data ?? {}), ...(profRes.data ?? {}), ...(capRes.data ?? {}),
    };
    delete orgData.id; delete orgData.org_id; delete orgData.created_at;
    delete orgData.updated_at; delete orgData.stripe_customer_id;

    // Create order
    const { data: order, error: orderError } = await db
      .from("service_orders")
      .insert({ org_id: orgId, user_id: user.id, service_type, status: "generating" })
      .select("id").single();

    if (orderError || !order) {
      return NextResponse.json({ error: `Failed to create order: ${orderError?.message}` }, { status: 500 });
    }

    // Build prompt
    const config = SERVICE_PROMPTS[service_type];
    const userInput = additional_input
      ? `Organization Data:\n${JSON.stringify(orgData, null, 2)}\n\nAdditional Input:\n${additional_input}`
      : `Organization Data:\n${JSON.stringify(orgData, null, 2)}`;

    // Call OpenAI
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: service_type === "policy_drafting" || service_type === "nonprofit_formation" ? MODELS.STRATEGY : MODELS.SCORING,
      max_tokens: config.maxTokens,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: config.system },
        { role: "user", content: userInput },
      ],
    });

    const reportData = JSON.parse(response.choices[0]?.message?.content ?? "{}");

    // Save
    await db.from("service_orders").update({
      status: "completed",
      report_data: reportData,
      completed_at: new Date().toISOString(),
    }).eq("id", order.id);

    logger.info("Service generated", { service_type, orderId: order.id });

    return NextResponse.json({ success: true, order_id: order.id, report: reportData });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Service generation failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
