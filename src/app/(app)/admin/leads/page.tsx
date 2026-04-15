import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "getreachmediallc@gmail.com";

const VERDICT_LABELS: Record<string, string> = {
  eligible_now: "Eligible",
  conditionally_eligible: "Conditional",
  eligible_after_remediation: "After Remediation",
  not_eligible: "Not Eligible",
};

const VERDICT_COLORS: Record<string, string> = {
  eligible_now: "bg-emerald-100 text-emerald-700",
  conditionally_eligible: "bg-amber-100 text-amber-700",
  eligible_after_remediation: "bg-blue-100 text-blue-700",
  not_eligible: "bg-red-100 text-red-700",
};

function scoreCategory(score: number | null): { label: string; color: string } {
  if (!score) return { label: "—", color: "text-gray-400" };
  if (score >= 60) return { label: "Hot", color: "text-emerald-600 font-bold" };
  if (score >= 40) return { label: "Warm", color: "text-amber-600 font-medium" };
  return { label: "Cold", color: "text-gray-500" };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminLeadsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const db = createAdminClient();

  const { data: leads, count: totalCount } = await db
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  const allLeads = (leads ?? []) as Array<{
    id: string;
    email: string;
    full_name: string | null;
    company_name: string | null;
    entity_type: string | null;
    state: string | null;
    industry: string | null;
    annual_revenue: string | null;
    report_verdict: string | null;
    report_score: number | null;
    converted: boolean;
    source: string | null;
    created_at: string;
  }>;

  const hotCount = allLeads.filter((l) => (l.report_score ?? 0) >= 60).length;
  const warmCount = allLeads.filter((l) => (l.report_score ?? 0) >= 40 && (l.report_score ?? 0) < 60).length;
  const convertedCount = allLeads.filter((l) => l.converted).length;

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Leads</h1>
          <p className="text-sm text-warm-500 mt-1">
            From public eligibility checks. {totalCount ?? 0} total leads.
          </p>
        </div>
        <a href="/admin" className="text-sm text-brand-teal hover:underline">← Admin</a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-background p-4 text-center">
          <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{totalCount ?? 0}</p>
          <p className="text-xs text-warm-500">Total Leads</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{hotCount}</p>
          <p className="text-xs text-warm-500">Hot (60+)</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{warmCount}</p>
          <p className="text-xs text-warm-500">Warm (40-59)</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 text-center">
          <p className="text-2xl font-bold text-brand-teal">{convertedCount}</p>
          <p className="text-xs text-warm-500">Converted</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-warm-500 border-b border-border">
              <th className="py-3 px-4">Lead</th>
              <th className="py-3 px-3">Company</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">State</th>
              <th className="py-3 px-3">Revenue</th>
              <th className="py-3 px-3">Verdict</th>
              <th className="py-3 px-3">Score</th>
              <th className="py-3 px-3">Temp</th>
              <th className="py-3 px-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {allLeads.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-warm-400">
                  No leads yet. Share your <a href="/check" className="text-brand-teal underline">/check</a> page to start capturing leads.
                </td>
              </tr>
            )}
            {allLeads.map((lead) => {
              const temp = scoreCategory(lead.report_score);
              return (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-warm-50 dark:hover:bg-warm-800/30">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-warm-900 dark:text-warm-50">{lead.full_name ?? "—"}</p>
                      <p className="text-xs text-warm-500">{lead.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-warm-700 dark:text-warm-300">{lead.company_name ?? "—"}</td>
                  <td className="py-3 px-3 text-xs text-warm-500">{lead.entity_type ?? "—"}</td>
                  <td className="py-3 px-3 text-xs">{lead.state ?? "—"}</td>
                  <td className="py-3 px-3 text-xs">{lead.annual_revenue?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="py-3 px-3">
                    {lead.report_verdict ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${VERDICT_COLORS[lead.report_verdict] ?? "bg-gray-100 text-gray-600"}`}>
                        {VERDICT_LABELS[lead.report_verdict] ?? lead.report_verdict}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-3 px-3 font-medium">{lead.report_score ?? "—"}</td>
                  <td className="py-3 px-3">
                    <span className={temp.color}>{temp.label}</span>
                  </td>
                  <td className="py-3 px-3 text-xs text-warm-500 whitespace-nowrap">
                    {formatDate(lead.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
