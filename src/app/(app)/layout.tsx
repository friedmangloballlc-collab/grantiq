import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrgContext } from "@/hooks/use-org";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();

  // Not authenticated
  if (!ctx) {
    redirect("/login");
  }

  // No org yet — redirect to onboarding
  if (!ctx.orgId) {
    redirect("/onboarding");
  }

  const admin = createAdminClient();

  // Fetch all org memberships + phase counts in parallel
  const [membershipsResult, pipelineCountResult, vaultCountResult] =
    await Promise.all([
      // Org switcher list
      admin
        .from("org_members")
        .select("org_id, organizations(id, name)")
        .eq("user_id", ctx.userId)
        .eq("status", "active"),

      // Pipeline count for progressive sidebar reveal
      admin
        .from("grant_pipeline")
        .select("*", { count: "exact", head: true })
        .eq("org_id", ctx.orgId)
        .not("stage", "in", '("awarded","declined")'),

      // Vault doc count for progressive sidebar reveal
      admin
        .from("document_vault")
        .select("*", { count: "exact", head: true })
        .eq("org_id", ctx.orgId)
        .eq("status", "active"),
    ]);

  const allOrgs = (membershipsResult.data ?? []).map((m) => ({
    orgId: m.org_id,
    orgName: (m.organizations as { id: string; name: string } | null)?.name ?? "Unknown Org",
  }));

  const orgContext: OrgContext = {
    orgId: ctx.orgId,
    orgName: ctx.orgName,
    role: ctx.role as OrgContext["role"],
    tier: ctx.tier as OrgContext["tier"],
    userId: ctx.userId,
    allOrgs,
  };

  return (
    <AppShell
      orgContext={orgContext}
      pipelineCount={pipelineCountResult.count ?? 0}
      vaultDocCount={vaultCountResult.count ?? 0}
    >
      {children}
    </AppShell>
  );
}
