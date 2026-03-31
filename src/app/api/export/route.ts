import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

type ExportType = "matches" | "pipeline" | "scorecards" | "analytics";

function csvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      // Escape double-quotes and wrap in quotes if needed
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(",");
}

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return lines.join("\n");
}

async function exportMatches(orgId: string, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin
    .from("grant_matches")
    .select("id, match_score, status, matched_at, grant_sources(title, funder_name, grant_type, deadline, award_min, award_max)")
    .eq("org_id", orgId)
    .order("match_score", { ascending: false })
    .limit(5000);

  const headers = ["ID", "Title", "Funder", "Type", "Match Score", "Status", "Deadline", "Award Min", "Award Max", "Matched At"];
  const rows = (data ?? []).map((r) => {
    const gs = r.grant_sources as unknown as Record<string, unknown> | null;
    return [
      r.id,
      gs?.title as string ?? "",
      gs?.funder_name as string ?? "",
      gs?.grant_type as string ?? "",
      r.match_score,
      r.status,
      gs?.deadline as string ?? "",
      gs?.award_min as number ?? "",
      gs?.award_max as number ?? "",
      r.matched_at,
    ];
  });

  return buildCsv(headers, rows);
}

async function exportPipeline(orgId: string, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin
    .from("grant_pipeline")
    .select("id, stage, match_score, notes, added_at, grant_sources(title, funder_name, grant_type, deadline, award_min, award_max)")
    .eq("org_id", orgId)
    .order("added_at", { ascending: false })
    .limit(5000);

  const headers = ["ID", "Title", "Funder", "Type", "Stage", "Match Score", "Notes", "Deadline", "Award Min", "Award Max", "Added At"];
  const rows = (data ?? []).map((r) => {
    const gs = r.grant_sources as unknown as Record<string, unknown> | null;
    return [
      r.id,
      gs?.title as string ?? "",
      gs?.funder_name as string ?? "",
      gs?.grant_type as string ?? "",
      r.stage,
      r.match_score,
      r.notes as string ?? "",
      gs?.deadline as string ?? "",
      gs?.award_min as number ?? "",
      gs?.award_max as number ?? "",
      r.added_at,
    ];
  });

  return buildCsv(headers, rows);
}

async function exportScorecards(orgId: string, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin
    .from("grant_scorecards")
    .select("id, score, strengths, weaknesses, recommendation, created_at, grant_sources(title, funder_name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5000);

  const headers = ["ID", "Grant Title", "Funder", "Score", "Strengths", "Weaknesses", "Recommendation", "Created At"];
  const rows = (data ?? []).map((r) => {
    const gs = r.grant_sources as unknown as Record<string, unknown> | null;
    return [
      r.id,
      gs?.title as string ?? "",
      gs?.funder_name as string ?? "",
      r.score,
      Array.isArray(r.strengths) ? (r.strengths as string[]).join("; ") : (r.strengths as string ?? ""),
      Array.isArray(r.weaknesses) ? (r.weaknesses as string[]).join("; ") : (r.weaknesses as string ?? ""),
      r.recommendation as string ?? "",
      r.created_at,
    ];
  });

  return buildCsv(headers, rows);
}

async function exportAnalytics(orgId: string, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin
    .from("grant_outcomes")
    .select("id, outcome, amount_awarded, rejection_reason, funder_feedback, logged_at, grant_pipeline_id")
    .eq("org_id", orgId)
    .order("logged_at", { ascending: false })
    .limit(5000);

  const headers = ["ID", "Pipeline ID", "Outcome", "Amount Awarded", "Rejection Reason", "Funder Feedback", "Logged At"];
  const rows = (data ?? []).map((r) => [
    r.id,
    r.grant_pipeline_id,
    r.outcome,
    r.amount_awarded ?? "",
    r.rejection_reason ?? "",
    r.funder_feedback ?? "",
    r.logged_at,
  ]);

  return buildCsv(headers, rows);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: membership } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    // Gate: export requires Applicant+
    const { data: sub } = await admin
      .from("subscriptions")
      .select("tier")
      .eq("org_id", membership.org_id)
      .single();

    const tier = sub?.tier ?? "free";
    const canExport = tier === "applicant" || tier === "growth" || tier === "enterprise";

    if (!canExport) {
      return NextResponse.json(
        { error: "Data export requires Applicant plan or higher" },
        { status: 403 }
      );
    }

    const type = (req.nextUrl.searchParams.get("type") ?? "") as ExportType;
    const validTypes: ExportType[] = ["matches", "pipeline", "scorecards", "analytics"];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid export type. Valid: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    let csv = "";
    const orgId = membership.org_id;

    switch (type) {
      case "matches":
        csv = await exportMatches(orgId, admin);
        break;
      case "pipeline":
        csv = await exportPipeline(orgId, admin);
        break;
      case "scorecards":
        csv = await exportScorecards(orgId, admin);
        break;
      case "analytics":
        csv = await exportAnalytics(orgId, admin);
        break;
    }

    const filename = `grantaq-${type}-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("GET /api/export error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
