import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { email, password, orgName } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Create auth user (admin client bypasses any restrictions)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm so they can sign in immediately
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Signup failed" },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  // 2. Create organization (admin client bypasses RLS)
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName || "My Organization", entity_type: "other" })
    .select("id")
    .single();

  if (orgError || !org) {
    return NextResponse.json(
      { error: "Failed to create organization: " + (orgError?.message ?? "unknown") },
      { status: 500 }
    );
  }

  // 3. Create org membership (owner) — admin client bypasses RLS
  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    return NextResponse.json(
      { error: "Failed to create membership: " + memberError.message },
      { status: 500 }
    );
  }

  // 4. Create default subscription (free)
  const { error: subError } = await supabase.from("subscriptions").insert({
    org_id: org.id,
    user_id: userId,
    tier: "free",
    status: "active",
  });

  if (subError) {
    console.error("Failed to create subscription:", subError.message);
  }

  // 5. Create org_capabilities + org_profiles
  await supabase.from("org_capabilities").insert({ org_id: org.id });
  await supabase.from("org_profiles").insert({ org_id: org.id });

  return NextResponse.json({ success: true, userId, orgId: org.id });
}
