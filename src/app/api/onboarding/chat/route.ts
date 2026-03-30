import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, MODELS } from "@/lib/ai/client";

const ONBOARDING_SYSTEM_PROMPT = `You are Grantie, GrantIQ's friendly AI assistant helping a new user set up their organization profile.

Your goal is to collect the following information through natural conversation:
1. Organization type (nonprofit 501c3, nonprofit other, LLC, corporation, sole prop, etc.)
2. Organization name (confirm what they entered at signup)
3. Mission statement (what they do, who they serve)
4. State and city
5. Annual budget (approximate)
6. Number of employees/staff
7. What populations they serve
8. Their program areas / focus areas
9. Grant experience level (none, beginner, intermediate, experienced)
10. Whether they have: 501c3 status, SAM.gov registration, recent audit

Ask ONE question at a time. Be warm, encouraging, and brief. After each answer, acknowledge it and ask the next question.

When you have enough info to update their profile, put a JSON block on its OWN LINE at the very END of your response, wrapped in triple backticks like:

\`\`\`json
{"profileUpdate": {"entity_type": "nonprofit_501c3"}, "completedFields": 1}
\`\`\`

Only include fields the user has actually provided. The completedFields count should reflect total fields collected so far across the whole conversation.

After collecting all key info (at least 6 fields), congratulate them and add "onboardingComplete": true to the JSON.

IMPORTANT: Your conversational text MUST come BEFORE the JSON block. Never mix JSON into your sentences.

Keep responses under 3 sentences. Be conversational, not formal.`;

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
