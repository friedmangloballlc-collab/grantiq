import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = checkRateLimit(`funding-gap:${ip}`, 10, 60000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { entityType, annualBudget, state, missionArea } = body as {
    entityType?: string;
    annualBudget?: number;
    state?: string;
    missionArea?: string;
  };

  const VALID_STATES = new Set(["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]);
  if (state && !VALID_STATES.has(state.toUpperCase())) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  try {
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
  } catch (err) {
    logger.error("POST /api/tools/funding-gap error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
