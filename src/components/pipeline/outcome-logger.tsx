"use client";

import { useState } from "react";
import { X, Trophy, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineItem } from "./kanban-board";

const REJECTION_REASONS = [
  { value: "too_competitive", label: "Too Competitive" },
  { value: "weak_narrative", label: "Weak Narrative" },
  { value: "missing_requirements", label: "Missing Requirements" },
  { value: "budget_issues", label: "Budget Issues" },
  { value: "wrong_fit", label: "Wrong Fit" },
  { value: "unknown", label: "Unknown" },
] as const;

type RejectionReason = (typeof REJECTION_REASONS)[number]["value"];

interface OutcomeLoggerProps {
  item: PipelineItem;
  outcome: "awarded" | "declined";
  onClose: () => void;
  onLogged?: (outcomeData: AwardedData | DeclinedData) => void;
}

interface AwardedData {
  outcome: "awarded";
  amountAwarded: number;
  startDate: string;
  grantPeriod: string;
}

interface DeclinedData {
  outcome: "declined";
  rejectionReason: RejectionReason;
  funderFeedback: string;
}

export function OutcomeLogger({
  item,
  outcome,
  onClose,
  onLogged,
}: OutcomeLoggerProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Awarded fields
  const [amountAwarded, setAmountAwarded] = useState("");
  const [startDate, setStartDate] = useState("");
  const [grantPeriod, setGrantPeriod] = useState("12 months");

  // Declined fields
  const [rejectionReason, setRejectionReason] =
    useState<RejectionReason>("unknown");
  const [funderFeedback, setFunderFeedback] = useState("");

  const isAwarded = outcome === "awarded";
  const isDeclined = outcome === "declined";

  const canSubmit = isAwarded
    ? amountAwarded.trim() !== "" && startDate.trim() !== ""
    : true; // declined: reason has a default, so always submittable

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);

    // PATCH /api/pipeline triggers the whole downstream agent chain:
    // - awarded: Compliance Calendar Builder + Outcome Learner + success fee
    // - declined: Outcome Learner + match_feedback
    // funder_feedback_text is what feeds the Outcome Learner's insights.
    const body: Record<string, unknown> = {
      id: item.id,
      stage: outcome,
    };
    if (isAwarded) {
      body.award_amount = parseFloat(amountAwarded.replace(/,/g, "")) || 0;
      body.notes = `Start: ${startDate} · Period: ${grantPeriod}`;
    }
    if (isDeclined) {
      // Always send notes so the rejection reason persists on the row.
      body.notes = `Rejection reason: ${rejectionReason}`;
      if (funderFeedback.trim().length > 0) {
        body.funder_feedback_text = funderFeedback.trim();
      }
    }

    try {
      const res = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Best-effort: show the failure but don't block close. User can retry.
        console.error("log-outcome PATCH failed", await res.text());
      }
    } catch (err) {
      console.error("log-outcome network error", err);
    }

    const data: AwardedData | DeclinedData = isAwarded
      ? {
          outcome: "awarded",
          amountAwarded: parseFloat(amountAwarded.replace(/,/g, "")) || 0,
          startDate,
          grantPeriod,
        }
      : {
          outcome: "declined",
          rejectionReason,
          funderFeedback,
        };

    setSaving(false);
    setSaved(true);
    onLogged?.(data);

    setTimeout(() => {
      onClose();
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-warm-900 rounded-xl shadow-2xl border border-warm-200 dark:border-warm-700 flex flex-col">
        {/* Header */}
        <div
          className={cn(
            "flex items-start justify-between p-4 border-b border-warm-200 dark:border-warm-700",
            isAwarded
              ? "bg-green-50 dark:bg-green-900/20"
              : "bg-red-50 dark:bg-red-900/20"
          )}
        >
          <div className="flex items-center gap-2.5">
            {isAwarded ? (
              <Trophy className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
            )}
            <div>
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  isAwarded
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {isAwarded ? "Grant Awarded" : "Grant Declined"}
              </p>
              <h2 className="text-sm font-bold text-warm-900 dark:text-warm-50 mt-0.5 leading-tight">
                {item.grantName}
              </h2>
              <p className="text-xs text-warm-500">{item.funderName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800 text-warm-400 hover:text-warm-600 dark:hover:text-warm-300 transition-colors ml-2 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {isAwarded && (
            <>
              <p className="text-sm text-warm-600 dark:text-warm-400">
                Log the outcome to track your win rate and generate compliance
                milestones.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-warm-600 dark:text-warm-400 mb-1">
                    Amount Awarded ($)
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 75,000"
                    value={amountAwarded}
                    onChange={(e) => setAmountAwarded(e.target.value)}
                    className="w-full rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-900 dark:text-warm-50 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-warm-600 dark:text-warm-400 mb-1">
                    Grant Start Date
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-900 dark:text-warm-50 focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-warm-600 dark:text-warm-400 mb-1">
                    Grant Period
                  </label>
                  <select
                    value={grantPeriod}
                    onChange={(e) => setGrantPeriod(e.target.value)}
                    className="w-full rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-900 dark:text-warm-50 focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  >
                    <option>6 months</option>
                    <option>12 months</option>
                    <option>18 months</option>
                    <option>24 months</option>
                    <option>36 months</option>
                    <option>Multi-year</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {isDeclined && (
            <>
              <p className="text-sm text-warm-600 dark:text-warm-400">
                Log the outcome to improve your strategy and track patterns.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-warm-600 dark:text-warm-400 mb-1">
                    Suspected Reason
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) =>
                      setRejectionReason(e.target.value as RejectionReason)
                    }
                    className="w-full rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-900 dark:text-warm-50 focus:outline-none focus:ring-2 focus:ring-brand-teal/50"
                  >
                    {REJECTION_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-warm-600 dark:text-warm-400 mb-1">
                    Funder Feedback{" "}
                    <span className="text-warm-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    placeholder="Paste any feedback received from the funder..."
                    value={funderFeedback}
                    onChange={(e) => setFunderFeedback(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-900 dark:text-warm-50 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/50 resize-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-warm-200 dark:border-warm-700 flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving || saved}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              saved
                ? "bg-green-500 text-white cursor-default"
                : canSubmit && !saving
                ? isAwarded
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
                : "bg-warm-200 dark:bg-warm-700 text-warm-400 cursor-not-allowed"
            )}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saved
              ? "Logged!"
              : saving
              ? "Saving..."
              : isAwarded
              ? "Log Award"
              : "Log Outcome"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
