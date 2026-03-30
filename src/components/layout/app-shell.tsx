"use client";

import { useState } from "react";
import { OrgProvider, type OrgContext } from "@/hooks/use-org";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AppSidebar as MobileSidebar } from "./app-sidebar";
import { GrantieButton } from "@/components/grantie/grantie-button";

interface AppShellProps {
  children: React.ReactNode;
  orgContext: OrgContext;
}

export function AppShell({ children, orgContext }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <OrgProvider value={orgContext}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <AppSidebar />

        {/* Mobile sidebar via Sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <MobileSidebar />
          </SheetContent>
        </Sheet>

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AppHeader onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>

        <GrantieButton />
      </div>
    </OrgProvider>
  );
}
