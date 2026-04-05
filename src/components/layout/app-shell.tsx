"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { OrgProvider, type OrgContext } from "@/hooks/use-org";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { MobileNav } from "./mobile-nav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NAV_ITEMS } from "./app-sidebar";
import { GrantieButton } from "@/components/grantie/grantie-button";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  orgContext: OrgContext;
  pipelineCount?: number;
  vaultDocCount?: number;
}

function computeUserPhase(pipelineCount: number, vaultDocCount: number): 1 | 2 | 3 {
  if (pipelineCount >= 3 && vaultDocCount > 0) return 3;
  if (pipelineCount > 0) return 2;
  return 1;
}

function MobileNavSheet({
  open,
  onClose,
  userPhase,
}: {
  open: boolean;
  onClose: () => void;
  userPhase: 1 | 2 | 3;
}) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => item.minPhase <= userPhase);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Image
              src="/grantaq-icon.svg"
              alt="GrantAQ"
              width={22}
              height={22}
              className="h-5 w-5"
            />
            <SheetTitle className="text-base font-bold tracking-tight">
              GrantAQ
            </SheetTitle>
          </div>
        </SheetHeader>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
          aria-label="Mobile navigation"
        >
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  "focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:outline-none",
                  isActive
                    ? "bg-[var(--color-brand-teal)] text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground px-2">GrantAQ &copy; 2026</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppShell({
  children,
  orgContext,
  pipelineCount = 0,
  vaultDocCount = 0,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const userPhase = computeUserPhase(pipelineCount, vaultDocCount);

  return (
    <OrgProvider value={orgContext}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <AppSidebar userPhase={userPhase} />

        {/* Mobile nav sheet — shows ALL phase-visible nav items */}
        <MobileNavSheet
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          userPhase={userPhase}
        />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AppHeader onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <MobileNav onMoreClick={() => setMobileOpen(true)} />

        <GrantieButton />
      </div>
    </OrgProvider>
  );
}
