import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** GET — fetch grant portfolio for user's org */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: membership } = await db
    .from("org_members").select("org_id").eq("user_id", user.id).eq("status", "active").limit(1).single();
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

  const [grantsRes, reportsRes] = await Promise.all([
    db.from("grant_portfolio").select("*").eq("org_id", membership.org_id).order("award_date", { ascending: false }),
    db.from("portfolio_reports").select("*").order("due_date", { ascending: true }),
  ]);

  // Attach reports to their grants
  const grants = (grantsRes.data ?? []).map((g) => ({
    ...g,
    reports: (reportsRes.data ?? []).filter((r) => r.portfolio_id === g.id),
  }));

  // Compute totals
  const activeGrants = grants.filter((g) => g.status === "active");
  const totalAwarded = activeGrants.reduce((sum, g) => sum + (g.award_amount ?? 0), 0);
  const totalSpent = activeGrants.reduce((sum, g) => sum + (g.total_spent ?? 0), 0);
  const upcomingReports = (reportsRes.data ?? []).filter((r) => r.status === "upcoming" || r.status === "due_soon");

  return NextResponse.json({
    grants,
    stats: {
      total_grants: grants.length,
      active_grants: activeGrants.length,
      total_awarded: totalAwarded,
      total_spent: totalSpent,
      remaining_budget: totalAwarded - totalSpent,
      upcoming_reports: upcomingReports.length,
    },
  });
}

/** POST — add a grant to portfolio */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: membership } = await db
    .from("org_members").select("org_id").eq("user_id", user.id).eq("status", "active").limit(1).single();
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

  const body = await req.json();

  const { data: grant, error } = await db
    .from("grant_portfolio")
    .insert({
      org_id: membership.org_id,
      grant_name: body.grant_name,
      funder_name: body.funder_name,
      award_amount: body.award_amount ?? null,
      award_date: body.award_date ?? null,
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      grant_type: body.grant_type ?? null,
      cfda_number: body.cfda_number ?? null,
      grant_number: body.grant_number ?? null,
      remaining_budget: body.award_amount ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-generate reporting deadlines if end_date provided
  if (body.end_date && grant) {
    const reports = generateReportingDeadlines(grant.id, body.start_date, body.end_date, body.grant_type);
    if (reports.length > 0) {
      await db.from("portfolio_reports").insert(reports);
    }
  }

  return NextResponse.json({ grant }, { status: 201 });
}

function generateReportingDeadlines(
  portfolioId: string,
  startDate: string | null,
  endDate: string,
  grantType: string | null
): Array<Record<string, unknown>> {
  const reports: Array<Record<string, unknown>> = [];
  const end = new Date(endDate);
  const start = startDate ? new Date(startDate) : new Date();

  // Quarterly reports
  const current = new Date(start);
  current.setMonth(current.getMonth() + 3);
  let qNum = 1;
  while (current < end) {
    reports.push({
      portfolio_id: portfolioId,
      report_type: "quarterly",
      title: `Q${qNum} Progress Report`,
      due_date: new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days after quarter
      status: "upcoming",
    });
    current.setMonth(current.getMonth() + 3);
    qNum++;
  }

  // Final report — due 90 days after end date
  reports.push({
    portfolio_id: portfolioId,
    report_type: "final",
    title: "Final Performance Report",
    due_date: new Date(end.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "upcoming",
  });

  // Financial report — due 90 days after end
  reports.push({
    portfolio_id: portfolioId,
    report_type: "financial",
    title: "Final Financial Report",
    due_date: new Date(end.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "upcoming",
  });

  return reports;
}
