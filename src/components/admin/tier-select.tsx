"use client";

import { useState, useTransition } from "react";

const TIERS = ["free", "starter", "pro", "growth", "enterprise"] as const;

interface TierSelectProps {
  userId: string;
  currentTier: string;
}

export function TierSelect({ userId, currentTier }: TierSelectProps) {
  const [tier, setTier] = useState<string>(currentTier);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newTier = e.target.value;
    setTier(newTier);
    setStatus("saving");

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/tier`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: newTier }),
        });

        if (!res.ok) {
          setStatus("error");
          setTier(currentTier);
          return;
        }

        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
        setTier(currentTier);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={tier}
        onChange={handleChange}
        disabled={status === "saving"}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-teal)] disabled:opacity-50"
        aria-label="Change subscription tier"
      >
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
      {status === "saving" && (
        <span className="text-xs text-muted-foreground">Saving…</span>
      )}
      {status === "saved" && (
        <span className="text-xs text-[var(--color-brand-teal-text)]">Saved</span>
      )}
      {status === "error" && (
        <span className="text-xs text-destructive">Failed</span>
      )}
    </div>
  );
}
