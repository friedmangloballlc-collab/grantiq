"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Kanban,
  CalendarDays,
  Map,
  Settings,
  Sparkles,
  PenLine,
  BookOpen,
  FolderLock,
  Building2,
  BarChart3,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matches", label: "Grant Matches", icon: Search },
  { href: "/library", label: "Grant Library", icon: BookOpen },
  { href: "/funders", label: "Funders", icon: Building2 },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/writing", label: "Writing", icon: PenLine },
  { href: "/vault", label: "Documents", icon: FolderLock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { tier } = useOrg();
  const isEnterprise = tier === "enterprise";

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-background shrink-0 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Sparkles className="h-5 w-5 text-[var(--color-brand-teal)]" />
        <span className="text-lg font-bold tracking-tight">GrantIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--color-brand-teal)] text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Clients — Enterprise only */}
        {isEnterprise && (
          <>
            <div className="pt-2 pb-1">
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Consultant
              </p>
            </div>
            <Link
              href="/clients"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                (pathname === "/clients" || pathname.startsWith("/clients/"))
                  ? "bg-[var(--color-brand-teal)] text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Users className="h-4 w-4 shrink-0" />
              Clients
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">GrantIQ &copy; 2026</p>
      </div>
    </aside>
  );
}
