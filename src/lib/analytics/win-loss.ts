import type { SupabaseClient } from "@supabase/supabase-js";

export interface WinLossAnalysis {
  totalSubmitted: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  totalAwarded: number;
  avgAwardAmount: number;
  topRejectionReasons: { reason: string; count: number }[];
  winRateByType: { type: string; won: number; total: number; rate: number }[];
  winRateByScoreBucket: { bucket: string; won: number; total: number; rate: number }[];
  improvementSuggestions: string[];
  monthlyWinRates: { month: string; winRate: number; submitted: number }[];
}

export interface OutcomeRecord {
  id: string;
  grant_pipeline_id: string;
  org_id: string;
  outcome: "awarded" | "declined";
  amount_awarded?: number | null;
  start_date?: string | null;
  grant_period?: string | null;
  rejection_reason?: string | null;
  funder_feedback?: string | null;
  logged_at: string;
}

const REJECTION_REASON_LABELS: Record<string, string> = {
  too_competitive: "Too Competitive",
  weak_narrative: "Weak Narrative",
  missing_requirements: "Missing Requirements",
  budget_issues: "Budget Issues",
  wrong_fit: "Wrong Fit",
  unknown: "Unknown",
};

const SCORE_BUCKETS = [
  { label: "0–39%", min: 0, max: 39 },
  { label: "40–59%", min: 40, max: 59 },
  { label: "60–74%", min: 60, max: 74 },
  { label: "75–89%", min: 75, max: 89 },
  { label: "90–100%", min: 90, max: 100 },
];

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function generateImprovementSuggestions(
  analysis: Omit<WinLossAnalysis, "improvementSuggestions">
): string[] {
  const suggestions: string[] = [];

  // Win rate benchmark
  const BENCHMARK_WIN_RATE = 22;
  if (analysis.winRate < BENCHMARK_WIN_RATE) {
    suggestions.push(
      `Your win rate is ${analysis.winRate}%. Organizations like yours average ${BENCHMARK_WIN_RATE}%. Focus on grants with 75%+ match scores.`
    );
  } else {
    suggestions.push(
      `Your win rate of ${analysis.winRate}% exceeds the ${BENCHMARK_WIN_RATE}% benchmark. Keep targeting high-fit grants.`
    );
  }

  // Rejection reason–specific suggestions
  const topReason = analysis.topRejectionReasons[0];
  if (topReason) {
    switch (topReason.reason) {
      case "Weak Narrative":
        suggestions.push(
          "Weak Narrative is your most common rejection reason. Use the AI Writer to strengthen your impact story and evaluation plans."
        );
        break;
      case "Missing Requirements":
        suggestions.push(
          "Missing Requirements is a recurring issue. Review eligibility criteria thoroughly before adding grants to your pipeline."
        );
        break;
      case "Budget Issues":
        suggestions.push(
          "Budget misalignment is causing rejections. Ensure your requested amount matches the funder's typical award range."
        );
        break;
      case "Too Competitive":
        suggestions.push(
          "You are entering highly competitive pools. Consider targeting newer grant programs or funders with lower applicant volumes."
        );
        break;
      case "Wrong Fit":
        suggestions.push(
          "Wrong Fit rejections suggest mismatched targeting. Let AI Match do a deeper alignment check before you apply."
        );
        break;
    }
  }

  // Score bucket suggestions
  const lowBucket = analysis.winRateByScoreBucket.find(
    (b) => b.bucket === "40–59%" && b.total > 0 && b.won > 0
  );
  if (lowBucket) {
    suggestions.push(
      "You have won grants in the 40–59% score range. Consider raising your minimum score threshold to 60%+ to improve ROI."
    );
  }

  const highBucket = analysis.winRateByScoreBucket.find(
    (b) => b.bucket === "90–100%" && b.total > 0
  );
  if (highBucket && highBucket.rate < 50) {
    suggestions.push(
      "Even your highest-scored grants have under 50% win rate. Invest more time in narrative quality for top-fit opportunities."
    );
  }

  return suggestions.slice(0, 4);
}

