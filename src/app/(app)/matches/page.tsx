import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MatchCard } from "@/components/grants/match-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ShareMatchCard } from "@/components/shared/share-match-card";
import { InvitePrompt } from "@/components/shared/invite-prompt";
import { MatchFilters, type MatchItem } from "@/components/matches/match-filters";
import type { UploadedDocument } from "@/components/vault/document-checklist";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Free tier: show top 5, blur the rest
const FREE_MATCH_LIMIT = 5;

export default async function MatchesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-6xl px-4 md:px-6 py-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Grant Matches</h1>
        <EmptyState
          title="Not signed in"
          description="Please sign in to view your grant matches."
          actionLabel="Sign In"
          actionHref="/login"
        />
      </div>
    );
  }

  const db = createAdminClient();

  const { data: membership } = await db
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();

  const orgId = membership?.org_id;

  if (!orgId) {
    return (
      <div className="max-w-6xl px-4 md:px-6 py-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Grant Matches</h1>
        <EmptyState
          title="No organization found"
          description="Complete your profile setup to start seeing grant matches."
          actionLabel="Complete Profile"
          actionHref="/onboarding"
        />
      </div>
    );
  }

  // Fetch subscription tier
  const { data: sub } = await db
    .from("subscriptions")
    .select("tier")
    .eq("org_id", orgId)
    .single();
  const tier = (sub?.tier ?? "free") as string;

  const [{ data: matches }, { data: vaultRows }, { data: orgRow }, { data: referralRows }] = await Promise.all([
    db
      .from("grant_matches")
      .select(
        "id, grant_source_id, match_score, score_breakdown, missing_requirements, grant_sources(name, funder_name, source_type, amount_max, deadline)"
      )
      .eq("org_id", orgId)
      .order("match_score", { ascending: false })
      .limit(50),

    db
      .from("document_vault")
      .select("id, document_type, original_filename, file_url, file_size, created_at")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),

    db
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single(),

    db
      .from("referrals")
      .select("code")
      .eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  // Deduplicate vault docs by type — keep most recent per type
  const seenVaultTypes = new Set<string>();
  const uploadedDocs: UploadedDocument[] = [];
  for (const row of (vaultRows ?? []) as {
    id: string;
    document_type: string;
    original_filename: string;
    file_url: string;
    file_size: number;
    created_at: string;
  }[]) {
    if (!seenVaultTypes.has(row.document_type)) {
      seenVaultTypes.add(row.document_type);
      uploadedDocs.push({
        id: row.id,
        docType: row.document_type,
        filename: row.original_filename,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        uploadedAt: row.created_at,
      });
    }
  }

  if (!matches?.length) {
    return (
      <div className="max-w-6xl px-4 md:px-6 py-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Grant Matches
        </h1>
        <EmptyState
          title="No matches yet"
          description="Your matches are being generated. Try refreshing in a moment, or go to your dashboard."
          actionLabel="Go to Dashboard"
          actionHref="/dashboard"
        />
      </div>
    );
  }

  const isFree = tier === "free";
  const visibleMatches = isFree ? matches.slice(0, FREE_MATCH_LIMIT) : matches;
  const lockedMatches = isFree ? matches.slice(FREE_MATCH_LIMIT) : [];

  const orgName = (orgRow as { name?: string } | null)?.name ?? "Your Organization";
  const referralCode = (referralRows?.[0] as { code?: string } | undefined)?.code ?? "";

  // Compute total potential value from visible matches
  const typedVisible = visibleMatches as unknown as MatchItem[];
  const typedLocked = lockedMatches as unknown as MatchItem[];

  const totalValue = typedVisible.reduce((sum, m) => {
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
        <ShareMatchCard
          matchCount={visibleMatches.length}
          totalValue={totalValue}
          orgName={orgName}
          referralCode={referralCode}
        />
      </div>

      {referralCode && (
        <div className="mb-5">
          <InvitePrompt
            variant="first_match"
            referralCode={referralCode}
            storageKey="invite-prompt-first-match"
          />
        </div>
      )}

      <MatchFilters matches={typedVisible}>
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
                matchScore={Math.round(match.match_score)}
                scoreBreakdown={match.score_breakdown ?? {}}
                missingRequirements={match.missing_requirements ?? []}
                uploadedDocs={uploadedDocs}
              />
            ))}
          </div>
        )}
      </MatchFilters>

      {/* Locked matches — blurred upgrade wall */}
      {lockedMatches.length > 0 && (
        <div className="relative mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 blur-sm pointer-events-none select-none">
            {typedLocked.map((match) => (
              <MatchCard
                key={match.id}
                id={match.grant_source_id}
                grantName={match.grant_sources?.name ?? "Unknown Grant"}
                funderName={match.grant_sources?.funder_name ?? "Unknown Funder"}
                sourceType={match.grant_sources?.source_type ?? "federal"}
                amountMax={match.grant_sources?.amount_max ?? null}
                deadline={match.grant_sources?.deadline ?? null}
                matchScore={Math.round(match.match_score)}
                scoreBreakdown={match.score_breakdown ?? {}}
                missingRequirements={match.missing_requirements ?? []}
                uploadedDocs={uploadedDocs}
              />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-warm-900/80 rounded-xl">
            <div className="text-center p-8 space-y-3">
              <p className="text-lg font-semibold text-warm-900 dark:text-warm-50">
                {lockedMatches.length} more matches available
              </p>
              <p className="text-sm text-warm-500 max-w-xs">
                Upgrade to Starter or higher to see all your grant matches.
              </p>
              <Button
                className="bg-[var(--color-brand-teal)] text-white"
                render={<Link href="/upgrade">Upgrade Now</Link>}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
