"use client";

import { useState } from "react";
import { OrgProvider, type OrgContext } from "@/hooks/use-org";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { MobileNav } from "./mobile-nav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AppSidebar as MobileSidebar } from "./app-sidebar";
import { GrantieButton } from "@/components/grantie/grantie-button";

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

        {/* Mobile sidebar via Sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <MobileSidebar userPhase={userPhase} />
          </SheetContent>
        </Sheet>

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
