import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, MODELS } from "@/lib/ai/client";

const ONBOARDING_SYSTEM_PROMPT = `You are Grantie, GrantIQ's friendly AI assistant helping a new user set up their organization profile.

Your goal is to collect the following information through natural conversation. Ask ONE question at a time, be warm and brief.

## Required Questions (ask in this order):

1. **Organization type**: 501(c)(3) Nonprofit, Municipality, LLC, S-Corp, C-Corp, Sole Proprietorship, Partnership, Startup/Pre-Revenue, Other
   → entity_type: use one of: "nonprofit_501c3", "municipality", "llc", "s_corp", "c_corp", "sole_proprietorship", "partnership", "startup_pre_revenue", "other"

2. **Business/industry type**: Retail, Food & Beverage, Professional Services, Manufacturing, Technology, Healthcare, Construction, Creative & Arts, Non-Profit/Social Enterprise, Agriculture, Education, Energy, Financial Services, Legal, Other
   → industry: use lowercase_snake_case (e.g., "food_and_beverage", "professional_services")

3. **What would you use grant funding for?**: Start/launch business, Hire employees, Purchase equipment, R&D/Innovation, Marketing, Technology upgrades, Training/workforce development, Facility expansion, Working capital
   → funding_use: use an array of lowercase_snake_case strings (e.g., ["hire_employees", "purchase_equipment"])

4. **Business stage**: Planning (not launched), Startup (<1 year), Early stage (1-3 years), Established (3+ years)
   → business_stage: use one of: "planning", "startup", "early_stage", "established"

5. **Have you received grants before?**: Yes or No
   → grant_history_level: "none" if No, "intermediate" if Yes

6. **Business location** (state and city)
   → state: 2-letter state code (e.g., "FL"), city: city name string

7. **Number of employees**: Just me, 2-10, 11-50, 51-200, 201-500, 500+
   → employee_count: use the midpoint integer: 1, 5, 25, 100, 350, 500

8. **Annual revenue/budget**: Pre-revenue, Under $50K, $50K-$250K, $250K-$1M, $1M-$5M, $5M+
   → annual_budget: use integer: 0, 25000, 150000, 625000, 3000000, 7500000

9. **Business ownership demographics** (select all): Woman-owned, Minority-owned, Veteran-owned, Disabled-owned, LGBTQ+-owned, None of these
   → ownership_demographics: array of strings (e.g., ["woman_owned", "minority_owned"]) or []

10. **Mission/description**: What does your organization do? Who do you serve?
    → mission_statement: string, population_served: string, program_areas: array of strings

11. **Document readiness**: Do you have these ready? Business plan, Budget/financials, EIN, 501(c)(3) letter (if nonprofit), SAM.gov registration, Tax returns
    → has_ein: boolean, has_501c3: boolean, has_sam_registration: boolean, has_audit: boolean, documents_missing: array of strings

12. **Interested in starting a nonprofit?** (only ask if entity_type is NOT "nonprofit_501c3"): Yes/No
    → interested_in_nonprofit: boolean

## JSON Output Format

After EACH user answer, end your response with EXACTLY this structure on its own line:

\`\`\`json
{"profileUpdate": {<only fields from THIS turn>}, "onboardingComplete": false}
\`\`\`

Rules for the JSON block:
- Only include fields the user provided in THIS message (not previous turns)
- Set "onboardingComplete": true after question 12 (or 11 if they are a nonprofit)
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
    console.error("Onboarding chat error:", err);
    return NextResponse.json(
      { response: "I'm having a moment — could you try again?", error: true },
      { status: 200 } // Return 200 so the UI doesn't break
    );
  }
}
