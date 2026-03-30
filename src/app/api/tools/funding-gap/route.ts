import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { entityType, annualBudget, state, missionArea } = await req.json();
  const supabase = createAdminClient();

  let query = supabase
    .from("grant_sources")
    .select("amount_max, source_type, category", { count: "exact" })
    .eq("is_active", true);

  if (entityType?.includes("nonprofit")) {
    query = query.contains("eligibility_types", ["nonprofit"]);
  }
  if (state) {
    query = query.or(`states.cs.{${state}},states.eq.{}`);
  }

  const { data: grants, count } = await query.limit(500);

  const totalPotential = (grants ?? []).reduce(
    (sum, g) => sum + (g.amount_max ?? 50000),
    0
  );

  const topCategories = Object.entries(
    (grants ?? []).reduce((acc: Record<string, number>, g) => {
      const cat = g.category || "General";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, grantCount]) => ({ category, count: grantCount }));

  return NextResponse.json({
    totalMatches: count ?? 0,
    estimatedMissedFunding: Math.min(totalPotential, (annualBudget ?? 100000) * 2),
    topCategories,
  });
}
