"use client";

import { useMemo } from "react";
import { MatchCard } from "@/components/grants/match-card";
import { MatchFilters, type MatchItem } from "@/components/matches/match-filters";
import { ShareMatchCard } from "@/components/shared/share-match-card";
import { computeMatchCriteria } from "@/lib/matching/match-criteria";
import { RefreshMatchesButton } from "@/components/matches/refresh-matches-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UploadedDocument {
  id: string;
  docType: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

interface OrgContext {
  entity_type?: string | null;
  state?: string | null;
  city?: string | null;
  naics_primary?: string | null;
  sam_registration_status?: string | null;
  federal_certifications?: string[] | null;
  match_funds_capacity?: string | null;
  funding_amount_min?: number | null;
  funding_amount_max?: number | null;
  industry?: string | null;
  annual_budget?: number | null;
}

interface MatchesDisplayProps {
  matches: MatchItem[];
  tier: string;
  orgId: string;
  orgName: string;
  referralCode: string;
  uploadedDocs: UploadedDocument[];
  orgContext: OrgContext;
}

const FREE_MATCH_LIMIT = 5;

export function MatchesDisplay({
  matches,
  tier,
  orgId,
  orgName,
  referralCode,
  uploadedDocs,
  orgContext,
}: MatchesDisplayProps) {
  // Debug: log first match to see data shape
  if (typeof window !== "undefined" && matches.length > 0) {
    console.log("First match data:", JSON.stringify(matches[0], null, 2));
  }

  const isFree = tier === "free";
  const visibleMatches = isFree ? matches.slice(0, FREE_MATCH_LIMIT) : matches;
  const lockedMatches = isFree ? matches.slice(FREE_MATCH_LIMIT) : [];

  const totalValue = visibleMatches.reduce((sum, m) => {
    return sum + (m.grant_sources?.amount_max ?? 0);
  }, 0);

  return (
    <div className="max-w-6xl px-4 md:px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
            Grant Matches
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            {matches.length} grants matched to your profile
            {isFree && matches.length > FREE_MATCH_LIMIT && (
              <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
                — showing top {FREE_MATCH_LIMIT} on Free plan
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshMatchesButton orgId={orgId} />
          <ShareMatchCard
            matchCount={visibleMatches.length}
            totalValue={totalValue}
            orgName={orgName}
            referralCode={referralCode}
          />
        </div>
      </div>

      <MatchFilters matches={visibleMatches}>
        {(filtered) => (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((match) => (
              <MatchCard
                key={match.id}
                id={match.grant_source_id}
                grantName={match.grant_sources?.name ?? "Unknown Grant"}
                funderName={match.grant_sources?.funder_name ?? "Unknown Funder"}
                sourceType={match.grant_sources?.source_type ?? "federal"}
                amountMax={match.grant_sources?.amount_max ?? null}
                deadline={match.grant_sources?.deadline ?? null}
                matchScore={Math.round(Number(match.match_score) || 0)}
                scoreBreakdown={{}}
                missingRequirements={[]}
                matchCriteria={[]}
                uploadedDocs={uploadedDocs}
              />
            ))}
          </div>
        )}
      </MatchFilters>

      {lockedMatches.length > 0 && (
        <div className="relative mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 blur-sm pointer-events-none select-none">
            {lockedMatches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.grant_source_id}
                grantName={match.grant_sources?.name ?? "Unknown Grant"}
                funderName={match.grant_sources?.funder_name ?? "Unknown Funder"}
                sourceType={match.grant_sources?.source_type ?? "federal"}
                amountMax={match.grant_sources?.amount_max ?? null}
                deadline={match.grant_sources?.deadline ?? null}
                matchScore={Math.round(Number(match.match_score) || 0)}
                scoreBreakdown={match.score_breakdown ?? {}}
                missingRequirements={match.missing_requirements ?? []}
                matchCriteria={[]}
                uploadedDocs={uploadedDocs}
              />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-warm-900/80 rounded-xl">
            <div className="text-center p-4 sm:p-8 space-y-3">
              <p className="text-lg font-semibold text-warm-900 dark:text-warm-50">
                {lockedMatches.length} more matches available
              </p>
              <p className="text-sm text-warm-500">
                Upgrade to see all your grant matches
              </p>
              <Link href="/upgrade">
                <Button className="bg-brand-teal hover:bg-brand-teal-dark text-white">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
