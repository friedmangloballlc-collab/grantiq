// /admin/success-fees
//
// Admin dashboard for success fee invoices. Shows pending /
// invoiced / paid awards with the operational fields you need
// to collect: funder, awarded amount, fee owed, due date, Stripe
// invoice id if issued.
//
// This page is the operational counterpart to /terms §5. Until we
// wire customer self-report on the pipeline page, admins create
// rows here manually when a customer reports an award (or when we
// spot one in a public announcement or grant database).

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

type InvoiceStatus = "pending" | "invoiced" | "paid" | "waived";

interface FeeInvoiceRow {
  id: string;
  org_id: string;
  grant_name: string;
  funder_name: string | null;
  amount_awarded: number;
  fee_percentage: number;
  fee_amount: number;
  fee_tier: string;
  status: InvoiceStatus;
  awarded_at: string | null;
  funds_received_at: string | null;
  due_at: string | null;
  stripe_invoice_id: string | null;
  paid_at: string | null;
  created_at: string;
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status, dueAt }: { status: InvoiceStatus; dueAt: string | null }) {
  const isOverdue =
    status !== "paid" &&
    status !== "waived" &&
    dueAt !== null &&
    new Date(dueAt).getTime() < Date.now();

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        overdue
      </span>
    );
  }

  const style =
    status === "paid"
      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
      : status === "invoiced"
      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
      : status === "waived"
      ? "bg-warm-100 dark:bg-warm-800 text-warm-600 dark:text-warm-400"
      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
  const Icon = status === "paid" ? CheckCircle2 : Clock;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {status}
    </span>
  );
}

export default async function SuccessFeesAdminPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: invoices } = await admin
    .from("success_fee_invoices")
    .select(
      "id, org_id, grant_name, funder_name, amount_awarded, fee_percentage, fee_amount, fee_tier, status, awarded_at, funds_received_at, due_at, stripe_invoice_id, paid_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (invoices ?? []) as FeeInvoiceRow[];

  // Summary tiles
  const totalOwed = rows
    .filter((r) => r.status === "pending" || r.status === "invoiced")
    .reduce((acc, r) => acc + Number(r.fee_amount), 0);
  const totalCollected = rows
    .filter((r) => r.status === "paid")
    .reduce((acc, r) => acc + Number(r.fee_amount), 0);
  const overdueCount = rows.filter(
    (r) =>
      r.status !== "paid" &&
      r.status !== "waived" &&
      r.due_at &&
      new Date(r.due_at).getTime() < Date.now()
  ).length;

  return (
    <div className="space-y-8 max-w-6xl px-4 md:px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Success Fees
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Awarded grants and the success fees owed per /terms §5. Rate locked
          at tier held when the grant draft was created.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" aria-hidden="true" />
              <span className="text-2xl font-bold tabular-nums">
                {fmtMoney(totalOwed)}
              </span>
            </div>
            <p className="mt-1 text-xs text-warm-500">pending + invoiced</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Collected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
              <span className="text-2xl font-bold tabular-nums">
                {fmtMoney(totalCollected)}
              </span>
            </div>
            <p className="mt-1 text-xs text-warm-500">paid to date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <AlertTriangle
                className={overdueCount > 0 ? "h-5 w-5 text-red-500" : "h-5 w-5 text-warm-400"}
                aria-hidden="true"
              />
              <span className="text-2xl font-bold tabular-nums">
                {overdueCount}
              </span>
            </div>
            <p className="mt-1 text-xs text-warm-500">past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All awards</CardTitle>
          <CardDescription>
            Most recent 200. Log new awards via{" "}
            <code className="text-xs bg-warm-100 dark:bg-warm-800 px-1 rounded">
              POST /api/admin/success-fees
            </code>
            . Update status via{" "}
            <code className="text-xs bg-warm-100 dark:bg-warm-800 px-1 rounded">
              PATCH /api/admin/success-fees/[id]
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-warm-500 py-8 text-center">
              No awards logged yet. When a customer reports or you discover an
              award, POST to the endpoint above to record it.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-200 dark:border-warm-800 text-xs text-warm-500 uppercase tracking-wider">
                    <th className="text-left font-medium py-2 pr-3">Grant</th>
                    <th className="text-left font-medium py-2 pr-3">Funder</th>
                    <th className="text-right font-medium py-2 pr-3">Awarded</th>
                    <th className="text-right font-medium py-2 pr-3">Rate</th>
                    <th className="text-right font-medium py-2 pr-3">Fee</th>
                    <th className="text-left font-medium py-2 pr-3">Due</th>
                    <th className="text-left font-medium py-2 pr-3">Status</th>
                    <th className="text-left font-medium py-2">Stripe</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-warm-100 dark:border-warm-800/50"
                    >
                      <td className="py-2.5 pr-3 text-warm-800 dark:text-warm-200">
                        <div className="font-medium">{r.grant_name}</div>
                        <div className="text-xs text-warm-500">
                          {fmtDate(r.awarded_at)}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-warm-600 dark:text-warm-400">
                        {r.funder_name ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {fmtMoney(r.amount_awarded)}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-warm-600 dark:text-warm-400">
                        {r.fee_percentage}%
                        <div className="text-xs text-warm-500">{r.fee_tier}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums font-semibold">
                        {fmtMoney(r.fee_amount)}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-warm-600 dark:text-warm-400">
                        {fmtDate(r.due_at)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge status={r.status} dueAt={r.due_at} />
                      </td>
                      <td className="py-2.5 text-xs text-warm-500">
                        {r.stripe_invoice_id ? (
                          <a
                            href={`https://dashboard.stripe.com/invoices/${r.stripe_invoice_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-brand-teal-text hover:underline"
                          >
                            {r.stripe_invoice_id.slice(0, 14)}…
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
