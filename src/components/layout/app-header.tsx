"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useOrg } from "@/hooks/use-org";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { orgName, userId } = useOrg();

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background shrink-0">
      {/* Left: mobile menu + org name */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold truncate max-w-[200px]">
          {orgName}
        </span>
      </div>

      {/* Right: notifications + theme toggle */}
      <div className="flex items-center gap-1">
        <NotificationBell userId={userId} />
        <ThemeToggle />
      </div>
    </header>
  );
}
