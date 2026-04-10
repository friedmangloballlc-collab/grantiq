"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Search,
  Kanban,
  BookOpen,
  PenLine,
  CalendarDays,
  FolderLock,
  Building2,
  BarChart3,
  Map,
  Settings,
  Sparkles,
  RefreshCw,
  Download,
  ArrowRight,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrantResult {
  id: string;
  name: string;
  funder_name: string;
  grant_type?: string;
  amount_max?: number | null;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const PAGE_ITEMS = [
  { label: "Dashboard",     href: "/dashboard",  icon: LayoutDashboard },
  { label: "Grant Matches", href: "/matches",    icon: Search },
  { label: "Pipeline",      href: "/pipeline",   icon: Kanban },
  { label: "Grant Library", href: "/library",    icon: BookOpen },
  { label: "Writing",       href: "/writing",    icon: PenLine },
  { label: "Calendar",      href: "/calendar",   icon: CalendarDays },
  { label: "Vault",         href: "/vault",      icon: FolderLock },
  { label: "Funders",       href: "/funders",    icon: Building2 },
  { label: "Analytics",     href: "/analytics",  icon: BarChart3 },
  { label: "Roadmap",       href: "/roadmap",    icon: Map },
  { label: "Settings",      href: "/settings",   icon: Settings },
  { label: "Upgrade",       href: "/settings?tab=billing", icon: ArrowRight },
] as const;

interface ActionItem {
  label: string;
  icon: React.ElementType;
  run: (router: ReturnType<typeof useRouter>) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [grants, setGrants] = useState<GrantResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- keyboard shortcut ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- reset state on close ---
  useEffect(() => {
    if (!open) {
      setQuery("");
      setGrants([]);
    }
  }, [open]);

  // --- debounced grant search ---
  const searchGrants = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setGrants([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/library/search?q=${encodeURIComponent(q.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setGrants(Array.isArray(data) ? data : (data.results ?? []));
        }
      } catch {
        // silently fail — search is non-critical
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    searchGrants(value);
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const ACTION_ITEMS: ActionItem[] = [
    {
      label: "Open Grantie Chat",
      icon: Sparkles,
      run: () => {
        setOpen(false);
        // Grantie button is a floating element — dispatch a custom event
        document.dispatchEvent(new CustomEvent("grantie:open"));
      },
    },
    {
      label: "Run Matches",
      icon: RefreshCw,
      run: (_r) => navigate("/matches?run=1"),
    },
    {
      label: "Export Data",
      icon: Download,
      run: (_r) => navigate("/analytics?export=1"),
    },
  ];

  return (
    // DialogContent handles the overlay + close-on-outside-click via Base UI Dialog.
    // We use open/onOpenChange to sync with our keyboard shortcut state.
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "overflow-hidden p-0 gap-0",
          "bg-warm-50 dark:bg-warm-900",
          "max-w-xl w-full rounded-xl shadow-2xl"
        )}
        aria-label="Command palette"
      >
        <Command
          className="flex flex-col bg-transparent"
          shouldFilter={false}
          loop
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={handleQueryChange}
              placeholder="Search pages, actions, or grants..."
              className={cn(
                "flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground",
                "outline-none border-none focus:ring-0"
              )}
              autoFocus
            />
            {loading && (
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
            )}
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              Esc
            </kbd>
          </div>

          {/* Scrollable results */}
          <Command.List className="max-h-[400px] overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Pages */}
            <Command.Group
              heading="Pages"
              className={cn(
                "[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2",
                "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold",
                "[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
              )}
            >
              {PAGE_ITEMS.map(({ label, href, icon: Icon }) => (
                <Command.Item
                  key={href}
                  value={`page-${label}`}
                  onSelect={() => navigate(href)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-sm cursor-pointer",
                    "text-foreground rounded-md mx-1",
                    "aria-selected:bg-brand-teal aria-selected:text-white",
                    "transition-colors duration-100"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span>{label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Actions */}
            <Command.Group
              heading="Actions"
              className={cn(
                "[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3",
                "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold",
                "[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
              )}
            >
              {ACTION_ITEMS.map(({ label, icon: Icon, run }) => (
                <Command.Item
                  key={label}
                  value={`action-${label}`}
                  onSelect={() => run(router)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-sm cursor-pointer",
                    "text-foreground rounded-md mx-1",
                    "aria-selected:bg-brand-teal aria-selected:text-white",
                    "transition-colors duration-100"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span>{label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Grant search results — only shown when user is typing */}
            {query.trim() && (
              <Command.Group
                heading="Search Grants"
                className={cn(
                  "[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3",
                  "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold",
                  "[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                )}
              >
                {grants.length === 0 && !loading && (
                  <div className="px-4 py-2 text-xs text-muted-foreground italic">
                    No matching grants found.
                  </div>
                )}
                {grants.map((grant) => (
                  <Command.Item
                    key={grant.id}
                    value={`grant-${grant.id}`}
                    onSelect={() => navigate(`/grants/${grant.id}`)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 cursor-pointer",
                      "text-foreground rounded-md mx-1",
                      "aria-selected:bg-brand-teal aria-selected:text-white",
                      "transition-colors duration-100"
                    )}
                  >
                    <Search className="h-4 w-4 shrink-0 opacity-50" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">
                        {grant.name}
                      </span>
                      <span className="text-xs opacity-70 truncate">
                        {grant.funder_name}
                        {grant.grant_type ? ` · ${grant.grant_type}` : ""}
                        {grant.amount_max
                          ? ` · up to ${formatAmount(grant.amount_max)}`
                          : ""}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer hint */}
          <div className="flex items-center gap-3 border-t border-border px-4 py-2">
            <span className="text-[11px] text-muted-foreground">
              <kbd className="font-mono">↑↓</kbd> navigate
            </span>
            <span className="text-[11px] text-muted-foreground">
              <kbd className="font-mono">↵</kbd> select
            </span>
            <span className="text-[11px] text-muted-foreground">
              <kbd className="font-mono">Esc</kbd> close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
