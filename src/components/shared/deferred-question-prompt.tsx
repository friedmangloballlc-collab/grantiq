"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface DeferredQuestionOption {
  label: string;
  value: string;
}

interface DeferredQuestionPromptProps {
  /** Unique field id for the save endpoint */
  fieldId: string;
  /** Display title */
  title: string;
  /** Explanation of why this matters for this grant */
  reason: string;
  /** Question type */
  type: "single_select" | "text";
  /** Options for single_select */
  options?: DeferredQuestionOption[];
  /** Placeholder for text input */
  placeholder?: string;
  /** Callback after successful save */
  onSaved?: (value: string) => void;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

/**
 * Inline prompt shown on grant detail pages when a grant requires
 * profile info the org hasn't provided yet. Saves via /api/onboarding/save.
 */
export function DeferredQuestionPrompt({
  fieldId,
  title,
  reason,
  type,
  options,
  placeholder,
  onSaved,
  onDismiss,
}: DeferredQuestionPromptProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (selectedValue?: string) => {
    const val = selectedValue ?? value;
    if (!val) return;
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: fieldId, value: val }),
      });
      if (res.ok) {
        setSaved(true);
        onSaved?.(val);
      }
    } catch {
      // Silent fail — user can try again
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4">
        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
          Saved! Your matches will update to reflect this.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {title}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            {reason}
          </p>
          <div className="mt-3">
            {type === "single_select" && options ? (
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => handleSave(opt.value)}
                    className="text-xs"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 rounded-md border border-amber-300 bg-white dark:bg-warm-900 px-3 py-1.5 text-sm"
                />
                <Button
                  size="sm"
                  disabled={saving || !value}
                  onClick={() => handleSave()}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-amber-400 hover:text-amber-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Pre-configured TRL prompt — shown when a grant has required_trl_min
 * and the org hasn't set technology_readiness_level.
 */
export function TRLPrompt({
  requiredTrl,
  onSaved,
  onDismiss,
}: {
  requiredTrl: number;
  onSaved?: (value: string) => void;
  onDismiss?: () => void;
}) {
  return (
    <DeferredQuestionPrompt
      fieldId="technology_readiness_level"
      title="This grant requires a Technology Readiness Level"
      reason={`This grant requires TRL ${requiredTrl} or higher. TRL measures how close your technology is to being ready for real-world use (1 = basic research, 9 = proven in operation).`}
      type="single_select"
      options={[
        { label: "TRL 1-2 (Basic research)", value: "2" },
        { label: "TRL 3-4 (Proof of concept)", value: "4" },
        { label: "TRL 5-6 (Prototype/demo)", value: "6" },
        { label: "TRL 7-8 (System testing)", value: "8" },
        { label: "TRL 9 (Proven in operation)", value: "9" },
      ]}
      onSaved={onSaved}
      onDismiss={onDismiss}
    />
  );
}
