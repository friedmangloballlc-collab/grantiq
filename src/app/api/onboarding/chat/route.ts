import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, MODELS } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const ONBOARDING_SYSTEM_PROMPT = `You are Grantie, GrantAQ's friendly AI assistant helping a new user set up their organization profile.

Your goal is to collect the following information through natural conversation. Ask ONE question at a time, be warm and brief.

## Required Questions (ask in this order):

1. **Organization type**: 501(c)(3) Nonprofit, Municipality, LLC, S-Corp, C-Corp, Sole Proprietorship, Partnership, Startup/Pre-Revenue, Other
   → entity_type: use one of: "nonprofit_501c3", "municipality", "llc", "s_corp", "c_corp", "sole_proprietorship", "partnership", "startup_pre_revenue", "other"

2. **Business/industry type**: Retail, Food & Beverage, Professional Services, Manufacturing, Technology, Healthcare, Construction, Creative & Arts, Non-Profit/Social Enterprise, Agriculture, Education, Energy, Financial Services, Legal, Other
   → industry: use lowercase_snake_case (e.g., "food_and_beverage", "professional_services")

3. **NAICS code**: Ask for their 6-digit NAICS code. Explain it's the industry code the federal government uses — most federal grants filter by it. If they don't know, offer to help them find it based on their industry answer.
   → naics_primary: 6-digit string (e.g., "541511"). Allow skip.

4. **What would you use grant funding for?**: Start/launch business, Hire employees, Purchase equipment, R&D/Innovation, Marketing, Technology upgrades, Training/workforce development, Facility expansion, Working capital
   → funding_use: use an array of lowercase_snake_case strings (e.g., ["hire_employees", "purchase_equipment"])

5. **How much funding are you looking for?**: Under $25K, $25K-$100K, $100K-$500K, $500K-$1M, $1M-$5M, $5M+, Not sure yet
   → funding_amount_min: integer (or null if "Not sure"), funding_amount_max: integer (or null if open-ended/$5M+ or "Not sure")
   Mappings: "Under $25K" → min:0, max:25000; "$25K-$100K" → min:25000, max:100000; "$100K-$500K" → min:100000, max:500000; "$500K-$1M" → min:500000, max:1000000; "$1M-$5M" → min:1000000, max:5000000; "$5M+" → min:5000000, max:null; "Not sure" → min:null, max:null

6. **Federal certifications** (select all that apply): SBA 8(a), WOSB, VOSB, SDVOSB, HUBZone, MBE, None of these, Interested but not yet certified
   → federal_certifications: JSON array of strings (e.g., ["sba_8a", "wosb"]) or [] if none. Use values: "sba_8a", "wosb", "vosb", "sdvosb", "hubzone", "mbe", "none", "interested"

7. **SAM.gov registration status**: Registered with active UEI, In progress, Not yet but planning to, Not applicable
   → sam_registration_status: one of "registered", "in_progress", "not_started", "not_applicable"

8. **Matching funds capacity**: None, Up to 10%, Up to 25%, Up to 50%, More than 50%, Not sure yet
   → match_funds_capacity: one of "none", "up_to_10", "up_to_25", "up_to_50", "over_50", "unsure"

9. **Business stage**: Planning (not launched), Startup (<1 year), Early stage (1-3 years), Established (3+ years)
   → business_stage: use one of: "planning", "startup", "early_stage", "established"

10. **Have you received grants before?**: Yes or No
    → grant_history_level: "none" if No, "intermediate" if Yes

11. **Business location** (state and city)
    → state: 2-letter state code (e.g., "FL"), city: city name string

12. **Number of employees**: Just me, 2-10, 11-50, 51-200, 201-500, 500+
    → employee_count: use the midpoint integer: 1, 5, 25, 100, 350, 500

13. **Annual revenue/budget**: Pre-revenue, Under $50K, $50K-$250K, $250K-$1M, $1M-$5M, $5M+
    → annual_budget: use integer: 0, 25000, 150000, 625000, 3000000, 7500000

14. **Business ownership demographics** (select all): Woman-owned, Minority-owned, Veteran-owned, Disabled-owned, LGBTQ+-owned, None of these
    → ownership_demographics: array of strings (e.g., ["woman_owned", "minority_owned"]) or []

15. **Mission/description**: What does your organization do? Who do you serve?
    → mission_statement: string, population_served: string, program_areas: array of strings

16. **Document readiness**: Do you have these ready? Business plan, Budget/financials, EIN, 501(c)(3) letter (if nonprofit), SAM.gov registration, Tax returns
    → has_ein: boolean, has_501c3: boolean, has_sam_registration: boolean, has_audit: boolean, documents_missing: array of strings

17. **Interested in starting a nonprofit?** (only ask if entity_type is NOT "nonprofit_501c3"): Yes/No
    → interested_in_nonprofit: boolean

## JSON Output Format

After EACH user answer, end your response with EXACTLY this structure on its own line:

\`\`\`json
{"profileUpdate": {<only fields from THIS turn>}, "onboardingComplete": false}
\`\`\`

Rules for the JSON block:
- Only include fields the user provided in THIS message (not previous turns)
- Set "onboardingComplete": true after question 17 (or 16 if they are a nonprofit)
- Use the exact field names and value formats specified above
- The JSON block MUST be the last thing in your response
- Your conversational text MUST come before the JSON block
- The JSON must be valid — escape any special characters

When onboardingComplete is true, congratulate them and say: "Head to your dashboard to see your grant matches!"

## Conversation Rules
- Keep responses to 1-2 sentences plus the next question
- Be conversational, encouraging, and warm
- If they give short answers, acknowledge and move on
- If they answer multiple questions at once, save all provided fields and skip to the next unanswered question
- Do not repeat questions they have already answered`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed: rateLimitAllowed } = checkRateLimit(`onboarding-chat:${user.id}`, 20, 60000);
    if (!rateLimitAllowed) {
      return NextResponse.json({ response: "Too many requests. Please slow down.", error: true }, { status: 429 });
    }

    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const client = getAnthropicClient();

    // Build conversation history for Claude
    const messages = (history ?? [])
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Add current message
    messages.push({ role: "user" as const, content: message });

    const response = await client.messages.create({
      model: MODELS.SCORING,
      max_tokens: 1024,
      temperature: 0.4,
      system: ONBOARDING_SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find(
      (block) => block.type === "text"
    );
    const responseText = (textBlock && "text" in textBlock ? textBlock.text : null) ?? "I'm sorry, could you repeat that?";

    // Extract profile update JSON if present
    let profileUpdate = null;
    let completedFields = 0;
    let onboardingComplete = false;

    // Match JSON in code fences or bare JSON with profileUpdate
    const fencedMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonMatch = fencedMatch ? [fencedMatch[1]] : responseText.match(/(\{[^{}]*"profileUpdate"[^{}]*\{[^{}]*\}[^{}]*\})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        profileUpdate = parsed.profileUpdate;
        completedFields = parsed.completedFields ?? 0;
        onboardingComplete = parsed.onboardingComplete ?? false;

        // Save profile updates to Supabase
        if (profileUpdate) {
          const db = createAdminClient();
          const { data: membership } = await db
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .eq("status", "active")
            .limit(1)
            .single();

          if (membership) {
            // Update organization
            const orgFields: Record<string, unknown> = {};
            if (profileUpdate.entity_type) orgFields.entity_type = profileUpdate.entity_type;
            if (profileUpdate.state) orgFields.state = profileUpdate.state;
            if (profileUpdate.city) orgFields.city = profileUpdate.city;
            if (profileUpdate.mission_statement) orgFields.mission_statement = profileUpdate.mission_statement;
            if (profileUpdate.annual_budget) orgFields.annual_budget = profileUpdate.annual_budget;
            if (profileUpdate.employee_count) orgFields.employee_count = profileUpdate.employee_count;

            if (Object.keys(orgFields).length > 0) {
              await db.from("organizations").update(orgFields).eq("id", membership.org_id);
            }

            // Update org_profiles
            const profileFields: Record<string, unknown> = {};
            if (profileUpdate.population_served) profileFields.population_served = profileUpdate.population_served;
            if (profileUpdate.program_areas) profileFields.program_areas = profileUpdate.program_areas;
            if (profileUpdate.grant_history_level) profileFields.grant_history_level = profileUpdate.grant_history_level;
            if (profileUpdate.naics_primary) profileFields.naics_primary = profileUpdate.naics_primary;
            if (profileUpdate.funding_amount_min !== undefined) profileFields.funding_amount_min = profileUpdate.funding_amount_min;
            if (profileUpdate.funding_amount_max !== undefined) profileFields.funding_amount_max = profileUpdate.funding_amount_max;
            if (profileUpdate.federal_certifications) profileFields.federal_certifications = profileUpdate.federal_certifications;
            if (profileUpdate.sam_registration_status) profileFields.sam_registration_status = profileUpdate.sam_registration_status;
            if (profileUpdate.match_funds_capacity) profileFields.match_funds_capacity = profileUpdate.match_funds_capacity;

            if (Object.keys(profileFields).length > 0) {
              await db.from("org_profiles").update(profileFields).eq("org_id", membership.org_id);
            }
          }
        }
      } catch {
        // JSON parsing failed — no profile update
      }
    }

    // Clean the response text — remove JSON blocks for display
    const cleanResponse = responseText
      .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, "")
      .replace(/\{[^{}]*"profileUpdate"[^{}]*\{[^{}]*\}[^{}]*\}/g, "")
      .replace(/,\s*"completedFields":\s*\d+\s*\}/g, "")
      .trim();

    return NextResponse.json({
      response: cleanResponse || responseText,
      profileUpdate,
      completedFields,
      onboardingComplete,
    });
  } catch (err) {
    logger.error("Onboarding chat error", { err: String(err) });
    return NextResponse.json(
      { response: "I'm having a moment — could you try again?", error: true },
      { status: 200 } // Return 200 so the UI doesn't break
    );
  }
}
