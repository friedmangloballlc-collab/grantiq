"use client";

// Live draft progress widget — replaces the old static "Refresh to check
// for updates" hint with a real-time view of the worker's progress on
// the draft. Subscribes to grant_drafts row updates via Supabase Realtime
// (publication added in migration 00056) and re-renders the in-progress
// card on every UPDATE the worker writes.
//
// When the draft transitions to a terminal status (completed, failed),
// the component triggers router.refresh() so the parent server component
// re-fetches the now-populated sections / audit_report / etc.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DraftStatus = string;

interface LiveDraftProgressProps {
  draftId: string;
  initialStatus: DraftStatus;
  initialStep: string | null;
  initialProgress: number | null;
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
]);

export function LiveDraftProgress({
  draftId,
  initialStatus,
  initialStep,
  initialProgress,
}: LiveDraftProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState<DraftStatus>(initialStatus);
  const [currentStep, setCurrentStep] = useState<string | null>(initialStep);
  const [progressPct, setProgressPct] = useState<number | null>(initialProgress);

  useEffect(() => {
    // If the server already returned a terminal status, no need to
    // subscribe — the parent server component is already showing the
    // final state.
    if (TERMINAL_STATUSES.has(initialStatus)) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`draft-progress:${draftId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "grant_drafts",
          filter: `id=eq.${draftId}`,
        },
        (payload) => {
          const next = payload.new as {
            status?: DraftStatus;
            current_step?: string | null;
            progress_pct?: number | null;
          };
          if (next.status !== undefined) setStatus(next.status);
          if (next.current_step !== undefined) setCurrentStep(next.current_step);
          if (next.progress_pct !== undefined) setProgressPct(next.progress_pct);

          // Once the worker hits a terminal status, ask the server
          // component to re-fetch — that brings in sections, audit
          // report, etc., that the client subscription doesn't carry.
          if (next.status && TERMINAL_STATUSES.has(next.status)) {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [draftId, initialStatus, router]);

  // Hide entirely once the draft has reached a terminal status — the
  // parent renders the completed UI (sections, audit report) below.
  if (TERMINAL_STATUSES.has(status)) return null;

  const pct = Math.max(0, Math.min(100, progressPct ?? 0));
  const stepLabel = currentStep ?? "Starting up";

  return (
    <div className="space-y-3 bg-[var(--color-brand-teal)]/5 border border-[var(--color-brand-teal)]/20 rounded-lg px-4 py-4">
      <div className="flex items-center gap-3">
        {pct > 0 && pct < 100 ? (
          <Loader2 className="h-4 w-4 text-[var(--color-brand-teal)] shrink-0 animate-spin" />
        ) : (
          <Clock className="h-4 w-4 text-[var(--color-brand-teal)] shrink-0" />
        )}
        <p className="text-sm font-medium text-foreground flex-1">
          {stepLabel}
        </p>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-[var(--color-brand-teal)]/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-brand-teal)] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Updating live. This page will reload automatically when your draft is ready.
      </p>
    </div>
  );
}
