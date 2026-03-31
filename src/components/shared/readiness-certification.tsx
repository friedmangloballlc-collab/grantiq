"use client";

import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CertTier = "none" | "bronze" | "silver" | "gold";

export interface CertCriteria {
  /** Profile has been completed */
  profileComplete: boolean;
  /** At least 1 match has been reviewed */
  matchesReviewed: boolean;
  /** At least 5 matches reviewed */
  fiveMatchesReviewed: boolean;
  /** At least 1 grant in pipeline */
  hasActivePipeline: boolean;
  /** All core documents uploaded */
  coreDocsUploaded: boolean;
  /** SAM.gov registration verified */
  samVerified: boolean;
  /** Full scorecard is green (9/9) */
  scorecardAllGreen: boolean;
  /** At least 1 application submitted */
  applicationSubmitted: boolean;
}

// ─── Tier logic ───────────────────────────────────────────────────────────────

export function computeCertTier(c: CertCriteria): CertTier {
  if (c.scorecardAllGreen && c.applicationSubmitted) return "gold";
  if (
    c.fiveMatchesReviewed &&
    c.hasActivePipeline &&
    c.coreDocsUploaded &&
    c.samVerified
  )
    return "silver";
  if (c.profileComplete && c.matchesReviewed) return "bronze";
  return "none";
}

// ─── Badge icons (SVG, inline) ────────────────────────────────────────────────

function BronzeBadge({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-label="Bronze — Grant Aware"
    >
      <circle cx="20" cy="20" r="18" fill="#CD7F32" opacity="0.15" stroke="#CD7F32" strokeWidth="2" />
      <circle cx="20" cy="20" r="13" fill="#CD7F32" opacity="0.25" />
      <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#A0522D">B</text>
    </svg>
  );
}

function SilverBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Silver — Grant Prepared">
      <path
        d="M20 4 L26 10 L34 10 L34 18 L38 24 L34 30 L34 36 L26 36 L20 40 L14 36 L6 36 L6 30 L2 24 L6 18 L6 10 L14 10 Z"
        fill="#C0C0C0"
        opacity="0.25"
        stroke="#A9A9A9"
        strokeWidth="1.5"
      />
      <text x="20" y="27" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#808080">S</text>
    </svg>
  );
}

function GoldBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Gold — Grant Ready">
      {/* Star */}
      <polygon
        points="20,4 24.5,15 37,15 27,22.5 31,34 20,27 9,34 13,22.5 3,15 15.5,15"
        fill="#F59E0B"
        opacity="0.3"
        stroke="#D97706"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text x="20" y="27" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#B45309">G</text>
    </svg>
  );
}

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  bronze: {
    label: "Grant Aware",
    tier: "Bronze",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    Badge: BronzeBadge,
    description: "Profile complete with first match reviewed.",
  },
  silver: {
    label: "Grant Prepared",
    tier: "Silver",
    color: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700",
    Badge: SilverBadge,
    description: "5+ matches reviewed, pipeline started, docs uploaded, SAM verified.",
  },
  gold: {
    label: "Grant Ready",
    tier: "Gold",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-700",
    Badge: GoldBadge,
    description: "Full scorecard green and first application submitted.",
  },
};

// ─── Progress toward next tier ────────────────────────────────────────────────

interface NextTierProgress {
  nextTier: Exclude<CertTier, "none">;
  steps: { label: string; done: boolean }[];
}

function getProgressToNextTier(c: CertCriteria, current: CertTier): NextTierProgress | null {
  if (current === "gold") return null;

  if (current === "none" || current === "bronze") {
    return {
      nextTier: "silver",
      steps: [
        { label: "Complete profile", done: c.profileComplete },
        { label: "Review 1 match", done: c.matchesReviewed },
        { label: "Review 5 matches", done: c.fiveMatchesReviewed },
        { label: "Add grant to pipeline", done: c.hasActivePipeline },
        { label: "Upload core documents", done: c.coreDocsUploaded },
        { label: "Verify SAM registration", done: c.samVerified },
      ],
    };
  }

  // silver → gold
  return {
    nextTier: "gold",
    steps: [
      { label: "All scorecard criteria green (9/9)", done: c.scorecardAllGreen },
      { label: "Submit at least 1 application", done: c.applicationSubmitted },
    ],
  };
}

// ─── Components ───────────────────────────────────────────────────────────────

/** Compact badge for sidebar footer */
export function ReadinessBadgeMini({ criteria }: { criteria: CertCriteria }) {
  const tier = computeCertTier(criteria);
  if (tier === "none") return null;

  const config = TIER_CONFIG[tier];
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", config.bg)}>
      <config.Badge size={28} />
      <div className="min-w-0">
        <p className={cn("text-xs font-semibold leading-tight", config.color)}>
          {config.tier}
        </p>
        <p className="text-xs text-muted-foreground truncate">{config.label}</p>
      </div>
    </div>
  );
}

/** Full dashboard card with progress to next tier */
export function ReadinessCertificationCard({ criteria }: { criteria: CertCriteria }) {
  const tier = computeCertTier(criteria);
  const progress = tier !== "gold" ? getProgressToNextTier(criteria, tier) : null;

  const hasTier = tier !== "none";
  const config = hasTier ? TIER_CONFIG[tier] : null;
  const nextConfig = progress ? TIER_CONFIG[progress.nextTier] : null;
  const doneCount = progress?.steps.filter((s) => s.done).length ?? 0;
  const totalCount = progress?.steps.length ?? 0;

  return (
    <div className="rounded-xl border border-warm-200 dark:border-warm-800 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50">
          Grant Readiness Certification
        </h3>
        {hasTier && config && (
          <div className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1", config.bg)}>
            <config.Badge size={20} />
            <span className={cn("text-xs font-bold", config.color)}>{config.tier} — {config.label}</span>
          </div>
        )}
      </div>

      {!hasTier && (
        <p className="text-sm text-muted-foreground">
          Complete your profile and review your first match to earn your Bronze certification.
        </p>
      )}

      {progress && nextConfig && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress to {nextConfig.tier} — {nextConfig.label}</span>
            <span className="font-medium">
              {doneCount}/{totalCount}
            </span>
          </div>
          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full bg-warm-100 dark:bg-warm-800 overflow-hidden"
            role="progressbar"
            aria-valuenow={totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress to ${nextConfig.tier}: ${doneCount} of ${totalCount} steps complete`}
          >
            <div
              className="h-full rounded-full bg-[var(--color-brand-teal)] transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <ul className="space-y-1.5">
            {progress.steps.map((step) => (
              <li key={step.label} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                    step.done
                      ? "border-[var(--color-brand-teal)] bg-[var(--color-brand-teal)]"
                      : "border-warm-300 dark:border-warm-600"
                  )}
                >
                  {step.done && (
                    <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={step.done ? "line-through text-muted-foreground" : "text-warm-700 dark:text-warm-300"}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tier === "gold" && (
        <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
          You&apos;ve achieved the highest certification — Grant Ready! 🏆
        </p>
      )}
    </div>
  );
}