export async function analyzeWinLoss(
  orgId: string,
  supabase: SupabaseClient
): Promise<WinLossAnalysis> {
  // Fetch all grant outcomes with pipeline metadata
  const { data: outcomes } = await supabase
    .from("grant_outcomes")
    .select(
      "id, outcome, amount_awarded, rejection_reason, logged_at, grant_pipeline_id"
    )
    .eq("org_id", orgId)
    .order("logged_at", { ascending: true });

  const { data: pipelineRows } = await supabase
    .from("grant_pipeline")
    .select("id, match_score, grant_sources(grant_type)")
    .eq("org_id", orgId);

  const outcomeList = (outcomes ?? []) as {
    id: string;
    outcome: "awarded" | "declined";
    amount_awarded?: number | null;
    rejection_reason?: string | null;
    logged_at: string;
    grant_pipeline_id: string;
  }[];

  const pipelineMap = new Map(
    (pipelineRows ?? []).map((row) => {
      const gs = row.grant_sources as unknown as { grant_type?: string } | null;
      return [
        row.id as string,
        {
          match_score: (row.match_score as number) ?? 0,
          grant_type: gs?.grant_type ?? "Other",
        },
      ];
    })
  );

  const awarded = outcomeList.filter((o) => o.outcome === "awarded");
  const declined = outcomeList.filter((o) => o.outcome === "declined");

  const totalSubmitted = outcomeList.length;
  const totalWon = awarded.length;
  const totalLost = declined.length;
  const winRate =
    totalSubmitted > 0 ? Math.round((totalWon / totalSubmitted) * 100) : 0;

  const totalAwarded = awarded.reduce(
    (sum, o) => sum + (o.amount_awarded ?? 0),
    0
  );
  const avgAwardAmount = totalWon > 0 ? Math.round(totalAwarded / totalWon) : 0;

  // Top rejection reasons
  const reasonCounts: Record<string, number> = {};
  for (const o of declined) {
    const raw = o.rejection_reason ?? "unknown";
    const label = REJECTION_REASON_LABELS[raw] ?? raw;
    reasonCounts[label] = (reasonCounts[label] ?? 0) + 1;
  }
  const topRejectionReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Win rate by grant type
  const typeMap: Record<string, { won: number; total: number }> = {};
  for (const o of outcomeList) {
    const info = pipelineMap.get(o.grant_pipeline_id);
    const type = info?.grant_type ?? "Other";
    if (!typeMap[type]) typeMap[type] = { won: 0, total: 0 };
    typeMap[type].total += 1;
    if (o.outcome === "awarded") typeMap[type].won += 1;
  }
  const winRateByType = Object.entries(typeMap)
    .map(([type, { won, total }]) => ({
      type,
      won,
      total,
      rate: total > 0 ? Math.round((won / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Win rate by score bucket
  const winRateByScoreBucket = SCORE_BUCKETS.map((bucket) => {
    const inBucket = outcomeList.filter((o) => {
      const info = pipelineMap.get(o.grant_pipeline_id);
      const score = info?.match_score ?? 0;
      return score >= bucket.min && score <= bucket.max;
    });
    const wonInBucket = inBucket.filter((o) => o.outcome === "awarded").length;
    return {
      bucket: bucket.label,
      won: wonInBucket,
      total: inBucket.length,
      rate:
        inBucket.length > 0
          ? Math.round((wonInBucket / inBucket.length) * 100)
          : 0,
    };
  });

  // Monthly win rates
  const monthMap: Record<
    string,
    { won: number; submitted: number }
  > = {};
  for (const o of outcomeList) {
    const month = formatMonth(o.logged_at);
    if (!monthMap[month]) monthMap[month] = { won: 0, submitted: 0 };
    monthMap[month].submitted += 1;
    if (o.outcome === "awarded") monthMap[month].won += 1;
  }
  const monthlyWinRates = Object.entries(monthMap).map(
    ([month, { won, submitted }]) => ({
      month,
      winRate: submitted > 0 ? Math.round((won / submitted) * 100) : 0,
      submitted,
    })
  );

  const partialAnalysis = {
    totalSubmitted,
    totalWon,
    totalLost,
    winRate,
    totalAwarded,
    avgAwardAmount,
    topRejectionReasons,
    winRateByType,
    winRateByScoreBucket,
    monthlyWinRates,
  };

  const improvementSuggestions = generateImprovementSuggestions(partialAnalysis);

  return { ...partialAnalysis, improvementSuggestions };
}
