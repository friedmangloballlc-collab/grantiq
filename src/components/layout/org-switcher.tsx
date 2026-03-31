"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useOrg, type OrgOption } from "@/hooks/use-org";
import { ChevronDown, Check, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgSwitcherProps {
  orgs: OrgOption[];
}

export function OrgSwitcher({ orgs }: OrgSwitcherProps) {
  const { orgId: currentOrgId, orgName: currentOrgName } = useOrg();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const router = useRouter();

  // Only render if this user belongs to 2+ orgs
  if (orgs.length < 2) {
    return (
      <span className="text-sm font-semibold truncate max-w-[200px]">
        {currentOrgName}
      </span>
    );
  }

  async function handleSelect(orgId: string) {
    if (orgId === currentOrgId) {
      setOpen(false);
      return;
    }

    setSwitchingId(orgId);
    setOpen(false);

    try {
      const res = await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-semibold transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          open && "bg-accent text-accent-foreground"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {isPending || switchingId ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="truncate max-w-[160px]">{currentOrgName}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] max-w-[320px] rounded-xl border border-border bg-background shadow-lg py-1">
            <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Switch Organization
            </p>

            <ul role="listbox">
              {orgs.map((org) => {
                const isActive = org.orgId === currentOrgId;
                return (
                  <li key={org.orgId} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onClick={() => handleSelect(org.orgId)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left",
                        isActive
                          ? "bg-[var(--color-brand-teal)]/10 text-[var(--color-brand-teal)]"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <div className="h-6 w-6 rounded-full bg-[var(--color-brand-teal)]/10 flex items-center justify-center text-[var(--color-brand-teal)] text-xs font-semibold shrink-0">
                        {org.orgName.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate flex-1">{org.orgName}</span>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-border mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/clients");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                Manage clients
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
