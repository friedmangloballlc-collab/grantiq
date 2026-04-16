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
  PenLine,
  BookOpen,
  FolderLock,
  Building2,
  BarChart3,
  Users,
  ShieldCheck,
  ClipboardCheck,
  FileSearch,
  Shield,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";
import { ReadinessBadgeMini } from "@/components/shared/readiness-certification";
import type { CertCriteria } from "@/components/shared/readiness-certification";

// Date when phase-2 and phase-3 items were "released" for "New" badge logic.
// Items added after this date get a teal dot for 7 days.
const PHASE2_RELEASE = new Date("2026-03-29");
const PHASE3_RELEASE = new Date("2026-03-29");

function isNew(releaseDate: Date): boolean {
  const now = new Date();
  const diffMs = now.getTime() - releaseDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  minPhase: 1 | 2 | 3;
  releaseDate?: Date;
}

export const NAV_ITEMS: NavItem[] = [
  // Phase 1 — always visible
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minPhase: 1 },
  { href: "/matches", label: "Grant Matches", icon: Search, minPhase: 1 },
  { href: "/settings", label: "Settings", icon: Settings, minPhase: 1 },

  // Phase 2 — once user has pipeline items
  { href: "/pipeline", label: "Pipeline", icon: Kanban, minPhase: 2, releaseDate: PHASE2_RELEASE },
  { href: "/library", label: "Grant Library", icon: BookOpen, minPhase: 2, releaseDate: PHASE2_RELEASE },
  { href: "/writing", label: "Writing", icon: PenLine, minPhase: 2, releaseDate: PHASE2_RELEASE },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, minPhase: 2, releaseDate: PHASE2_RELEASE },

  // Phase 3 — power users with 3+ pipeline + docs uploaded
  { href: "/vault", label: "Documents", icon: FolderLock, minPhase: 3, releaseDate: PHASE3_RELEASE },
  { href: "/funders", label: "Funders", icon: Building2, minPhase: 3, releaseDate: PHASE3_RELEASE },
  { href: "/analytics", label: "Analytics", icon: BarChart3, minPhase: 3, releaseDate: PHASE3_RELEASE },
  { href: "/roadmap", label: "Roadmap", icon: Map, minPhase: 3, releaseDate: PHASE3_RELEASE },
];

interface AppSidebarProps {
  userPhase?: 1 | 2 | 3;
  certCriteria?: CertCriteria;
}

const ADMIN_EMAIL = "getreachmediallc@gmail.com";

export function AppSidebar({ userPhase = 1, certCriteria }: AppSidebarProps) {
  const pathname = usePathname();
  const { tier, email } = useOrg();
  const isEnterprise = tier === "enterprise";
  const isAdmin = email === ADMIN_EMAIL;

  // Enterprise always sees all items
  const effectivePhase: 1 | 2 | 3 = isEnterprise ? 3 : userPhase;

  const visibleItems = NAV_ITEMS.filter((item) => item.minPhase <= effectivePhase);

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-background shrink-0 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Image src="/grantaq-icon.svg" alt="GrantAQ" width={24} height={24} className="h-6 w-6" />
        <span className="text-lg font-bold tracking-tight">GrantAQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {visibleItems.map(({ href, label, icon: Icon, releaseDate }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const showNewBadge = releaseDate ? isNew(releaseDate) : false;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:outline-none",
                isActive
                  ? "bg-[var(--color-brand-teal)] text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {showNewBadge && !isActive && (
                <span
                  className="h-2 w-2 rounded-full bg-[var(--color-brand-teal)] shrink-0"
                  aria-label="New"
                />
              )}
            </Link>
          );
        })}

        {/* Services — always visible */}
        <div className="pt-2 pb-1">
          <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Services
          </p>
        </div>
        {[
          { href: "/services/eligibility-status", label: "Eligibility Status", icon: ClipboardCheck },
          { href: "/services/readiness-diagnostic", label: "Readiness Diagnostic", icon: FileSearch },
          { href: "/compliance", label: "Compliance Calendar", icon: Shield },
          { href: "/portfolio-tracker", label: "Grant Portfolio", icon: Wallet },
        ].map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:outline-none",
                isActive
                  ? "bg-[var(--color-brand-teal)] text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
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
              aria-current={
                pathname === "/clients" || pathname.startsWith("/clients/")
                  ? "page"
                  : undefined
              }
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:outline-none",
                pathname === "/clients" || pathname.startsWith("/clients/")
                  ? "bg-[var(--color-brand-teal)] text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
              Clients
            </Link>
          </>
        )}

        {/* Admin — only for platform admin */}
        {isAdmin && (
          <>
            <div className="pt-2 pb-1">
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Platform
              </p>
            </div>
            <Link
              href="/admin"
              aria-current={
                pathname === "/admin" || pathname.startsWith("/admin/")
                  ? "page"
                  : undefined
              }
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:outline-none",
                pathname === "/admin" || pathname.startsWith("/admin/")
                  ? "bg-[var(--color-brand-teal)] text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Admin
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        {certCriteria && (
          <ReadinessBadgeMini criteria={certCriteria} />
        )}
        <p className="text-xs text-muted-foreground px-2">GrantAQ &copy; 2026</p>
      </div>
    </aside>
  );
}
