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
    .select("id, match_score, last_computed, grant_sources(name, funder_name, source_type, deadline, amount_min, amount_max)")
    .eq("org_id", orgId)
    .order("match_score", { ascending: false })
    .limit(5000);

  const headers = ["ID", "Name", "Funder", "Type", "Match Score", "Deadline", "Amount Min", "Amount Max", "Last Computed"];
  const rows = (data ?? []).map((r) => {
    const gs = r.grant_sources as unknown as Record<string, unknown> | null;
    return [
      r.id,
      gs?.name as string ?? "",
      gs?.funder_name as string ?? "",
      gs?.source_type as string ?? "",
      r.match_score,
      gs?.deadline as string ?? "",
      gs?.amount_min as number ?? "",
      gs?.amount_max as number ?? "",
      r.last_computed,
    ];
  });

  return buildCsv(headers, rows);
}

async function exportPipeline(orgId: string, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin
    .from("grant_pipeline")
    .select("id, stage, notes, created_at, grant_sources(name, funder_name, source_type, deadline, amount_min, amount_max)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5000);

  const headers = ["ID", "Name", "Funder", "Type", "Stage", "Notes", "Deadline", "Amount Min", "Amount Max", "Created At"];
  const rows = (data ?? []).map((r) => {
    const gs = r.grant_sources as unknown as Record<string, unknown> | null;
    return [
      r.id,
      gs?.name as string ?? "",
      gs?.funder_name as string ?? "",
      gs?.source_type as string ?? "",
      r.stage,
      r.notes as string ?? "",
      gs?.deadline as string ?? "",
      gs?.amount_min as number ?? "",
      gs?.amount_max as number ?? "",
      r.created_at,
    ];
  });

  return buildCsv(headers, rows);
}

async function exportScorecards(orgId: string, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin
    .from("grant_scorecards")
    .select("id, total_score, priority, auto_disqualified, disqualify_reason, created_at, grant_sources(name, funder_name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5000);

  const headers = ["ID", "Grant Name", "Funder", "Total Score", "Priority", "Auto Disqualified", "Disqualify Reason", "Created At"];
  const rows = (data ?? []).map((r) => {
    const gs = r.grant_sources as unknown as Record<string, unknown> | null;
    return [
      r.id,
      gs?.name as string ?? "",
      gs?.funder_name as string ?? "",
      r.total_score,
      r.priority as string ?? "",
      r.auto_disqualified ? "Yes" : "No",
      r.disqualify_reason as string ?? "",
      r.created_at,
    ];
  });

  return buildCsv(headers, rows);
}

async function exportAnalytics(orgId: string, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin
    .from("grant_outcomes")
    .select("id, outcome, amount_awarded, rejection_reason, funder_feedback, logged_at, pipeline_id")
    .eq("org_id", orgId)
    .order("logged_at", { ascending: false })
    .limit(5000);

  const headers = ["ID", "Pipeline ID", "Outcome", "Amount Awarded", "Rejection Reason", "Funder Feedback", "Logged At"];
  const rows = (data ?? []).map((r) => [
    r.id,
    r.pipeline_id,
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
    const canExport = tier === "growth" || tier === "enterprise";

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
