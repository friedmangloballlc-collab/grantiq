"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface GrantActionButtonsProps {
  grantId: string;
}

export function GrantActionButtons({ grantId }: GrantActionButtonsProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveToPipeline = async () => {
    setSaving(true);
    setSaveError(null);
    try {
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
          className="flex-1 bg-brand-teal hover:bg-brand-teal-dark text-white"
          render={<Link href={`/grants/${grantId}/write`}>Start Application</Link>}
        />
      </div>
    </div>
  );
}
