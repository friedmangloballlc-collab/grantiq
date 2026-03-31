"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import type {
  ScorecardResult,
  ScorecardCriterion,
} from "@/lib/qualification/grant-scorecard";
import { applyUserScores } from "@/lib/qualification/grant-scorecard";

// ─── Priority badge ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  low: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  do_not_pursue: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
  do_not_pursue: "Do Not Pursue",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",
        PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low
      )}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

// ─── Score dot ─────────────────────────────────────────────────────────────────

function ScoreDot({ score, max = 5 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color =
    pct >= 80
      ? "bg-green-500"
      : pct >= 60
      ? "bg-yellow-500"
      : pct >= 40
      ? "bg-orange-500"
      : "bg-red-400";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold",
        color
      )}
    >
      {score}
    </span>
  );
}

// ─── Slider input ──────────────────────────────────────────────────────────────

function ScoreSlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-4">1</span>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value ?? 3}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 accent-[var(--color-brand-teal)]"
      />
      <span className="text-xs text-muted-foreground w-4">5</span>
      {value !== null && (
        <ScoreDot score={value} />
      )}
    </div>
  );
}

// ─── Criterion row ─────────────────────────────────────────────────────────────

function CriterionRow({
  criterion,
  onUserScore,
}: {
  criterion: ScorecardCriterion;
  onUserScore: (id: string, score: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isUserRequired = criterion.source === "user_provided";
  const isAiFilled = criterion.aiScore !== null;

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Name + weight */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium text-sm">{criterion.name}</span>
          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
            ×{criterion.weight}
          </span>
          {isAiFilled && !isUserRequired && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded">
              <Bot className="h-3 w-3" /> AI
            </span>
          )}
          {isUserRequired && (
            <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-1.5 py-0.5 rounded">
              <User className="h-3 w-3" /> You
            </span>
          )}
          {criterion.userScore !== null && !isUserRequired && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded">
              <User className="h-3 w-3" /> Overridden
            </span>
          )}
        </div>

        {/* Score display / input */}
        <div className="flex items-center gap-3">
          {isUserRequired || criterion.userScore !== null ? (
            <ScoreSlider
              value={criterion.userScore ?? criterion.aiScore}
              onChange={(v) => onUserScore(criterion.id, v)}
            />
          ) : (
            <div className="flex items-center gap-2">
              {criterion.aiScore !== null && (
                <ScoreDot score={criterion.aiScore} />
              )}
              {/* Allow AI-scored criteria to be overridden too */}
              <button
                onClick={() =>
                  onUserScore(
                    criterion.id,
                    criterion.aiScore ?? 3
                  )
                }
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Override
              </button>
            </div>
          )}

          {/* Weighted contribution */}
          <span className="text-xs text-muted-foreground w-12 text-right">
            {criterion.finalScore > 0
              ? `${criterion.finalScore * criterion.weight} pts`
              : "—"}
          </span>
        </div>
      </div>

      {/* Evidence — expandable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {expanded ? "Hide reasoning" : "Why this score?"}
      </button>

      {expanded && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
          {criterion.evidence}
        </p>
      )}
    </div>
  );
}

// ─── Main Scorecard component ─────────────────────────────────────────────────

interface ScorecardProps {
  initialResult: ScorecardResult;
  grantName: string;
}

export function Scorecard({ initialResult, grantName }: ScorecardProps) {
  const router = useRouter();
  const [result, setResult] = useState<ScorecardResult>(initialResult);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleUserScore(id: string, score: number) {
    const userScores: Record<string, number> = {};
    result.criteria.forEach((c) => {
      if (c.userScore !== null) userScores[c.id] = c.userScore;
    });
    userScores[id] = score;
    setResult(applyUserScores(result, userScores));
    setSaved(false);
  }

  async function handleSave(action: "pipeline" | "watchlist" | "skip") {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_source_id: result.grantId,
          org_id: result.orgId,
          criteria: result.criteria,
          total_score: result.totalWeightedScore,
          priority: result.priority,
          auto_disqualified: result.autoDisqualified,
          disqualify_reason: result.disqualifyReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save scorecard");
      }

      if (action === "pipeline") {
        await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grant_source_id: result.grantId }),
        });
        router.push("/pipeline");
        return;
      }

      setSaved(true);

      if (action === "skip") {
        router.push("/grants");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // ─── Pre-screen fail state ───────────────────────────────────────────────

  if (result.autoDisqualified) {
    return (
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <XCircle className="h-5 w-5" />
            <CardTitle className="text-base">Pre-Screen Failed</CardTitle>
          </div>
          <CardDescription>{result.disqualifyReason}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This grant did not pass the automatic qualification check. Pursuing
            it would be a poor use of your resources.
          </p>
          <Button variant="outline" render={<Link href="/grants">Back to Grants</Link>} />
        </CardContent>
      </Card>
    );
  }

  // ─── User score completion check ────────────────────────────────────────

  const userRequired = result.criteria.filter(
    (c) => c.source === "user_provided"
  );
  const userFilled = userRequired.filter((c) => c.userScore !== null);
  const allUserFilled = userFilled.length === userRequired.length;

  const maxPossibleScore = result.criteria.reduce(
    (sum, c) => sum + 5 * c.weight,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Qualification Scorecard
              </p>
              <h2 className="text-xl font-bold">{grantName}</h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums">
                {result.totalWeightedScore}
                <span className="text-lg text-muted-foreground">
                  /{maxPossibleScore}
                </span>
              </div>
              <PriorityBadge priority={result.priority} />
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/40 rounded-lg">
            <p className="text-sm">{result.recommendation}</p>
          </div>

          {!allUserFilled && (
            <div className="mt-3 flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {userFilled.length}/{userRequired.length} required judgment calls
              filled. Score will update as you rate below.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criteria rows */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          9 Scoring Criteria
        </h3>
        <div className="space-y-2">
          {result.criteria.map((c) => (
            <CriterionRow
              key={c.id}
              criterion={c}
              onUserScore={handleUserScore}
            />
          ))}
        </div>
      </div>

      {/* Score breakdown */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Total Weighted Score</span>
            <span className="text-xl font-bold tabular-nums">
              {result.totalWeightedScore}/{maxPossibleScore}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                result.priority === "high"
                  ? "bg-green-500"
                  : result.priority === "medium"
                  ? "bg-yellow-500"
                  : result.priority === "low"
                  ? "bg-orange-500"
                  : "bg-red-400"
              )}
              style={{
                width: `${(result.totalWeightedScore / maxPossibleScore) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Do Not Pursue (&lt;34)</span>
            <span>Low (34-50)</span>
            <span>Medium (51-67)</span>
            <span>High (68+)</span>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="sticky bottom-4 bg-background/95 backdrop-blur border border-border rounded-xl p-4 shadow-lg">
        {saveError && (
          <p className="text-xs text-destructive mb-2">{saveError}</p>
        )}
        {saved && (
          <p className="text-xs text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Scorecard saved.
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button
            className="flex-1 bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/90 text-white"
            disabled={saving || result.priority === "do_not_pursue"}
            onClick={() => handleSave("pipeline")}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add to Pipeline"
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={saving}
            onClick={() => handleSave("watchlist")}
          >
            Track for Later
          </Button>
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => handleSave("skip")}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
