import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { FundersDirectoryClient } from "@/components/funders/funders-directory-client";

export const metadata = {
  title: "Funder Directory — GrantIQ",
};

export default async function FundersPage() {
  const ctx = await getOrgContext();
  const db = createAdminClient();

  // Fetch all unique funders with aggregate stats from grant_sources
  const { data: funderRows } = await db
    .from("grant_sources")
    .select("funder_name, source_type, amount_max, category, id");

  // Aggregate by funder name
  const funderMap = new Map<
    string,
    {
      type: string;
      grantCount: number;
      totalMax: number;
      maxCount: number;
      topCategory: string | null;
      grantIds: string[];
    }
  >();

  for (const row of funderRows ?? []) {
    if (!row.funder_name) continue;
    const name = row.funder_name as string;
    if (!funderMap.has(name)) {
      funderMap.set(name, {
        type: (row.source_type as string) ?? "federal",
        grantCount: 0,
        totalMax: 0,
        maxCount: 0,
        topCategory: (row.category as string | null) ?? null,
        grantIds: [],
      });
    }
    const entry = funderMap.get(name)!;
    entry.grantCount += 1;
    entry.grantIds.push(String(row.id));
    if (row.amount_max) {
      entry.totalMax += row.amount_max as number;
      entry.maxCount += 1;
    }
    if (!entry.topCategory && row.category) {
      entry.topCategory = row.category as string;
    }
  }

  // Fetch org match scores if authenticated
  let matchScoreMap: Map<string, { totalScore: number; count: number }> =
    new Map();
  if (ctx?.orgId) {
    const { data: matchRows } = await db
      .from("grant_matches")
      .select("match_score, grant_sources(funder_name)")
      .eq("org_id", ctx.orgId);

    for (const m of matchRows ?? []) {
      const gs = m.grant_sources as { funder_name?: string } | null;
      if (!gs?.funder_name) continue;
      const name = gs.funder_name;
      if (!matchScoreMap.has(name)) {
        matchScoreMap.set(name, { totalScore: 0, count: 0 });
      }
      const entry = matchScoreMap.get(name)!;
      entry.totalScore += m.match_score ?? 0;
      entry.count += 1;
    }
  }

  const funders = [...funderMap.entries()].map(([name, data]) => {
    const avgAward =
      data.maxCount > 0 ? Math.round(data.totalMax / data.maxCount) : 0;
    const scoreEntry = matchScoreMap.get(name);
    const avgMatchScore = scoreEntry
      ? Math.round(scoreEntry.totalScore / scoreEntry.count)
      : null;
    const rawType = data.type.toLowerCase();
    const type = (
      ["federal", "state", "foundation", "corporate"].includes(rawType)
        ? rawType
        : "federal"
    ) as "federal" | "state" | "foundation" | "corporate";

    return {
      name,
      type,
      grantCount: data.grantCount,
      averageAward: avgAward,
      topFocusArea: data.topCategory,
      avgMatchScore,
    };
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Funder Directory
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          {funders.length} funders indexed — browse by type, match score, and
          funding volume.
        </p>
      </div>

      <FundersDirectoryClient funders={funders} hasMatchData={!!ctx?.orgId} />
    </div>
  );
}
