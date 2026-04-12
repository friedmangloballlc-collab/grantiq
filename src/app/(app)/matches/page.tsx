import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState } from "@/components/shared/empty-state";
import { MatchesDisplay } from "@/components/matches/matches-display";
import type { MatchItem } from "@/components/matches/match-filters";

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
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single(),
    db
      .from("referrals")
      .select("code")
      .eq("referrer_org_id", orgId)
      .limit(1),
  ]);

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

  const orgName = (orgRow as { name?: string } | null)?.name ?? "Your Organization";
  const referralCode = (referralRows?.[0] as { code?: string } | undefined)?.code ?? "";

  // Deduplicate vault docs by type
  const seenVaultTypes = new Set<string>();
  const uploadedDocs: { id: string; docType: string; filename: string; fileUrl: string; fileSize: number; uploadedAt: string }[] = [];
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

  return (
    <MatchesDisplay
      matches={matches as unknown as MatchItem[]}
      tier={tier}
      orgName={orgName}
      referralCode={referralCode}
      uploadedDocs={uploadedDocs}
    />
  );
}
