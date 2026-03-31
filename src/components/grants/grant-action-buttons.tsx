"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useOrg } from "@/hooks/use-org";

// Pipeline item limits per tier (null = unlimited)
const PIPELINE_LIMITS: Record<string, number | null> = {
  free: 1,
  starter: 10,
  pro: null,
  enterprise: null,
};

interface GrantActionButtonsProps {
  grantId: string;
}

export function GrantActionButtons({ grantId }: GrantActionButtonsProps) {
  const { tier } = useOrg();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const handleSaveToPipeline = async () => {
    setSaving(true);
    setSaveError(null);
    setShowUpgradePrompt(false);
    try {
      // Check pipeline count against tier limit before saving
      const limit = PIPELINE_LIMITS[tier] ?? null;
      if (limit !== null) {
        const countRes = await fetch("/api/pipeline?count=true");
        if (countRes.ok) {
          const countData = await countRes.json();
          const currentCount = countData.count ?? 0;
          if (currentCount >= limit) {
            setShowUpgradePrompt(true);
            return;
          }
        }
      }

      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_source_id: grantId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sticky bottom-4 bg-white dark:bg-warm-900 p-4 rounded-xl border border-warm-200 dark:border-warm-800 shadow-lg">
      {saveError && (
        <p className="text-xs text-red-500">{saveError}</p>
      )}
      {showUpgradePrompt && (
        <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
            Pipeline limit reached ({PIPELINE_LIMITS[tier] ?? 0} grants on {tier} plan).
          </p>
          <Button
            size="sm"
            className="shrink-0 bg-[var(--color-brand-teal)] text-white text-xs"
            render={<Link href="/upgrade">Upgrade</Link>}
          />
        </div>
      )}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleSaveToPipeline}
          disabled={saving || saved}
        >
          {saved ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" /> Saved to Pipeline
            </span>
          ) : saving ? (
            "Saving..."
          ) : (
            "Save to Pipeline"
          )}
        </Button>
        <Button
          variant="outline"
          className="flex-1 text-brand-teal border-brand-teal hover:bg-brand-teal/10"
          render={<Link href={`/grants/${grantId}/loi`}>Write LOI ($49)</Link>}
        />
        <Button
          className="flex-1 bg-brand-teal hover:bg-brand-teal-dark text-white"
          render={<Link href={`/grants/${grantId}/write`}>Start Application</Link>}
        />
      </div>
    </div>
  );
}
