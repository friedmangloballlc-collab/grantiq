import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getOrgContext } from "@/lib/auth/get-org-context";
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

  const orgContext: OrgContext = {
    orgId: ctx.orgId,
    orgName: ctx.orgName,
    role: ctx.role as OrgContext["role"],
    tier: ctx.tier as OrgContext["tier"],
    userId: ctx.userId,
  };

  return <AppShell orgContext={orgContext}>{children}</AppShell>;
}
