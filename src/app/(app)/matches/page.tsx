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

  const results = await Promise.all([
    db
      .from("grant_matches")
      .select(
        "id, grant_source_id, match_score, grant_sources(name, funder_name, source_type, amount_max, deadline)"
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
      .select("name, entity_type, state, city, annual_budget")
      .eq("id", orgId)
      .single(),
    db
      .from("referrals")
      .select("code")
      .eq("referrer_org_id", orgId)
      .limit(1),
    db
      .from("org_profiles")
      .select("industry, naics_primary, funding_amount_min, funding_amount_max, sam_registration_status, federal_certifications, match_funds_capacity, target_beneficiaries")
      .eq("org_id", orgId)
      .single(),
    db
      .from("match_feedback")
      .select("grant_source_id")
      .eq("org_id", orgId)
      .eq("user_action", "dismissed"),
  ]);

  const matches = results[0]?.data;
  const vaultRows = results[1]?.data;
  const orgRow = results[2]?.data;
  const referralRows = results[3]?.data;
  const orgProfile = results[4]?.data;
  const dismissedRows = results[5]?.data;

  // Filter out dismissed grants
  const dismissedIds = new Set(
    (dismissedRows ?? []).map((d: { grant_source_id: string }) => d.grant_source_id)
  );
  const filteredMatches = (matches ?? []).filter(
    (m: { grant_source_id: string }) => !dismissedIds.has(m.grant_source_id)
  );

  if (!filteredMatches?.length) {
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
  // orgRow and orgProfile already destructured below in orgContext
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

  const org = orgRow as { name?: string; entity_type?: string; state?: string; city?: string; annual_budget?: number } | null;
  const profile = orgProfile as { industry?: string; naics_primary?: string; funding_amount_min?: number; funding_amount_max?: number; sam_registration_status?: string; federal_certifications?: string[]; match_funds_capacity?: string; target_beneficiaries?: string[] } | null;

  const orgContext = {
    entity_type: org?.entity_type ?? null,
    state: org?.state ?? null,
    city: org?.city ?? null,
    annual_budget: org?.annual_budget ?? null,
    industry: profile?.industry ?? null,
    naics_primary: profile?.naics_primary ?? null,
    funding_amount_min: profile?.funding_amount_min ?? null,
    funding_amount_max: profile?.funding_amount_max ?? null,
    sam_registration_status: profile?.sam_registration_status ?? null,
    federal_certifications: profile?.federal_certifications ?? null,
    match_funds_capacity: profile?.match_funds_capacity ?? null,
    target_beneficiaries: profile?.target_beneficiaries ?? null,
  };

  return (
    <MatchesDisplay
      matches={filteredMatches as unknown as MatchItem[]}
      tier={tier}
      orgId={orgId}
      orgName={orgName}
      referralCode={referralCode}
      uploadedDocs={uploadedDocs}
      orgContext={orgContext}
    />
  );
}
