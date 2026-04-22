import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = checkRateLimit(`signup:${ip}`, 5, 60000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { email, password, orgName, termsAccepted, referralCode } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (!termsAccepted) {
    return NextResponse.json(
      { error: "You must accept the Terms of Service and Privacy Policy to create an account." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 1. Create auth user (admin client bypasses any restrictions)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    // Auto-confirm so users can sign in immediately after signup.
    // Set to false if you want email verification first (requires verified Resend domain).
    email_confirm: true,
  });

  if (authError || !authData.user) {
    logger.error("Signup auth error", { message: authError?.message });
    return NextResponse.json(
      { error: "Failed to create account" },
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
    logger.error("Signup org creation error", { message: orgError?.message });
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }

  // 3. Create org membership (owner) — admin client bypasses RLS
  //
  // Record terms acceptance with the exact version hash + IP + UA.
  // These four fields are what we produce if a customer later
  // disputes that they agreed to the current Terms. Under clickwrap
  // case law this is the evidence that wins: "Here is the version
  // they accepted, the timestamp, their IP at the moment of
  // acceptance, and their browser string."
  const { CURRENT_TERMS_VERSION } = await import("@/lib/legal/terms-version");
  const acceptIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const acceptUa = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  const acceptedAt = new Date().toISOString();

  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
    status: "active",
    joined_at: acceptedAt,
    terms_accepted_at: acceptedAt,
    terms_version: CURRENT_TERMS_VERSION,
    terms_accepted_ip: acceptIp,
    terms_accepted_user_agent: acceptUa,
  });

  // Append a row to terms_acceptance_log for auditability. The
  // insert below duplicates the info on org_members but gives us
  // an append-only history once we start requiring re-acceptance
  // on material Terms updates. Fail-soft: if the log insert fails,
  // signup still succeeds (the org_members row is the primary
  // record).
  await supabase.from("terms_acceptance_log").insert({
    user_id: userId,
    terms_version: CURRENT_TERMS_VERSION,
    accepted_at: acceptedAt,
    accepted_ip: acceptIp,
    accepted_user_agent: acceptUa,
    source: "signup",
  });

  if (memberError) {
    logger.error("Signup membership creation error", { message: memberError.message });
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }

  // 4. Create default subscription (free) with 7-day trial of Strategist (pro) features
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const { error: subError } = await supabase.from("subscriptions").insert({
    org_id: org.id,
    user_id: userId,
    tier: "free",
    status: "active",
    trial_ends_at: trialEndsAt.toISOString(),
  });

  if (subError) {
    logger.error("Failed to create subscription", { message: subError.message });
  }

  // 5. Create org_capabilities + org_profiles
  await supabase.from("org_capabilities").insert({ org_id: org.id });
  await supabase.from("org_profiles").insert({ org_id: org.id });

  // 6. Enqueue welcome email (day-0 post-signup sequence)
  // The sequence runner handles dedup, so this is safe to fire and forget.
  await supabase.from("job_queue").insert({
    job_type: "send_sequence_emails",
    payload: { trigger: "signup", user_id: userId },
    status: "pending",
    priority: 8,
    max_attempts: 3,
    scheduled_for: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) logger.error("[signup] Failed to enqueue sequence email job", { message: error.message });
  });

  // 7. Mark lead as converted (if they came through /check)
  await supabase
    .from("leads")
    .update({ converted: true, converted_user_id: userId })
    .eq("email", email)
    .then(({ error }) => {
      if (error) logger.error("[signup] Failed to mark lead converted", { message: error.message });
    });

  // 8. Track referral if code provided
  if (referralCode) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/referrals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referral_code: referralCode, referred_email: email, referred_user_id: userId }),
    }).catch((err) => logger.error("[signup] Referral tracking failed", { error: String(err) }));
  }

  return NextResponse.json({ success: true, userId, orgId: org.id });
}
