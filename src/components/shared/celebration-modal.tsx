"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export type CelebrationEvent =
  | "first_match"
  | "first_pipeline_save"
  | "first_application_submitted"
  | "first_grant_awarded";

const CELEBRATION_CONFIG: Record<
  CelebrationEvent,
  { title: string; message: (amount?: number) => string; emoji: string; size: "normal" | "big" }
> = {
  first_match: {
    title: "Your First Match!",
    message: () => "You matched with your first grant!",
    emoji: "🎯",
    size: "normal",
  },
  first_pipeline_save: {
    title: "Pipeline Started!",
    message: () => "Your pipeline is started!",
    emoji: "🚀",
    size: "normal",
  },
  first_application_submitted: {
    title: "Application Submitted!",
    message: () => "Application submitted! Good luck!",
    emoji: "📬",
    size: "normal",
  },
  first_grant_awarded: {
    title: "CONGRATULATIONS!",
    message: (amount) =>
      amount ? `You won $${amount.toLocaleString()}!` : "You won a grant!",
    emoji: "🏆",
    size: "big",
  },
};

const STORAGE_KEY = "grantaq_celebrations_seen";

function getSeenCelebrations(): Set<CelebrationEvent> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markCelebrationSeen(event: CelebrationEvent) {
  if (typeof window === "undefined") return;
  try {
    const seen = getSeenCelebrations();
    seen.add(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // ignore
  }
}

/** Hook to trigger a celebration. Returns a `celebrate` function. */
export function useCelebration() {
  const [pending, setPending] = useState<{ event: CelebrationEvent; amount?: number } | null>(null);

  const celebrate = useCallback((event: CelebrationEvent, amount?: number) => {
    const seen = getSeenCelebrations();
    if (seen.has(event)) return;
    setPending({ event, amount });
  }, []);

  const dismiss = useCallback(() => {
    if (pending) {
      markCelebrationSeen(pending.event);
    }
    setPending(null);
  }, [pending]);

  return { pending, celebrate, dismiss };
}

// ─── Confetti Pieces ──────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#0D9488", "#5EEAD4", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#10B981", "#3B82F6",
];

function ConfettiPiece({ index }: { index: number }) {
  const left = `${(index * 7.3 + 5) % 100}%`;
  const delay = `${(index * 0.11) % 2}s`;
  const duration = `${2.5 + (index % 4) * 0.5}s`;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const width = index % 3 === 0 ? "8px" : "6px";
  const height = index % 2 === 0 ? "12px" : "8px";
  const borderRadius = index % 4 === 0 ? "50%" : "2px";

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left,
        top: 0,
        width,
        height,
        backgroundColor: color,
        borderRadius,
        animation: `confetti-fall ${duration} ${delay} linear forwards`,
      }}
    />
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface CelebrationModalProps {
  event: CelebrationEvent;
  amount?: number;
  onDismiss: () => void;
}

export function CelebrationModal({ event, amount, onDismiss }: CelebrationModalProps) {
  const config = CELEBRATION_CONFIG[event];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 4s
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  const handleClick = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
      onClick={handleClick}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center cursor-pointer",
        "transition-all duration-300",
        visible ? "bg-black/50 backdrop-blur-sm" : "bg-transparent backdrop-blur-none pointer-events-none"
      )}
    >
      {/* Confetti layer */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }, (_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}
      </div>

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 rounded-2xl border border-warm-200 dark:border-warm-700 bg-background shadow-2xl px-10 py-10 text-center",
          "transition-all duration-300",
          visible ? "scale-100 opacity-100" : "scale-90 opacity-0",
          config.size === "big" ? "max-w-md" : "max-w-sm"
        )}
      >
        <div
          className={cn(
            "mb-4",
            config.size === "big" ? "text-7xl" : "text-5xl"
          )}
          aria-hidden
        >
          {config.emoji}
        </div>
        <h2
          className={cn(
            "font-bold text-warm-900 dark:text-warm-50 mb-2",
            config.size === "big" ? "text-3xl" : "text-2xl"
          )}
        >
          {config.title}
        </h2>
        <p className="text-warm-600 dark:text-warm-400 text-base">
          {config.message(amount)}
        </p>
        <p className="mt-6 text-xs text-warm-400">Click anywhere to continue</p>
      </div>
    </div>
  );
}
