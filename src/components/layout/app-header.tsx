"use client";

import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useOrg } from "@/hooks/use-org";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { orgName, userId } = useOrg();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

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

      {/* Right: notifications + theme toggle + logout */}
      <div className="flex items-center gap-1">
        <NotificationBell userId={userId} />
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleLogout}
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
