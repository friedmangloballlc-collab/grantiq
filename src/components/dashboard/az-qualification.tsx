"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Circle, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AZCriterion, AZScoreResult, CriterionStatus } from "@/lib/qualification/az-score";

// ─── Status configuration ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CriterionStatus, {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  label: string;
}> = {
  qualified: {
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/40",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    label: "Qualified",
  },
  partial: {
    icon: AlertCircle,
    iconColor: "text-amber-500",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-700 dark:text-amber-300",
    label: "Partial",
  },
  not_met: {
    icon: XCircle,
    iconColor: "text-red-500",
    badgeBg: "bg-red-100 dark:bg-red-900/40",
    badgeText: "text-red-700 dark:text-red-300",
    label: "Not Met",
  },
  unknown: {
    icon: Circle,
    iconColor: "text-warm-400",
    badgeBg: "bg-warm-100 dark:bg-warm-800/40",
    badgeText: "text-warm-500 dark:text-warm-400",
    label: "Unknown",
  },
};

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const gap = circumference - progress;

  const ringColor =
    score >= 70 ? "#10b981" : // emerald
    score >= 40 ? "#f59e0b" : // amber
    "#ef4444"; // red

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        {/* Track */}
        <circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-warm-200 dark:text-warm-700"
        />
        {/* Progress */}
        <circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${gap}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-warm-900 dark:text-warm-50 leading-none">{score}</span>
        <span className="text-xs text-warm-500 leading-tight mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ─── Criterion Row ────────────────────────────────────────────────────────────

function CriterionRow({ criterion }: { criterion: AZCriterion }) {
  const config = STATUS_CONFIG[criterion.status];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-warm-100 dark:border-warm-800 last:border-0">
      {/* Letter badge */}
      <div className={cn("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", config.badgeBg, config.badgeText)}>
        {criterion.letter}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-warm-900 dark:text-warm-100">{criterion.name}</span>
          <Icon className={cn("h-4 w-4 flex-shrink-0", config.iconColor)} />
        </div>
        <p className="text-xs text-warm-500 mt-0.5 leading-snug">{criterion.explanation}</p>
        {criterion.status !== "qualified" && criterion.improvementAction && (
          <a
            href={criterion.improvementHref}
            className="inline-flex items-center gap-1 text-xs text-brand-teal hover:underline mt-1"
          >
            {criterion.improvementAction}
            <ArrowRight className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Status label (desktop) */}
      <span className={cn("hidden sm:inline-flex flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full", config.badgeBg, config.badgeText)}>
        {config.label}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AZQualificationProps {
  result: AZScoreResult;
}

export function AZQualification({ result }: AZQualificationProps) {
  const [expanded, setExpanded] = useState(false);

  const { criteria, overallScore } = result;

  const qualifiedCount = criteria.filter((c) => c.status === "qualified").length;
  const notMetCount = criteria.filter((c) => c.status === "not_met").length;
  const unknownCount = criteria.filter((c) => c.status === "unknown").length;

  const scoreLabel =
    overallScore >= 70 ? "Strong" :
    overallScore >= 40 ? "Developing" :
    "Needs Work";

  const scoreDescription =
    overallScore >= 70
      ? "Your organization meets most qualification criteria. You're well-positioned to pursue grants."
      : overallScore >= 40
      ? "You meet some criteria. Addressing the gaps below will significantly improve your grant outcomes."
      : "Several key criteria are unmet. Work through the actions below to build grant readiness.";

  // Show first 4 collapsed, all when expanded
  const visibleCriteria = expanded ? criteria : criteria.slice(0, 4);

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50">
              A-Z Qualification Score
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-warm-500">
              Grant Services Playbook — 10-criteria readiness framework
            </CardDescription>
          </div>
          <ScoreRing score={overallScore} />
        </div>

        {/* Score summary row */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className={cn(
            "text-sm font-semibold",
            overallScore >= 70 ? "text-emerald-600 dark:text-emerald-400" :
            overallScore >= 40 ? "text-amber-600 dark:text-amber-400" :
            "text-red-600 dark:text-red-400"
          )}>
            {scoreLabel}
          </span>
          <span className="text-xs text-warm-500">{scoreDescription}</span>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 mt-3 text-xs text-warm-600 dark:text-warm-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {qualifiedCount} qualified
          </span>
          {notMetCount > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              {notMetCount} not met
            </span>
          )}
          {unknownCount > 0 && (
            <span className="flex items-center gap-1">
              <Circle className="h-3.5 w-3.5 text-warm-400" />
              {unknownCount} unknown
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="divide-y divide-warm-100 dark:divide-warm-800">
          {visibleCriteria.map((criterion) => (
            <CriterionRow key={criterion.letter} criterion={criterion} />
          ))}
        </div>

        {/* Expand / Collapse */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-warm-500 hover:text-warm-700 dark:hover:text-warm-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show all {criteria.length} criteria
            </>
          )}
        </button>

        {/* CTA */}
        {(notMetCount > 0 || unknownCount > 0) && (
          <div className="mt-4 pt-4 border-t border-warm-100 dark:border-warm-800 flex items-center justify-between gap-3">
            <p className="text-xs text-warm-500">
              Complete your profile to improve your qualification score and unlock better grant matches.
            </p>
            <Button
              size="sm"
              className="shrink-0 bg-brand-teal hover:bg-brand-teal-dark text-white text-xs"
              render={<a href="/onboarding">Improve Score</a>}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
