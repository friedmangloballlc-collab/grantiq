"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Milestone {
  id: string;
  label: string;
  description: string;
  href: string;
}

const MILESTONES: Milestone[] = [
  { id: "eligibility_check", label: "Check your eligibility", description: "See if your organization qualifies for grants", href: "/services/eligibility-status" },
  { id: "view_matches", label: "View your grant matches", description: "See which grants match your profile", href: "/matches" },
  { id: "save_pipeline", label: "Save a grant to pipeline", description: "Start tracking a grant you're interested in", href: "/matches" },
  { id: "run_diagnostic", label: "Run the readiness diagnostic", description: "Get your full 10-step readiness assessment", href: "/services/readiness-diagnostic" },
  { id: "use_second_feature", label: "Explore another feature", description: "Try the calendar, vault, or compliance calendar", href: "/services" },
];

export function ActivationChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for dismissed state
    if (localStorage.getItem("activation_dismissed") === "true") {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Fetch completion status
    async function check() {
      try {
        const res = await fetch("/api/onboarding/activation-status");
        if (res.ok) {
          const data = await res.json();
          setCompleted(new Set(data.completed ?? []));
        }
      } catch {} finally { setLoading(false); }
    }
    check();
  }, []);

  if (loading || dismissed) return null;

  const completedCount = completed.size;
  const totalCount = MILESTONES.length;
  const allDone = completedCount >= totalCount;
  const pct = Math.round((completedCount / totalCount) * 100);

  // Auto-dismiss when all complete (after showing for 3 seconds)
  if (allDone) {
    setTimeout(() => {
      localStorage.setItem("activation_dismissed", "true");
      setDismissed(true);
    }, 5000);
  }

  return (
    <div className="rounded-lg border border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Sparkles className="h-4 w-4 text-brand-teal shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {allDone ? "You're all set!" : "Get started with GrantAQ"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 flex-1 rounded-full bg-brand-teal/20">
              <div
                className="h-1.5 rounded-full bg-brand-teal transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{completedCount}/{totalCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!allDone && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); localStorage.setItem("activation_dismissed", "true"); setDismissed(true); }}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Milestones */}
      {!collapsed && (
        <div className="px-4 pb-3 space-y-1">
          {MILESTONES.map((m) => {
            const done = completed.has(m.id);
            return (
              <Link
                key={m.id}
                href={m.href}
                className={cn(
                  "flex items-start gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  done ? "opacity-60" : "hover:bg-brand-teal/10"
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={cn("font-medium", done && "line-through text-muted-foreground")}>{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
