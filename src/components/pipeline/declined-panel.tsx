"use client";

import { useState } from "react";
import { X, Mail, RefreshCw, TrendingUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineItem } from "./kanban-board";

// Simulated AI scorecard weak areas — in production, pull from grant_pipeline.scorecard_json
const WEAK_AREAS = [
  { label: "Relationship Status", score: 2, max: 5 },
  { label: "Organizational Fit", score: 3, max: 5 },
  { label: "Budget Alignment", score: 3, max: 5 },
];

// Mock similar grants — in production, query grant_sources by vector similarity
const SIMILAR_GRANTS = [
  { name: "Community Impact Fund", funder: "Blue Oak Foundation", amount: 50000 },
  { name: "Workforce Innovation Grant", funder: "State DWD", amount: 75000 },
  { name: "Equity in Action Award", funder: "Horizon Philanthropy", amount: 40000 },
];

function generateFeedbackEmailTemplate(item: PipelineItem): string {
  return `Subject: Request for Application Feedback — [Your Organization Name]

Dear [Program Officer Name],

Thank you for the opportunity to apply for the ${item.grantName}. While we are disappointed that we were not selected for this funding cycle, we remain committed to the work described in our application.

We would greatly appreciate any feedback you are able to share regarding our proposal — particularly in areas we could strengthen for future applications.

If there is a more appropriate time to connect, we are happy to schedule a brief call at your convenience.

Thank you again for your time and consideration.

Warm regards,
[Your Name]
[Title]
[Organization]
[Phone] | [Email]`;
}

function getNextCycleDate(): string {
  const next = new Date();
  next.setFullYear(next.getFullYear() + 1);
  return next.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface DeclinedPanelProps {
  item: PipelineItem;
  onClose: () => void;
}

export function DeclinedPanel({ item, onClose }: DeclinedPanelProps) {
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [resubmitScheduled, setResubmitScheduled] = useState(false);

  const emailTemplate = generateFeedbackEmailTemplate(item);
  const weakestArea = [...WEAK_AREAS].sort((a, b) => a.score - b.score)[0];
  const nextCycle = getNextCycleDate();

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailTemplate);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch {
      // clipboard not available in all contexts — fail silently
    }
  };

  const scheduleResubmit = () => {
    setResubmitScheduled(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-warm-900 rounded-xl shadow-2xl border border-warm-200 dark:border-warm-700 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-warm-200 dark:border-warm-700 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                Declined
              </span>
            </div>
            <h2 className="text-base font-bold text-warm-900 dark:text-warm-50 mt-1 leading-tight">
              {item.grantName}
            </h2>
            <p className="text-xs text-warm-500 mt-0.5">{item.funderName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800 text-warm-400 hover:text-warm-700 dark:hover:text-warm-300 transition-colors ml-2 shrink-0"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {/* Quick Actions */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-3">Next Steps</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowEmailTemplate((v) => !v)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-warm-200 dark:border-warm-700 hover:bg-warm-50 dark:hover:bg-warm-800 text-sm font-medium text-warm-700 dark:text-warm-300 transition-colors text-left"
              >
                <Mail className="w-4 h-4 text-brand-teal shrink-0" />
                Request Feedback from Funder
              </button>

              <button
                onClick={scheduleResubmit}
                disabled={resubmitScheduled}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left",
                  resubmitScheduled
                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-default"
                    : "border-warm-200 dark:border-warm-700 hover:bg-warm-50 dark:hover:bg-warm-800 text-warm-700 dark:text-warm-300"
                )}
              >
                <RefreshCw className={cn("w-4 h-4 shrink-0", resubmitScheduled ? "text-green-500" : "text-brand-teal")} />
                {resubmitScheduled
                  ? `Resubmission flagged for ${nextCycle}`
                  : "Resubmit Next Cycle"}
              </button>
            </div>
          </section>

          {/* Email Template */}
          {showEmailTemplate && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-warm-500">
                  Email Template
                </h3>
                <button
                  onClick={copyEmail}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal font-medium transition-colors"
                >
                  {emailCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {emailCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="text-xs text-warm-600 dark:text-warm-400 bg-warm-50 dark:bg-warm-800 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-warm-200 dark:border-warm-700 max-h-48 overflow-y-auto">
                {emailTemplate}
              </pre>
            </section>
          )}

          {/* AI Analysis */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              AI Analysis
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
              Based on your scorecard, the likely weak area was{" "}
              <strong>
                {weakestArea.label}: {weakestArea.score}/{weakestArea.max}
              </strong>
              . Consider cultivating this funder relationship before reapplying — attend their convenings, share impact reports, and request an informational meeting 6 months prior to the next deadline.
            </div>

            {/* Scorecard bars */}
            <div className="mt-3 space-y-2">
              {WEAK_AREAS.map((area) => (
                <div key={area.label}>
                  <div className="flex justify-between text-xs text-warm-500 mb-0.5">
                    <span>{area.label}</span>
                    <span>{area.score}/{area.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-warm-200 dark:bg-warm-700 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        area.score / area.max < 0.5 ? "bg-red-400" : area.score / area.max < 0.75 ? "bg-amber-400" : "bg-green-400"
                      )}
                      style={{ width: `${(area.score / area.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Similar Grants */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2">
              Similar Grants to Pursue
            </h3>
            <div className="space-y-2">
              {SIMILAR_GRANTS.map((g) => (
                <div
                  key={g.name}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-warm-50 dark:bg-warm-800 border border-warm-200 dark:border-warm-700"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-warm-800 dark:text-warm-200 truncate">{g.name}</p>
                    <p className="text-xs text-warm-500 truncate">{g.funder}</p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs font-semibold text-brand-teal">
                    ${(g.amount / 1000).toFixed(0)}K
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
