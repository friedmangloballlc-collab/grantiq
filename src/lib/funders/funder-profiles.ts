import type { SupabaseClient } from "@supabase/supabase-js";

export interface FunderProfile {
  name: string;
  type: "federal" | "state" | "foundation" | "corporate";
  grantCount: number;
  totalFunding: { min: number; max: number };
  averageAward: number;
  focusAreas: string[];
  geographicFocus: string[];
  grantsInDatabase: string[]; // grant IDs
  acceptsUnsolicited: boolean | null;
  newApplicantFriendly: boolean | null;
}

export async function buildFunderProfile(
  funderName: string,
  supabase: SupabaseClient
): Promise<FunderProfile | null> {
  const { data: grants, error } = await supabase
    .from("grant_sources")
    .select("id, source_type, amount_min, amount_max, category, states")
    .eq("funder_name", funderName);

  if (error || !grants || grants.length === 0) return null;

  const totalMin = grants.reduce(
    (sum, g) => sum + (g.amount_min ?? g.amount_max ?? 0),
    0
  );
  const totalMax = grants.reduce((sum, g) => sum + (g.amount_max ?? 0), 0);
  const awardsWithAmount = grants.filter((g) => g.amount_max);
  const averageAward =
    awardsWithAmount.length > 0
      ? awardsWithAmount.reduce((sum, g) => sum + (g.amount_max ?? 0), 0) /
        awardsWithAmount.length
      : 0;

  const focusAreas = [
    ...new Set(grants.map((g) => g.category).filter(Boolean) as string[]),
  ];

  const geographicFocus = [
    ...new Set(
      grants
        .flatMap((g) => (Array.isArray(g.states) ? g.states : []))
        .filter(Boolean) as string[]
    ),
  ];

  const rawType =
    ((grants[0]?.source_type as string) ?? "federal").toLowerCase();
  const type = (
    ["federal", "state", "foundation", "corporate"].includes(rawType)
      ? rawType
      : "federal"
  ) as FunderProfile["type"];

  return {
    name: funderName,
    type,
    grantCount: grants.length,
    totalFunding: { min: totalMin, max: totalMax },
    averageAward,
    focusAreas,
    geographicFocus,
    grantsInDatabase: grants.map((g) => String(g.id)),
    acceptsUnsolicited: null,
    newApplicantFriendly: null,
  };
}

export async function getTopFunders(
  orgId: string,
  supabase: SupabaseClient,
  limit = 10
): Promise<FunderProfile[]> {
  // Get org's matched grants with scores, joined to grant_sources for funder info
  const { data: matches } = await supabase
    .from("grant_matches")
    .select(
      "match_score, grant_sources(id, funder_name, source_type, amount_min, amount_max, category, states)"
    )
    .eq("org_id", orgId)
    .order("match_score", { ascending: false });

  if (!matches || matches.length === 0) return [];

  // Group by funder name, accumulate scores + grant IDs
  const funderMap = new Map<
    string,
    {
      scores: number[];
      grantIds: string[];
      sourceType: string;
      amountMins: number[];
      amountMaxes: number[];
      categories: string[];
      states: string[];
    }
  >();

  for (const match of matches) {
    const gs = match.grant_sources as unknown as {
      id?: string | number;
      funder_name?: string;
      source_type?: string;
      amount_min?: number | null;
      amount_max?: number | null;
      category?: string | null;
      states?: string[] | null;
    } | null;
    if (!gs?.funder_name) continue;

    const name = gs.funder_name;
    if (!funderMap.has(name)) {
      funderMap.set(name, {
        scores: [],
        grantIds: [],
        sourceType: gs.source_type ?? "federal",
        amountMins: [],
        amountMaxes: [],
        categories: [],
        states: [],
      });
    }
    const entry = funderMap.get(name)!;
    entry.scores.push(match.match_score ?? 0);
    entry.grantIds.push(String(gs.id ?? ""));
    if (gs.amount_min != null) entry.amountMins.push(gs.amount_min);
    if (gs.amount_max != null) entry.amountMaxes.push(gs.amount_max);
    if (gs.category) entry.categories.push(gs.category);
    if (Array.isArray(gs.states)) entry.states.push(...gs.states);
  }

  // Sort by average match score descending and take top N
  const sorted = [...funderMap.entries()]
    .map(([name, data]) => ({
      name,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      data,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, limit);

  return sorted.map(({ name, data }) => {
    const rawType = data.sourceType.toLowerCase();
    const type = (
      ["federal", "state", "foundation", "corporate"].includes(rawType)
        ? rawType
        : "federal"
    ) as FunderProfile["type"];

    const averageAward =
      data.amountMaxes.length > 0
        ? data.amountMaxes.reduce((a, b) => a + b, 0) / data.amountMaxes.length
        : 0;

    return {
      name,
      type,
      grantCount: data.grantIds.length,
      totalFunding: {
        min: data.amountMins.reduce((a, b) => a + b, 0),
        max: data.amountMaxes.reduce((a, b) => a + b, 0),
      },
      averageAward,
      focusAreas: [...new Set(data.categories)],
      geographicFocus: [...new Set(data.states)],
      grantsInDatabase: [...new Set(data.grantIds)],
      acceptsUnsolicited: null,
      newApplicantFriendly: null,
    };
  });
}
