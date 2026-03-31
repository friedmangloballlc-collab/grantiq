"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Kanban, BookOpen, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  onMoreClick: () => void;
}

const MOBILE_TABS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/matches", label: "Matches", icon: Search },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/library", label: "Library", icon: BookOpen },
];

export function MobileNav({ onMoreClick }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background"
      aria-label="Mobile navigation"
    >
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] px-3 rounded-md text-xs font-medium transition-colors",
              isActive
                ? "text-[var(--color-brand-teal)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className="h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <span>{label}</span>
          </Link>
        );
      })}

      {/* More button — opens sidebar sheet */}
      <button
        type="button"
        onClick={onMoreClick}
        className="flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] px-3 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
