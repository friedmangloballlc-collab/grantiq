"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Kanban,
  Map,
  Settings,
  Sparkles,
  PenLine,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matches", label: "Grant Matches", icon: Search },
  { href: "/library", label: "Grant Library", icon: BookOpen },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/writing", label: "Writing", icon: PenLine },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-background shrink-0 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Sparkles className="h-5 w-5 text-[var(--color-brand-teal)]" />
        <span className="text-lg font-bold tracking-tight">GrantIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">GrantIQ &copy; 2026</p>
      </div>
    </aside>
  );
}
