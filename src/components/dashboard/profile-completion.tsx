"use client";

import { useState } from "react";
import { CheckSquare, Square, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DEFERRED_STEPS } from "@/components/onboarding/chat-interface";
import type { Step } from "@/components/onboarding/chat-interface";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeferredAnswers = Record<string, string | string[]>;

// ─── Step Input (inline, same multi-choice UI as onboarding) ─────────────────

function StepInput({
  step,
  onSave,
  existingValue,
}: {
  step: Step;
  onSave: (value: string | string[]) => Promise<void>;
  existingValue?: string | string[];
}) {
  const [textInput, setTextInput] = useState(
    typeof existingValue === "string" ? existingValue : ""
  );
  const [multiSelected, setMultiSelected] = useState<string[]>(
    Array.isArray(existingValue) ? existingValue : []
  );
  const [industrySearch, setIndustrySearch] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSingle = async (value: string) => {
    setSaving(true);
    await onSave(value);
    setSaving(false);
  };

  const toggleMulti = (value: string) => {
    setMultiSelected((prev) => {
      if (value === "none") return ["none"];
      const withoutNone = prev.filter((v) => v !== "none");
      if (withoutNone.includes(value)) return withoutNone.filter((v) => v !== value);
      return [...withoutNone, value];
    });
  };

  const handleMultiSave = async () => {
    const val = multiSelected.length > 0 ? multiSelected : ["none"];
    setSaving(true);
    await onSave(val);
    setSaving(false);
  };

  const handleTextSave = async () => {
    if (!textInput.trim()) return;
    setSaving(true);
    await onSave(textInput.trim());
    setSaving(false);
  };

  if (step.type === "single_select" && step.options) {
    return (
      <div className="grid grid-cols-2 gap-2 pt-2">
        {step.options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => void handleSingle(opt.value)}
            disabled={saving}
            className={cn(
              "rounded-xl border-2 px-3 py-2.5 text-sm text-left font-medium transition-all duration-150",
              "border-warm-200 dark:border-warm-700 text-warm-800 dark:text-warm-200",
              "hover:border-brand-teal hover:text-brand-teal",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (step.type === "multi_select" && step.options) {
    return (
      <div className="space-y-2 pt-2">
        <div className="grid grid-cols-2 gap-2">
          {step.options.map((opt) => {
            const checked = multiSelected.includes(opt.value);
            return (
              <button
                key={opt.label}
                onClick={() => toggleMulti(opt.value)}
                disabled={saving}
                className={cn(
                  "rounded-xl border-2 px-3 py-2.5 text-sm text-left font-medium transition-all duration-150 flex items-center gap-2",
                  checked
                    ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                    : "border-warm-200 dark:border-warm-700 text-warm-800 dark:text-warm-200 hover:border-brand-teal hover:text-brand-teal",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {checked ? (
                  <CheckSquare className="h-4 w-4 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 shrink-0" />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
        <Button
          onClick={() => void handleMultiSave()}
          disabled={saving}
          className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white mt-1 flex items-center gap-2"
        >
          Save <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (step.type === "searchable_select" && step.options) {
    const allOptions = step.options;
    const filtered = industrySearch.trim()
      ? allOptions.filter((o) =>
          o.label.toLowerCase().includes(industrySearch.trim().toLowerCase())
        )
      : allOptions;

    return (
      <div className="space-y-2 pt-2">
        <input
          value={industrySearch}
          onChange={(e) => setIndustrySearch(e.target.value)}
          placeholder="Search industries..."
          disabled={saving}
          autoFocus
          className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-50"
        />
        <div
          className="overflow-y-auto rounded-lg border border-warm-200 dark:border-warm-700"
          style={{ maxHeight: "200px" }}
        >
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-warm-400">No industries match.</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                onClick={() => !saving && void handleSingle(opt.value)}
                disabled={saving}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-100",
                  "text-warm-800 dark:text-warm-200",
                  "hover:bg-brand-teal/10 hover:text-brand-teal",
                  "border-b border-warm-100 dark:border-warm-700 last:border-b-0",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (step.type === "textarea") {
    return (
      <div className="space-y-2 pt-2">
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={step.placeholder}
          disabled={saving}
          rows={3}
          className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal resize-none disabled:opacity-50"
        />
        <Button
          onClick={() => void handleTextSave()}
          disabled={saving || !textInput.trim()}
          className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white flex items-center gap-2"
        >
          Save <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // text
  return (
    <div className="flex gap-2 pt-2">
      <input
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleTextSave();
        }}
        placeholder={step.placeholder}
        disabled={saving}
        className="flex-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-50"
      />
      <Button
        onClick={() => void handleTextSave()}
        disabled={saving || !textInput.trim()}
        className="bg-brand-teal hover:bg-brand-teal-dark text-white"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── ProfileCompletion Card ───────────────────────────────────────────────────

interface ProfileCompletionProps {
  /** Answers already saved for deferred steps (keyed by step id) */
  savedAnswers?: DeferredAnswers;
}

export function ProfileCompletion({ savedAnswers = {} }: ProfileCompletionProps) {
  const [answers, setAnswers] = useState<DeferredAnswers>(savedAnswers);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Only show steps that don't have conditional logic blocking them,
  // or whose showIf passes given the current combined answers context.
  // For simplicity we pass the existing answers as the showIf context.
  const visibleSteps = DEFERRED_STEPS.filter(
    (step) => !step.showIf || step.showIf(answers)
  );

  // Skip document_upload — file upload handled in settings
  const displaySteps = visibleSteps.filter((s) => s.id !== "document_upload");

  const completedIds = new Set(Object.keys(answers));
  const completedCount = displaySteps.filter((s) => completedIds.has(s.id)).length;
  const totalCount = displaySteps.length;

  // Core (5) + deferred completed = overall profile %
  // Core is always 100% at this point (user reached dashboard)
  const overallPercent = Math.round(((5 + completedCount) / (5 + totalCount)) * 100);

  const saveToServer = async (field: string, value: string | string[]) => {
    try {
      await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
    } catch {
      // non-blocking
    }
  };

  const handleSave = async (stepId: string, value: string | string[]) => {
    const newAnswers = { ...answers, [stepId]: value };
    setAnswers(newAnswers);
    setExpandedStep(null);
    await saveToServer(stepId, value);
  };

  // Don't render if all deferred steps are complete
  if (completedCount >= totalCount) return null;

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50">
              Strengthen Your Profile
            </CardTitle>
            <p className="text-xs text-warm-500 mt-0.5">
              Complete your profile to improve match accuracy
            </p>
          </div>
          <span className="text-sm font-semibold text-brand-teal shrink-0">
            {overallPercent}% complete
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-brand-teal rounded-full transition-all duration-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-1 pt-0">
        {displaySteps.map((step) => {
          const done = completedIds.has(step.id);
          const expanded = expandedStep === step.id;

          return (
            <div key={step.id} className="rounded-lg border border-warm-100 dark:border-warm-800 overflow-hidden">
              {/* Row header */}
              <button
                onClick={() => setExpandedStep(expanded ? null : step.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  done
                    ? "bg-green-50 dark:bg-green-950/20"
                    : "hover:bg-warm-50 dark:hover:bg-warm-800/50"
                )}
              >
                {done ? (
                  <CheckSquare className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-warm-300 shrink-0" />
                )}
                <span
                  className={cn(
                    "flex-1 text-sm font-medium",
                    done ? "text-warm-500 line-through" : "text-warm-800 dark:text-warm-200"
                  )}
                >
                  {step.question}
                </span>
                {!done && (
                  expanded ? (
                    <ChevronUp className="h-4 w-4 text-warm-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-warm-400 shrink-0" />
                  )
                )}
              </button>

              {/* Inline question */}
              {expanded && !done && (
                <div className="px-4 pb-4 border-t border-warm-100 dark:border-warm-800 bg-warm-50 dark:bg-warm-900/30">
                  {step.subtitle && (
                    <p className="text-xs text-warm-400 pt-2">{step.subtitle}</p>
                  )}
                  <StepInput
                    step={step}
                    onSave={(value) => handleSave(step.id, value)}
                    existingValue={answers[step.id]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
