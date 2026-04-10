import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/get-org-context";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, TrendingUp, MapPin, Tag, ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ name: string }>;
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

function formatAmount(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default async function FunderDetailPage({ params }: Props) {
  const { name } = await params;
  const funderName = decodeURIComponent(name);

  const db = createAdminClient();
  const ctx = await getOrgContext();

  // Fetch all grants from this funder
  const { data: grants } = await db
    .from("grant_sources")
    .select(
      "id, name, source_type, amount_min, amount_max, category, states, deadline, description"
    )
    .eq("funder_name", funderName);

  if (!grants || grants.length === 0) notFound();

  // Aggregate profile data
  const grantIds = grants.map((g) => String(g.id));
  const focusAreas = [
    ...new Set(grants.map((g) => g.category).filter(Boolean) as string[]),
  ];
  const allStates = [
    ...new Set(
      grants
        .flatMap((g) => (Array.isArray(g.states) ? g.states : []))
        .filter(Boolean) as string[]
    ),
  ];
  const awardsWithAmount = grants.filter((g) => g.amount_max);
  const averageAward =
    awardsWithAmount.length > 0
      ? awardsWithAmount.reduce((sum, g) => sum + (g.amount_max as number), 0) /
        awardsWithAmount.length
      : 0;
  const totalFunding = grants.reduce(
    (sum, g) => sum + ((g.amount_max as number) ?? 0),
    0
  );

  const rawType = ((grants[0]?.source_type as string) ?? "federal").toLowerCase();
  const funderType = (
    ["federal", "state", "foundation", "corporate"].includes(rawType)
      ? rawType
      : "federal"
  ) as "federal" | "state" | "foundation" | "corporate";

  // Fetch match scores for this org
  const matchScores: Record<string, number> = {};
  let avgMatchScore: number | null = null;
  if (ctx?.orgId) {
    const { data: matchRows } = await db
      .from("grant_matches")
      .select("grant_source_id, match_score")
      .eq("org_id", ctx.orgId)
      .in("grant_source_id", grantIds);

    if (matchRows && matchRows.length > 0) {
      for (const m of matchRows) {
        matchScores[String(m.grant_source_id)] = Math.round(m.match_score ?? 0);
      }
      const scores = matchRows.map((m) => m.match_score ?? 0);
      avgMatchScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
    }
  }

  // Generate AI strategy brief (deterministic summary from data)
  const geoText =
    allStates.length > 0
      ? allStates.length <= 3
        ? allStates.join(", ")
        : `${allStates.slice(0, 2).join(", ")} and ${allStates.length - 2} more states`
      : "nationwide";
  const strategyBrief = [
    `${funderName} has ${grants.length} grant${grants.length !== 1 ? "s" : ""} in the GrantAQ database`,
    totalFunding > 0 ? `, representing up to ${formatAmount(totalFunding)} in total available funding.` : ".",
    focusAreas.length > 0
      ? ` Their primary focus areas include ${focusAreas.slice(0, 3).join(", ")}.`
      : "",
    allStates.length > 0
      ? ` Geographic emphasis: ${geoText}.`
      : " Funding is available nationally.",
    avgMatchScore !== null
      ? ` Your organization scores an average of ${avgMatchScore}% match across their grants — ${avgMatchScore >= 70 ? "a strong alignment worth prioritizing" : avgMatchScore >= 50 ? "moderate alignment with room to strengthen your profile" : "limited current alignment — review eligibility criteria"}.`
      : ` Evaluate their grants individually to see how your profile aligns.`,
  ].join("");

  const badgeClass =
    TYPE_COLORS[funderType] ??
    "bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300";

  // Sort grants: matched first (by score), then unmatched alphabetically
  const sortedGrants = [...grants].sort((a, b) => {
    const scoreA = matchScores[String(a.id)] ?? -1;
    const scoreB = matchScores[String(b.id)] ?? -1;
    return scoreB - scoreA;
  });

  return (
    <div className="max-w-4xl px-4 md:px-6 py-6 space-y-8">
      {/* Header */}
      <div>
        <nav className="text-xs text-warm-400 mb-3">
          <Link href="/funders" className="hover:text-warm-600 transition-colors">
            Funder Directory
          </Link>
          <span className="mx-1">/</span>
          <span className="text-warm-600 dark:text-warm-300">{funderName}</span>
        </nav>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warm-100 dark:bg-warm-800 shrink-0">
            <Building2 className="h-6 w-6 text-warm-500" />
          </div>
          <div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-1 ${badgeClass}`}
            >
              {funderType.charAt(0).toUpperCase() + funderType.slice(1)}
            </span>
            <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
              {funderName}
            </h1>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-warm-200 dark:border-warm-800">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500">Grants in DB</p>
            <p className="text-2xl font-bold text-warm-900 dark:text-warm-50 mt-1">
              {grants.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-warm-200 dark:border-warm-800">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500">Avg Award</p>
            <p className="text-2xl font-bold text-warm-900 dark:text-warm-50 mt-1">
              {averageAward > 0 ? formatAmount(averageAward) : "Varies"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-warm-200 dark:border-warm-800">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500">Total Available</p>
            <p className="text-2xl font-bold text-warm-900 dark:text-warm-50 mt-1">
              {totalFunding > 0 ? formatAmount(totalFunding) : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-warm-200 dark:border-warm-800">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500">Your Avg Match</p>
            <p className="text-2xl font-bold text-warm-900 dark:text-warm-50 mt-1">
              {avgMatchScore !== null ? `${avgMatchScore}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Focus areas */}
      {focusAreas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-warm-400" />
            <h2 className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              Focus Areas
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {focusAreas.map((area) => (
              <span
                key={area}
                className="px-2.5 py-1 rounded-full bg-warm-100 dark:bg-warm-800 text-xs font-medium text-warm-700 dark:text-warm-300"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Geographic focus */}
      {allStates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-warm-400" />
            <h2 className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              Geographic Focus
            </h2>
          </div>
          <p className="text-sm text-warm-600 dark:text-warm-400">
            {allStates.join(", ")}
          </p>
        </div>
      )}

      {/* AI Strategy Brief */}
      <Card className="border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-brand-teal" />
            <h2 className="text-sm font-semibold text-warm-900 dark:text-warm-50">
              Funder Strategy Brief
            </h2>
            <span className="ml-auto text-xs text-warm-400 italic">AI-generated</span>
          </div>
          <p className="text-sm text-warm-700 dark:text-warm-300 leading-relaxed">
            {strategyBrief}
          </p>
        </CardContent>
      </Card>

      {/* Grants from this funder */}
      <div>
        <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-4">
          Grants from {funderName}
        </h2>
        <div className="space-y-3">
          {sortedGrants.map((grant) => {
            const score = matchScores[String(grant.id)];
            const hasScore = score !== undefined;
            const scoreColor =
              score >= 70
                ? "text-green-600 dark:text-green-400"
                : score >= 50
                ? "text-amber-600 dark:text-amber-400"
                : "text-warm-400";

            return (
              <div
                key={grant.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border border-warm-200 dark:border-warm-800 hover:border-brand-teal/50 transition-colors bg-background"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/grants/${grant.id}`}
                    className="text-sm font-medium text-warm-900 dark:text-warm-50 hover:text-brand-teal transition-colors line-clamp-1"
                  >
                    {grant.name as string}
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    {grant.category && (
                      <span className="text-xs text-warm-400">
                        {grant.category as string}
                      </span>
                    )}
                    {grant.amount_max && (
                      <span className="text-xs text-warm-500">
                        Up to {formatAmount(grant.amount_max as number)}
                      </span>
                    )}
                    {grant.deadline && (
                      <span className="text-xs text-warm-400">
                        Due{" "}
                        {new Date(grant.deadline as string).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {hasScore && (
                    <span className={`text-sm font-semibold ${scoreColor}`}>
                      {score}% match
                    </span>
                  )}
                  <Link
                    href={`/grants/${grant.id}/evaluate`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-brand-teal text-white text-xs font-medium hover:bg-brand-teal/90 transition-colors"
                  >
                    Evaluate
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
