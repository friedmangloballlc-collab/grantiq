"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchScoreRing } from "./match-score-ring";
import { DeadlineCountdown } from "@/components/shared/deadline-countdown";
import { WhyMatches } from "./why-matches";
import { ChevronDown, ChevronUp, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";
import { AIDisclosure } from "@/components/shared/ai-disclosure";
import { GrantReadinessBadge } from "@/components/vault/grant-readiness-badge";
import type { UploadedDocument } from "@/components/vault/document-checklist";

import type { MatchCriterion } from "@/lib/matching/match-criteria";

interface MatchCardProps {
  id: string;
  grantName: string;
  funderName: string;
  sourceType: string;
  amountMax: number | null;
  deadline: string | null;
  matchScore: number;
  scoreBreakdown: Record<string, number>;
  missingRequirements: string[];
  matchCriteria?: MatchCriterion[];
  uploadedDocs?: UploadedDocument[];
}

const TYPE_COLORS: Record<string, string> = {
  federal:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  state:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  foundation:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  corporate:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
};

/** Fire-and-forget feedback POST — never throws so it never blocks user actions. */
async function recordFeedback(payload: {
  grant_source_id: string;
  user_action: string;
  match_score?: number;
  relevance_rating?: number;
  scorecard_overrides?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Feedback failures are non-critical — swallow silently.
  }
}

export function MatchCard(props: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [dismissToast, setDismissToast] = useState(false);
  const { orgId } = useOrg();

  const handleSaveToPipeline = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, grant_source_id: props.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      setSaved(true);
      // Track save as feedback — fire and forget
      recordFeedback({
        grant_source_id: props.id,
        user_action: "saved",
        match_score: props.matchScore,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    // Track dismissal as feedback — fire and forget
    recordFeedback({
      grant_source_id: props.id,
      user_action: "dismissed",
      match_score: props.matchScore,
    });
    setDismissed(true);
    setDismissToast(true);
    setTimeout(() => setDismissToast(false), 3000);
  };

  // Hide card after dismissal
  if (dismissed) {
    return dismissToast ? (
      <div className="rounded-lg border border-warm-200 dark:border-warm-800 bg-warm-50 dark:bg-warm-900/30 px-4 py-3 text-sm text-warm-500 dark:text-warm-400">
        Dismissed. We&apos;ll improve your matches.
      </div>
    ) : null;
  }

  const typeColor =
    TYPE_COLORS[props.sourceType.toLowerCase()] ??
    "bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300";

  return (
    <Card className="border-warm-200 dark:border-warm-800 hover:border-brand-teal/30 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <MatchScoreRing score={props.matchScore} />
            <AIDisclosure type="match" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/grants/${props.id}`}
                className="hover:underline flex-1 min-w-0"
              >
                <h3 className="font-semibold text-warm-900 dark:text-warm-50 line-clamp-2">
                  {props.grantName}
                </h3>
              </Link>
              <button
                onClick={handleDismiss}
                title="Not for me"
                aria-label="Dismiss this grant"
                className="shrink-0 p-1 rounded text-warm-400 hover:text-warm-600 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm text-warm-500 truncate">{props.funderName}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                  typeColor,
                )}
              >
                {props.sourceType}
              </span>
              {props.amountMax && (
                <span className="text-sm font-medium text-warm-700 dark:text-warm-300">
                  Up to{" "}
                  {props.amountMax >= 1_000_000
                    ? `$${(props.amountMax / 1_000_000).toFixed(1)}M`
                    : `$${(props.amountMax / 1_000).toFixed(0)}K`}
                </span>
              )}
              {props.deadline && (
                <DeadlineCountdown deadline={props.deadline} />
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-xs text-brand-teal hover:underline"
        >
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          Why this matches
        </button>

        {expanded && (
          <WhyMatches
            criteria={props.matchCriteria ?? []}
            missingRequirements={props.missingRequirements}
          />
        )}

        {props.uploadedDocs && (
          <div className="mt-3">
            <GrantReadinessBadge
              sourceType={props.sourceType}
              uploadedDocs={props.uploadedDocs}
              showMissing
            />
          </div>
        )}

        {saveError && (
          <p className="mt-2 text-xs text-red-500">{saveError}</p>
        )}

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleSaveToPipeline}
            disabled={saving || saved}
          >
            {saved ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" /> Saved
              </span>
            ) : saving ? (
              "Saving..."
            ) : (
              "Save to Pipeline"
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/grants/${props.id}/evaluate`}>Evaluate</Link>}
          />
          <Button
            size="sm"
            className="flex-1 bg-brand-teal hover:bg-brand-teal-dark text-white"
            render={<Link href={`/grants/${props.id}`}>View Details</Link>}
          />
        </div>
      </CardContent>
    </Card>
  );
}
