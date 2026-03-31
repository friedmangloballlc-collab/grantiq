import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { AddClientForm } from "@/components/clients/add-client-form";
import { Lock, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AddClientPage() {
  const ctx = await getOrgContext();

  if (!ctx) redirect("/login");

  // Gate: Enterprise only
  if (ctx.tier !== "enterprise") {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border bg-muted/30">
          <Lock className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Enterprise Required</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Adding client organizations requires an Enterprise plan.
          </p>
          <Button
            className="bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/90 text-white"
            render={<Link href="/upgrade">Upgrade to Enterprise</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6 text-[var(--color-brand-teal)]" />
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Add Client</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a new client organization and link it to your consultant account.
          </p>
        </div>
      </div>

      <AddClientForm />
    </div>
  );
}
