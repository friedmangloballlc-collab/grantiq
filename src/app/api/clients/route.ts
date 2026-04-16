import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// GET /api/clients — list all orgs where the caller is owner or admin
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify the caller has an enterprise subscription on at least one org
    const { data: memberships } = await admin
      .from("org_members")
      .select("org_id, role, organizations(id, name, entity_type, state)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"]);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ clients: [] });
    }

    const orgIds = memberships.map((m) => m.org_id);

    // Enrich with pipeline counts and readiness scores
    const [subResult, pipelineResult, profileResult, readinessResult] = await Promise.all([
      admin
        .from("subscriptions")
        .select("org_id, tier")
        .in("org_id", orgIds),
      admin
        .from("grant_pipeline")
        .select("org_id")
        .in("org_id", orgIds)
        .not("stage", "in", '("awarded","declined")'),
      admin
        .from("org_profiles")
        .select("org_id, updated_at")
        .in("org_id", orgIds),
      admin
        .from("readiness_scores")
        .select("org_id, overall_score")
        .in("org_id", orgIds)
        .order("created_at", { ascending: false }),
    ]);

    const subMap = new Map<string, string>(
      (subResult.data ?? []).map((s) => [s.org_id, s.tier])
    );
    const pipelineCountMap = new Map<string, number>();
    for (const p of pipelineResult.data ?? []) {
      pipelineCountMap.set(p.org_id, (pipelineCountMap.get(p.org_id) ?? 0) + 1);
    }
    const lastActivityMap = new Map<string, string>(
      (profileResult.data ?? []).map((p) => [p.org_id, p.updated_at])
    );
    const readinessMap = new Map<string, number>();
    for (const r of readinessResult.data ?? []) {
      if (!readinessMap.has(r.org_id)) readinessMap.set(r.org_id, r.overall_score ?? 0);
    }

    const clients = memberships.map((m) => {
      const org = m.organizations as unknown as {
        id: string;
        name: string;
        entity_type?: string | null;
        state?: string | null;
      } | null;

      return {
        orgId: m.org_id,
        orgName: org?.name ?? "Unknown Org",
        entityType: org?.entity_type ?? null,
        state: org?.state ?? null,
        role: m.role,
        tier: subMap.get(m.org_id) ?? "free",
        activePipelineCount: pipelineCountMap.get(m.org_id) ?? 0,
        lastActivity: lastActivityMap.get(m.org_id) ?? null,
        readinessScore: readinessMap.get(m.org_id) ?? 0,
      };
    });

    return NextResponse.json({ clients });
  } catch (err) {
    logger.error("GET /api/clients error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/clients — create a new client org and link the consultant as admin
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orgName, entityType, state, contactEmail, inviteClient } = body as {
      orgName: string;
      entityType?: string;
      state?: string;
      contactEmail?: string;
      inviteClient?: boolean;
    };

    if (!orgName || typeof orgName !== "string" || orgName.trim() === "") {
      return NextResponse.json({ error: "orgName is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify caller holds enterprise tier on at least one org
    const { data: callerMembership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .limit(1)
      .single();

    if (!callerMembership) {
      return NextResponse.json({ error: "You must be an org owner or admin" }, { status: 403 });
    }

    const { data: sub } = await admin
      .from("subscriptions")
      .select("tier")
      .eq("org_id", callerMembership.org_id)
      .single();

    if (sub?.tier !== "enterprise") {
      return NextResponse.json(
        { error: "Consultant Edition requires an Enterprise subscription" },
        { status: 403 }
      );
    }

    // Create the new org
    const { data: newOrg, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: orgName.trim(),
        entity_type: entityType ?? null,
        state: state ?? null,
      })
      .select("id")
      .single();

    if (orgError || !newOrg) {
      return NextResponse.json({ error: orgError?.message ?? "Failed to create org" }, { status: 500 });
    }

    const newOrgId = newOrg.id;

    // Link consultant as admin of the new org, plus seed required tables
    await Promise.all([
      admin.from("org_members").insert({
        org_id: newOrgId,
        user_id: user.id,
        role: "admin",
        status: "active",
      }),
      admin.from("org_profiles").insert({
        org_id: newOrgId,
        contact_email: contactEmail ?? null,
      }),
      admin.from("org_capabilities").insert({
        org_id: newOrgId,
      }),
      admin.from("subscriptions").insert({
        org_id: newOrgId,
        tier: "free",
        status: "active",
      }),
    ]);

    // Invite the client contact as a viewer
    if (inviteClient && contactEmail) {
      // Send invite via Supabase Auth
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(contactEmail, {
        data: { invited_org_id: newOrgId, invited_by: user.id, role: "viewer" },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://grantaq.com"}/dashboard`,
      });

      if (inviteError) {
        // If Supabase invite fails (e.g., user already exists), send via Resend
        logger.warn("Supabase invite failed, sending via Resend", { error: inviteError.message });
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? "GrantAQ <noreply@grantaq.com>",
            to: contactEmail,
            subject: `You've been invited to GrantAQ by your grant consultant`,
            html: `<p>Your grant consultant has set up a GrantAQ workspace for <strong>${orgName}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://grantaq.com"}/signup?org=${newOrgId}">Click here to create your account and get started.</a></p>`,
          });
        } catch (emailErr) {
          logger.error("Client invite email failed", { error: String(emailErr) });
        }
      }

      await admin.from("user_events").insert({
        org_id: newOrgId,
        event_type: "client_invited",
        metadata: { email: contactEmail, invited_by: user.id },
      });
    }

    return NextResponse.json({ orgId: newOrgId }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/clients error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
