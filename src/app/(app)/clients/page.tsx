import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { ClientsTable } from "@/components/clients/clients-table";
import { Button } from "@/components/ui/button";
import { Users, Plus, Lock } from "lucide-react";

export default async function ClientsPage() {
  const ctx = await getOrgContext();

  if (!ctx) redirect("/login");

  // Gate: Enterprise only
  if (ctx.tier !== "enterprise") {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Clients</h1>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border bg-muted/30">
          <Lock className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Consultant Edition</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Manage 5–50 client organizations from a single dashboard. Switch context instantly,
            track readiness scores, and run grant pipelines for each client.
          </p>
          <p className="text-xs text-muted-foreground mb-4">Requires Enterprise plan ($399/mo)</p>
          <Button
            className="bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/90 text-white"
            render={<Link href="/upgrade">Upgrade to Enterprise</Link>}
          />
        </div>
      </div>
    );
  }

  const admin = createAdminClient();

  // Fetch all orgs the consultant is owner/admin of
  const { data: memberships } = await admin
    .from("org_members")
    .select("org_id, role, organizations(id, name, entity_type, state)")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);

  const orgIds = (memberships ?? []).map((m) => m.org_id);

  const [pipelineResult, profileResult, subResult] = await Promise.all([
    orgIds.length > 0
      ? admin
          .from("grant_pipeline")
          .select("org_id")
          .in("org_id", orgIds)
          .not("stage", "in", '("awarded","declined")')
      : Promise.resolve({ data: [] }),

    orgIds.length > 0
      ? admin
          .from("org_profiles")
          .select("org_id, updated_at")
          .in("org_id", orgIds)
      : Promise.resolve({ data: [] }),

    orgIds.length > 0
      ? admin
          .from("subscriptions")
          .select("org_id, tier")
          .in("org_id", orgIds)
      : Promise.resolve({ data: [] }),
  ]);

  const pipelineCountMap = new Map<string, number>();
  for (const p of pipelineResult.data ?? []) {
    pipelineCountMap.set(p.org_id, (pipelineCountMap.get(p.org_id) ?? 0) + 1);
  }
  const lastActivityMap = new Map<string, string>(
    (profileResult.data ?? []).map((p) => [p.org_id, p.updated_at])
  );
  const subMap = new Map<string, string>(
    (subResult.data ?? []).map((s) => [s.org_id, s.tier])
  );

  const clients = (memberships ?? []).map((m) => {
    const orgData = m.organizations as unknown as {
      id: string;
      name: string;
      entity_type?: string | null;
      state?: string | null;
    }[] | { id: string; name: string; entity_type?: string | null; state?: string | null } | null;
    const org = Array.isArray(orgData) ? orgData[0] : orgData;

    return {
      orgId: m.org_id,
      orgName: org?.name ?? "Unknown Org",
      entityType: org?.entity_type ?? null,
      state: org?.state ?? null,
      role: m.role as string,
      tier: subMap.get(m.org_id) ?? "free",
      activePipelineCount: pipelineCountMap.get(m.org_id) ?? 0,
      lastActivity: lastActivityMap.get(m.org_id) ?? null,
    };
  });

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-[var(--color-brand-teal)]" />
          <div>
            <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Clients</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {clients.length} client organization{clients.length !== 1 ? "s" : ""} under management
            </p>
          </div>
        </div>

        <Button
          className="bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/90 text-white"
          render={
            <Link href="/clients/add" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Client
            </Link>
          }
        />
      </div>

      <ClientsTable clients={clients} currentOrgId={ctx.orgId} />
    </div>
  );
}
